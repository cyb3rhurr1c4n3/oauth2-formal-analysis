# OAuth 2.0 CSRF Attack Demo - 4 Files Simple Version

## 📁 Cấu trúc Project

```
oauth-csrf-simple/
├── server-vulnerable.js    ❌ OAuth Server CÓ lỗ hổng
├── client-vulnerable.js    ❌ OAuth Client CÓ lỗ hổng  
├── server-secure.js        ✅ OAuth Server AN TOÀN
├── client-secure.js        ✅ OAuth Client AN TOÀN
├── package.json
└── README.md
```

## 🎯 Mục tiêu

Demo này được thiết kế để:
1. **Hiểu rõ** lỗ hổng CSRF trong OAuth 2.0
2. **Thực hành** khai thác lỗ hổng
3. **Học cách** phòng chống bằng state parameter
4. **So sánh** trực tiếp giữa code vulnerable và secure

## 🚀 Cài đặt

```bash
cd oauth-csrf-simple
npm install
```

## 📖 DEMO 1: VULNERABLE VERSION (Attack thành công)

### Bước 1: Chạy Vulnerable Server & Client

**Terminal 1 - Chạy Vulnerable OAuth Server:**
```bash
node server-vulnerable.js
```
→ Server chạy ở `http://localhost:4001`

**Terminal 2 - Chạy Vulnerable Client:**
```bash
node client-vulnerable.js
```
→ Client chạy ở `http://localhost:4000`

### Bước 2: Setup Attack Environment

1. **Mở Client (Victim Browser):**
   - Truy cập: `http://localhost:4000`
   - Đây là browser của victim

2. **Mở Attacker Panel (Attacker Browser):**
   - Truy cập: `http://localhost:4000/attacker-page`
   - Đây là browser của attacker
   - Có thể mở trong Incognito/Private window

### Bước 3: Attacker Chuẩn Bị Attack

Trên **Attacker Page** (`http://localhost:4000/attacker-page`):

1. Click button **"Start OAuth Flow (as Attacker)"**
2. Popup window mở ra → Login với:
   - Email: `attacker@email.com`
   - Password: `attacker123`
3. Click **"Allow Access"**
4. Sau khi redirect, URL sẽ có dạng:
   ```
   http://localhost:4000/callback?code=CODE_xxxx-xxxx-xxxx
   ```
5. **Copy** phần `CODE_xxxx-xxxx-xxxx`
6. **Paste** vào ô input trên Attacker Page
7. Click **"Generate CSRF Attack Link"**
8. Malicious link được tạo ra!

### Bước 4: Victim Bị Tấn Công

Quay lại **Victim Browser** (`http://localhost:4000`):

1. **QUAN TRỌNG:** Đảm bảo chưa login vào app
2. Copy malicious link từ Attacker Page
3. Paste vào address bar của Victim Browser
4. **Quan sát kết quả:**

```
✅ Page load thành công
✅ User info hiển thị: attacker@email.com
❌ ATTACK THÀNH CÔNG!
```

**Điều gì đã xảy ra:**
- Victim's session bị link với OAuth account của ATTACKER
- Attacker giờ có thể access dữ liệu của victim
- Victim không hề hay biết họ đang dùng OAuth của attacker!

### Bước 5: Verify Attack

Kiểm tra Terminal logs:

**Client Terminal sẽ hiển thị:**
```
========================================
📨 OAUTH CALLBACK RECEIVED
========================================
Code: CODE_xxxx-xxxx-xxxx
State: ❌ NO STATE
⚠️  NO STATE VALIDATION - Processing code from ANYONE!
========================================

✅ Token received: TOKEN_xxxx-xxxx-xxxx
✅ User info received: attacker@email.com

⚠️  CRITICAL: Linking account WITHOUT state validation!
This could be attacker's OAuth account!
========================================
```

**➡️ Attack thành công vì client KHÔNG validate state!**

---

## 📖 DEMO 2: SECURE VERSION (Attack thất bại)

### Bước 1: Stop Vulnerable Servers

Dừng cả 2 terminals của vulnerable version (Ctrl+C)

### Bước 2: Chạy Secure Server & Client

