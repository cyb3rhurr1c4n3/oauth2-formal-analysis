# BÁO CÁO TỔNG HỢP - OAUTH 2.0 AUTHORIZATION CODE GRANT

**Người thực hiện:** [Tên của bạn - Bin/Khánh]  
**Ngày:** [Ngày thực hiện]  
**Task:** GIAO Đợt 2 - OAuth 2.0 Implementation & Exploitation

---

## 📋 MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Triển khai hệ thống](#2-triển-khai-hệ-thống)
3. [Các lỗ hổng đã demo](#3-các-lỗ-hổng-đã-demo)
4. [Kết quả khai thác](#4-kết-quả-khai-thác)
5. [Biện pháp phòng chống](#5-biện-pháp-phòng-chống)
6. [Kết luận](#6-kết-luận)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Mục tiêu

Triển khai và demo các lỗ hổng bảo mật phổ biến trong OAuth 2.0 Authorization Code Grant flow, bao gồm:
- Xây dựng 2 phiên bản: có lỗ hổng và an toàn
- Khai thác các lỗ hổng bảo mật
- Demo biện pháp phòng chống

### 1.2 Phạm vi

**Luồng được implement:** Authorization Code Grant

**Components:**
- Authorization Server (Port 3001 - Vulnerable, 3003 - Secure)
- Client Application (Port 3002 - Vulnerable, 3004 - Secure)

**Các lỗ hổng được demo:**
1. CSRF Attack (No State Parameter)
2. Authorization Code Interception  
3. Code Replay Attack
4. Open Redirect Attack
5. Weak Client Authentication
6. Token Storage Vulnerabilities

---

## 2. TRIỂN KHAI HỆ THỐNG

### 2.1 Kiến trúc

```
User Browser <---> Client Application <---> Authorization Server
                         |                           |
                         v                           v
                   Access Resources            Authenticate User
```

### 2.2 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Authentication:** JWT
- **Dependencies:** axios, uuid, jsonwebtoken

### 2.3 Files Structure

```
oauth-demo/
├── vulnerable-auth-server.js     # Server có lỗ hổng
├── vulnerable-client.js           # Client có lỗ hổng
├── secure-auth-server.js          # Server an toàn
├── secure-client.js               # Client an toàn
├── attack-demonstrations.js       # Demo scripts
├── phishing-demo.html            # Phishing page demo
├── README.md                      # Documentation
├── QUICKSTART.md                 # Quick guide
└── reports/
    └── CSRF-Attack-Report.md     # Chi tiết báo cáo
```

### 2.4 Installation & Setup

```bash
# Install dependencies
npm install

# Run Vulnerable Version
Terminal 1: npm run vulnerable:auth
Terminal 2: npm run vulnerable:client

# Run Secure Version  
Terminal 3: npm run secure:auth
Terminal 4: npm run secure:client

# Demo Attacks
Terminal 5: npm run attack:demo
```

---

## 3. CÁC LỖ HỔNG ĐÃ DEMO

### 3.1 CSRF Attack (CWE-352)

**Mô tả:** Client không sử dụng state parameter → dễ bị CSRF

**Khai thác:**
```
1. Tạo malicious URL:
   http://localhost:3001/login?client_id=...&redirect_uri=...
   
2. Gửi cho victim (phishing email/social media)

3. Victim click → authorize → account linked với attacker
```

**Impact:** HIGH - Account takeover, data breach

**Screenshots:**
- [ ] Phishing page
- [ ] Missing state parameter
- [ ] Successful attack
- [ ] Access to victim's data

---

### 3.2 Code Replay Attack

**Mô tả:** Authorization code có thể sử dụng nhiều lần

**Khai thác:**
```bash
# Lần 1: Legitimate use
POST /token
{
  "code": "abc123...",
  ...
}
Response: ✅ Access token issued

# Lần 2: Replay attack
POST /token with SAME code
Response (Vulnerable): ✅ Another token issued!
Response (Secure): ❌ "Code already used"
```

**Impact:** MEDIUM - Unauthorized token generation

**Screenshots:**
- [ ] First token exchange
- [ ] Second exchange (vulnerable)
- [ ] Error on secure version

---

### 3.3 Open Redirect Attack

**Mô tả:** Server không validate redirect_uri

**Khai thác:**
```
Malicious URL:
http://localhost:3001/login?
  client_id=...&
  redirect_uri=https://attacker.com/steal&
  ...

Vulnerable: ✅ Accepts & redirects to attacker.com
Secure: ❌ "Invalid redirect_uri"
```

**Impact:** HIGH - Code theft, phishing

**Screenshots:**
- [ ] Malicious redirect_uri
- [ ] Acceptance on vulnerable
- [ ] Rejection on secure

---

### 3.4 Code Interception

**Mô tả:** Code có thể bị intercept trong redirect

**Khai thác:**
```
Scenario:
1. Victim initiates OAuth
2. Attacker intercepts redirect URL
3. Extracts authorization code
4. Uses code to get access token
```

**Impact:** HIGH - Account compromise

**Mitigation:** PKCE, HTTPS, short-lived codes

---

### 3.5 Token Storage Issues

**Vulnerable:**
```javascript
// ❌ Plain text storage
sessions[id] = { 
  access_token: token  // Exposed!
};

// ❌ Logged to console
console.log('Token:', token);
```

**Secure:**
```javascript
// ✅ Encrypted storage
const encrypted = encrypt(token);
sessions[id] = { 
  encrypted_token: encrypted 
};

// ✅ No sensitive logs
console.log('Token issued (not logged)');
```

**Impact:** MEDIUM - Token theft from logs/memory

---

## 4. KẾT QUẢ KHAI THÁC

### 4.1 Bảng So Sánh

| Lỗ hổng | Vulnerable | Secure | Success Rate |
|---------|-----------|---------|--------------|
| CSRF Attack | ✅ Thành công | ❌ Blocked | 100% → 0% |
| Code Replay | ✅ Thành công | ❌ Blocked | 100% → 0% |
| Open Redirect | ✅ Thành công | ❌ Blocked | 100% → 0% |
| Code Interception | ⚠️ Possible | ⚠️ Harder | High → Low |
| Token Storage | ❌ Exposed | ✅ Encrypted | N/A |

### 4.2 Evidence

**Vulnerable Version:**
- Authorization URL không có state parameter ✓
- Code có thể reuse nhiều lần ✓
- Token hiển thị dạng plain text ✓
- Accept arbitrary redirect_uri ✓

**Secure Version:**
- State parameter bắt buộc ✓
- Code one-time use ✓
- Token encrypted ✓
- Strict redirect_uri validation ✓

### 4.3 Screenshots Summary

**Đã chụp:** [Điền số lượng]
- Vulnerable flow: ___ screenshots
- Attack demos: ___ screenshots  
- Secure flow: ___ screenshots
- Error messages: ___ screenshots

**Lưu trữ tại:** `/screenshots/` folder

---

## 5. BIỆN PHÁP PHÒNG CHỐNG

### 5.1 Critical Fixes

#### Fix 1: Implement State Parameter

```javascript
// ✅ TRƯỚC KHI AUTHORIZE
const state = crypto.randomBytes(32).toString('hex');
pendingStates.set(state, {
  expires: Date.now() + 300000  // 5 min
});

// ✅ KHI CALLBACK
if (!pendingStates.has(state)) {
  throw new Error('CSRF attack detected');
}
```

#### Fix 2: One-Time Code Use

```javascript
// ✅ CHECK IF USED
if (authCode.used) {
  // Revoke all tokens!
  throw new Error('Security breach - code reuse');
}

// ✅ MARK AS USED
authCode.used = true;
```

#### Fix 3: Strict Redirect URI Validation

```javascript
// ✅ WHITELIST
const allowedUris = [
  'http://localhost:3004/callback'
];

if (!allowedUris.includes(redirect_uri)) {
  throw new Error('Invalid redirect_uri');
}
```

#### Fix 4: Token Encryption

```javascript
// ✅ ENCRYPT BEFORE STORAGE
const encrypted = encrypt(accessToken);
sessions.set(id, { encrypted_token: encrypted });

// ✅ DECRYPT ONLY WHEN NEEDED
const token = decrypt(session.encrypted_token);
```

### 5.2 Additional Security

1. **Code Expiration:** 10 minutes TTL
2. **Token Expiration:** 1 hour  
3. **HTTPS Only:** Force secure transport
4. **Rate Limiting:** Prevent brute force
5. **Audit Logging:** Track security events
6. **PKCE:** For public clients

### 5.3 Implementation Comparison

| Security Control | Vulnerable | Secure |
|-----------------|-----------|---------|
| State Parameter | ❌ | ✅ Required |
| Redirect URI Validation | ❌ | ✅ Whitelist |
| Code One-Time Use | ❌ | ✅ Enforced |
| Code Expiration | ❌ | ✅ 10 min |
| Token Expiration | ❌ | ✅ 1 hour |
| Token Encryption | ❌ | ✅ AES-256 |
| Audit Logging | Basic | ✅ Comprehensive |

---

## 6. KẾT LUẬN

### 6.1 Lessons Learned

1. **State parameter is mandatory** - Không phải optional feature
2. **OAuth 2.0 security requires strict adherence to spec** - Không được skip steps
3. **Defense in depth matters** - Multiple layers of protection
4. **Token security is critical** - Encrypt at rest, protect in transit

### 6.2 Key Takeaways

**For Developers:**
- Always implement state parameter
- Validate all OAuth parameters strictly
- Use one-time codes with expiration
- Encrypt sensitive data
- Follow OAuth 2.0 Security Best Current Practice

**For Security:**
- Regular penetration testing
- Code reviews focusing on OAuth flows
- Security awareness training
- Incident response planning

### 6.3 Project Statistics

**Development Time:** [X hours]
**Lines of Code:** ~2000+
**Test Cases:** 10+ attack scenarios
**Documentation:** 500+ lines

**Components Delivered:**
- ✅ 2 Authorization Servers (vulnerable + secure)
- ✅ 2 Client Applications (vulnerable + secure)
- ✅ Attack demonstration scripts
- ✅ Phishing page demo
- ✅ Comprehensive documentation
- ✅ Detailed exploitation reports

### 6.4 Future Work

1. Implement PKCE (Proof Key for Code Exchange)
2. Add refresh token mechanism
3. Implement token revocation
4. Add MFA support
5. Create automated security tests
6. Build monitoring dashboard

---

## 7. PHỤ LỤC

### Appendix A: References

1. **OAuth 2.0 Core Specification**
   - RFC 6749: https://tools.ietf.org/html/rfc6749

2. **OAuth 2.0 Security**  
   - RFC 6819: https://tools.ietf.org/html/rfc6819
   - OAuth 2.0 Security BCP: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics

3. **OWASP Guidelines**
   - OAuth Cheat Sheet
   - CSRF Prevention

### Appendix B: Test Credentials

```
User Account:
- Email: user@example.com
- Password: password123

Vulnerable Version:
- Auth Server: http://localhost:3001
- Client App: http://localhost:3002
- Client ID: client-vulnerable-app
- Client Secret: secret-123

Secure Version:
- Auth Server: http://localhost:3003  
- Client App: http://localhost:3004
- Client ID: client-secure-app
- Client Secret: [See server startup output]
```

### Appendix C: Command Reference

```bash
# Install
npm install

# Run Vulnerable
npm run vulnerable:auth
npm run vulnerable:client

# Run Secure
npm run secure:auth
npm run secure:client

# Demo Attacks
npm run attack:demo

# Open Demo Pages
open http://localhost:3002  # Vulnerable
open http://localhost:3004  # Secure
open phishing-demo.html     # Phishing page
```

---

## 📸 DANH SÁCH SCREENSHOTS CẦN CHỤP

### Vulnerable Version (Port 3002)
- [ ] 1. Homepage với vulnerability warnings
- [ ] 2. Login button clicked
- [ ] 3. Authorization page (no state in URL)
- [ ] 4. Login form với credentials
- [ ] 5. Success callback page (token exposed)
- [ ] 6. Browser console (token logged)
- [ ] 7. /debug/sessions endpoint showing tokens

### CSRF Attack Demo
- [ ] 8. Phishing page (phishing-demo.html)
- [ ] 9. Malicious authorization URL
- [ ] 10. Victim authorizes (looks legitimate)
- [ ] 11. Attack success - account linked

### Code Replay Attack
- [ ] 12. First token exchange (success)
- [ ] 13. Second exchange with same code (also success on vulnerable)
- [ ] 14. Same attempt on secure version (error)

### Open Redirect Attack  
- [ ] 15. Malicious redirect_uri in URL
- [ ] 16. Accepted by vulnerable server
- [ ] 17. Rejected by secure server (error message)

### Secure Version (Port 3004)
- [ ] 18. Homepage với security badges
- [ ] 19. Authorization URL with state parameter
- [ ] 20. Success page (token encrypted message)
- [ ] 21. Missing state error
- [ ] 22. Invalid redirect_uri error
- [ ] 23. Code reuse error

### Attack Demonstrations Output
- [ ] 24. Running attack-demonstrations.js
- [ ] 25. Security comparison table
- [ ] 26. Audit logs

---

## ✅ CHECKLIST HOÀN THÀNH

### Phần 1: Development
- [ ] Vulnerable Authorization Server hoạt động
- [ ] Vulnerable Client hoạt động
- [ ] Secure Authorization Server hoạt động
- [ ] Secure Client hoạt động
- [ ] OAuth flow hoạt động đúng cả 2 versions

### Phần 2: Exploitation
- [ ] CSRF attack demo thành công
- [ ] Code Replay attack demo thành công
- [ ] Open Redirect attack demo thành công  
- [ ] Code Interception explained
- [ ] Chụp screenshots đầy đủ
- [ ] Record video demo (optional)

### Phần 3: Documentation
- [ ] README.md hoàn thiện
- [ ] QUICKSTART.md guide
- [ ] Chi tiết CSRF Attack Report
- [ ] Báo cáo tổng hợp này
- [ ] Code comments đầy đủ

### Phần 4: Presentation Ready
- [ ] Demo flow chuẩn bị
- [ ] Slides (nếu cần)
- [ ] Q&A preparation
- [ ] Backup plan (screenshots/video)

---

## 📞 CONTACT & CREDITS

**Project Team:**
- Developer: [Tên của bạn]
- Partner: [Khánh/Bin]
- Course: GIAO - Information Security
- Task: Đợt 2 (7/11 - 16/11)

**Task Assignment:**
- Authorization Code Grant: Bin & Khánh
- Authorization Code Grant with PKCE: Bảo & Khôi

**Support:**
- Documentation: README.md, QUICKSTART.md
- Code: Fully commented in Vietnamese & English
- Reports: Template provided in /reports/

---

**Date Completed:** [Ngày hoàn thành]  
**Signature:** _______________

---

*Báo cáo này được tạo cho mục đích học tập và nghiên cứu bảo mật.*
*Không sử dụng các kỹ thuật này để tấn công hệ thống thực tế.*