**Terminal 1 - Chạy Secure OAuth Server:**
```bash
node server-secure.js
```
→ Server chạy ở `http://localhost:5001`

**Terminal 2 - Chạy Secure Client:**
```bash
node client-secure.js
```
→ Client chạy ở `http://localhost:5000`

### Bước 3: Setup Attack (Same as Before)

1. **Mở Client:** `http://localhost:5000`
2. **Mở Attacker Panel:** `http://localhost:5000/attacker-page`

### Bước 4: Attacker Thử Tấn Công

Trên **Attacker Page**:

1. Click **"Start OAuth Flow (as Attacker)"**
2. Login: `attacker@email.com` / `attacker123`
3. Click **"Allow Access"**
4. Copy authorization code từ URL
5. Paste và click **"Generate Attack Link"**
6. Copy malicious link

### Bước 5: Victim Click Link

Quay lại **Victim Browser** (`http://localhost:5000`):

1. Paste malicious link vào address bar
2. **Quan sát kết quả:**

```
🛑 CSRF Attack Detected & Blocked!

Reason: State validation failed
Expected State: abc123...
Received State: attacker-fake-state-123
Security Check: FAILED
Action: Request rejected
```

**➡️ Attack THẤT BẠI! ✅**

### Bước 6: Verify Defense

Kiểm tra Terminal logs:

**Client Terminal sẽ hiển thị:**
```
========================================
📨 OAUTH CALLBACK RECEIVED (SECURE)
========================================
Code: CODE_xxxx-xxxx-xxxx
Received State: attacker-fake-state-123
Stored State: (none or different)

❌ CSRF ATTACK DETECTED: State mismatch!
Expected: abc123...
Received: attacker-fake-state-123
========================================
```

**➡️ Attack bị chặn nhờ state validation! ✅**

---

## 🔍 So Sánh Code

### ❌ VULNERABLE CODE (client-vulnerable.js)

```javascript
// Khởi tạo OAuth flow
app.get('/login', (req, res) => {
  const authUrl = 
    `${OAUTH_CONFIG.authorizationUrl}?` +
    `client_id=${OAUTH_CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}&` +
    `response_type=code`;
  // ❌ KHÔNG CÓ STATE PARAMETER!
  
  res.redirect(authUrl);
});

// Callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  // ❌ KHÔNG VALIDATE STATE!
  // Chấp nhận bất kỳ code nào
  
  const token = await exchangeCode(code);
  req.session.user = await getUser(token);
  // ❌ VICTIM BỊ LINK VỚI ATTACKER'S OAUTH!
});
```

### ✅ SECURE CODE (client-secure.js)

```javascript
// Khởi tạo OAuth flow
app.get('/login', (req, res) => {
  // ✅ Generate random state
  const state = crypto.randomBytes(32).toString('hex');
  
  // ✅ Lưu vào session
  req.session.oauthState = state;
  
  const authUrl = 
    `${OAUTH_CONFIG.authorizationUrl}?` +
    `client_id=${OAUTH_CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}&` +
    `response_type=code&` +
    `state=${state}`;  // ✅ INCLUDE STATE!
  
  res.redirect(authUrl);
});

// Callback
app.get('/callback', async (req, res) => {
  const { code, state: receivedState } = req.query;
  
  // ✅ VALIDATE STATE!
  if (!receivedState || receivedState !== req.session.oauthState) {
    return res.status(403).send('CSRF Attack Detected!');
  }
  
  // ✅ Clear used state
  delete req.session.oauthState;
  
  const token = await exchangeCode(code);
  req.session.user = await getUser(token);
  // ✅ AN TOÀN - Chỉ link với legitimate OAuth!
});
```

---

## 🎓 Key Takeaways

### 1. Lỗ hổng CSRF trong OAuth

**Khi nào xảy ra:**
- Client KHÔNG sử dụng state parameter
- Client KHÔNG validate state trong callback
- Attacker có thể inject authorization code của họ

**Tác động:**
- Account takeover
- Data breach
- Privacy violation

### 2. State Parameter

**State là gì:**
- Random string được generate trước OAuth flow
- Gửi đến OAuth provider và quay lại trong callback
- Dùng để verify request là legitimate

**Cách hoạt động:**
```
1. Client generate: state = "abc123xyz..."
2. Client store: session.state = "abc123xyz..."
3. Client redirect: /authorize?...&state=abc123xyz...
4. Provider redirect back: /callback?code=XXX&state=abc123xyz...
5. Client validate: receivedState === session.state
6. If match → OK, if not → CSRF attack!
```

### 3. Best Practices

✅ **LUÔN:**
- Sử dụng state parameter
- Generate state bằng crypto-secure random
- Store state server-side (session)
- Validate state trong callback
- Clear state sau khi dùng (one-time use)

❌ **KHÔNG BAO GIỜ:**
- Skip state parameter
- Dùng predictable state values
- Store state ở client-side
- Reuse state values

---

## 🧪 Testing Scenarios

### Test 1: Attack với No State (Vulnerable)
```bash
# Start vulnerable version
node server-vulnerable.js  # Port 4001
node client-vulnerable.js  # Port 4000

# Navigate to attacker page
http://localhost:4000/attacker-page

# Expected: Attack SUCCESS ❌
```

### Test 2: Attack với State Validation (Secure)
```bash
# Start secure version
node server-secure.js  # Port 5001
node client-secure.js  # Port 5000

# Navigate to attacker page
http://localhost:5000/attacker-page

# Expected: Attack BLOCKED ✅
```

### Test 3: Legitimate Login (Secure)
```bash
# Start secure version
# Navigate to homepage
http://localhost:5000

# Click "Login with OAuth (Secure)"
# Login: victim@email.com / victim123
# Authorize

# Expected: Login SUCCESS ✅
```

---

## 📊 Demo Checklist

### Vulnerable Version Demo
- [ ] Start servers on ports 4000 & 4001
- [ ] Open client homepage
- [ ] Open attacker page in new tab
- [ ] Get authorization code as attacker
- [ ] Generate malicious link
- [ ] Test link as victim
- [ ] Verify attack succeeds
- [ ] Check logs showing no validation

### Secure Version Demo
- [ ] Stop vulnerable servers
- [ ] Start servers on ports 5000 & 5001
- [ ] Open client homepage
- [ ] Open attacker page in new tab
- [ ] Get authorization code as attacker
- [ ] Generate malicious link
- [ ] Test link as victim
- [ ] Verify attack blocked
- [ ] Check logs showing state validation

---

## 🐛 Troubleshooting

### Issue: Port already in use
```bash
# Find process using port
lsof -i :4000
lsof -i :4001

# Kill process
kill -9 <PID>
```

### Issue: Session not persisting
- Clear browser cookies
- Make sure you're using same browser window
- Check if session middleware is configured correctly

### Issue: Attack not working on vulnerable version
- Make sure you're NOT logged in on victim browser
- Clear session/cookies
- Verify you're using correct ports (4000/4001)

---

## 📚 References

1. [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749#section-10.12)
2. [RFC 6819 - OAuth 2.0 Security](https://tools.ietf.org/html/rfc6819#section-4.4.1.8)
3. [OWASP OAuth Security](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

---

## ⚠️ Disclaimer

**QUAN TRỌNG:**
- Code này chỉ dùng cho mục đích giáo dục
- KHÔNG deploy lên production
- KHÔNG test trên hệ thống thực
- Chỉ dùng trong môi trường localhost an toàn

---

## 📝 Summary

| Aspect | Vulnerable | Secure |
|--------|-----------|--------|
| State Parameter | ❌ No | ✅ Yes |
| State Validation | ❌ No | ✅ Yes |
| CSRF Attack | ❌ Success | ✅ Blocked |
| Security Level | 🔴 Low | 🟢 High |

**Bài học quan trọng:**
> State parameter KHÔNG PHẢI optional trong OAuth 2.0!
> Nó là REQUIRED để bảo vệ khỏi CSRF attacks!

---

## 🎯 Next Steps

Sau khi hoàn thành demo này:
1. Đọc code chi tiết trong 4 files
2. Chạy cả 2 versions và quan sát logs
3. Thử modify code để hiểu sâu hơn
4. Tìm hiểu thêm về PKCE (Proof Key for Code Exchange)
5. Implement thêm các security measures khác

Good luck with your demo! 🚀