# 🚀 QUICK START GUIDE

## Chạy nhanh trong 5 phút!

### Bước 1: Setup (1 phút)

```bash
cd oauth-demo
npm install
```

### Bước 2: Test Vulnerable Version (2 phút)

**Terminal 1:**
```bash
npm run vulnerable:auth
```
✅ Server khởi động tại http://localhost:3001

**Terminal 2:**
```bash
npm run vulnerable:client
```
✅ Client khởi động tại http://localhost:3002

**Browser:**
1. Mở http://localhost:3002
2. Click "Login with OAuth (Vulnerable)"
3. Login với: `user@example.com` / `password123`
4. Quan sát: Token bị exposed!

### Bước 3: Test Attack (2 phút)

**Terminal 3:**
```bash
npm run attack:demo
```

Sẽ hiển thị chi tiết 4 loại tấn công!

### Bước 4: Test Secure Version

**Terminal 4:**
```bash
npm run secure:auth
```
⚠️ **LƯU Ý CLIENT_SECRET hiển thị trong console!**

Copy CLIENT_SECRET, sau đó edit `secure-client.js`:
```javascript
// Line ~12
let CLIENT_SECRET = 'PASTE-SECRET-HERE';
```

**Terminal 5:**
```bash
npm run secure:client
```

**Browser:**
1. Mở http://localhost:3004
2. Click "Login with OAuth (Secure)"
3. Quan sát: Token được mã hóa!

---

## 🎯 Demo các cuộc tấn công

### Attack 1: CSRF (Vulnerable Version)

1. Copy URL này:
```
http://localhost:3001/login?client_id=client-vulnerable-app&redirect_uri=http://localhost:3002/callback&response_type=code&scope=profile%20email
```

2. Mở incognito window
3. Paste URL và Enter
4. Login → Attack thành công! ✅

**Thử trên Secure Version:**
```
http://localhost:3003/login?client_id=client-secure-app&redirect_uri=http://localhost:3004/callback&response_type=code&scope=profile%20email
```
→ Lỗi: "State parameter required" ❌

### Attack 2: Code Replay (Vulnerable Version)

1. Complete OAuth flow bình thường
2. Lấy authorization code từ URL callback
3. Gọi token endpoint lần 2 với cùng code:

```bash
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

→ Nhận token lần 2! ✅ (Vulnerable)

**Thử trên Secure Version:**
→ Error: "Code already used" ❌

---

## 📸 Checklist Screenshots cho Báo cáo

### Vulnerable Version
- [ ] Homepage với vulnerability warnings
- [ ] Authorization URL không có state
- [ ] Token exposed trong page
- [ ] Token trong console logs
- [ ] /debug/sessions endpoint
- [ ] Successful CSRF attack
- [ ] Successful code replay

### Secure Version  
- [ ] Homepage với security badges
- [ ] Authorization URL có state
- [ ] Token encrypted
- [ ] Error khi missing state
- [ ] Error khi invalid redirect_uri
- [ ] Error khi code reuse

### Attack Demonstrations
- [ ] CSRF attack flow
- [ ] Code interception demo
- [ ] Code replay attempt
- [ ] Open redirect attempt

---

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

### Cannot find module
```bash
npm install
```

### CLIENT_SECRET not set (Secure Client)
1. Run secure-auth-server.js
2. Copy CLIENT_SECRET from console
3. Update secure-client.js line ~12

---

## 📝 Các file quan trọng

```
oauth-demo/
├── vulnerable-auth-server.js    ← Server có lỗ hổng
├── vulnerable-client.js          ← Client có lỗ hổng  
├── secure-auth-server.js         ← Server an toàn
├── secure-client.js              ← Client an toàn
├── attack-demonstrations.js      ← Demo tấn công
├── README.md                     ← Tài liệu đầy đủ
└── reports/
    └── CSRF-Attack-Report.md     ← Template báo cáo

⚠️ ĐỌC README.md để hiểu chi tiết!
```

---

## ✅ Checklist hoàn thành Task

### Phần 1: Triển khai
- [ ] Vulnerable Auth Server chạy được
- [ ] Vulnerable Client chạy được  
- [ ] Secure Auth Server chạy được
- [ ] Secure Client chạy được
- [ ] Flow OAuth hoạt động đúng

### Phần 2: Khai thác
- [ ] Demo CSRF attack thành công
- [ ] Demo Code Interception
- [ ] Demo Code Replay thành công
- [ ] Demo Open Redirect thành công
- [ ] Chụp screenshots đầy đủ

### Phần 3: Báo cáo
- [ ] Viết báo cáo CSRF attack
- [ ] Viết báo cáo Code Replay
- [ ] Viết báo cáo Open Redirect  
- [ ] Include screenshots
- [ ] So sánh Vulnerable vs Secure

---

## 🎓 Tips cho Presentation

1. **Start with Normal Flow**
   - Show legitimate OAuth flow
   - Explain each step
   - Point out where vulnerabilities are

2. **Demo Attacks Live**
   - Show attack step-by-step
   - Explain what's happening
   - Show why it works

3. **Compare with Secure**
   - Show same attack fails
   - Explain protection mechanisms
   - Highlight differences

4. **Key Takeaways**
   - State parameter is mandatory
   - One-time code use
   - Strict redirect_uri validation
   - Token encryption

---

## 🔗 Resources

- **Full Documentation:** README.md
- **Attack Reports:** reports/
- **OAuth 2.0 RFC:** https://tools.ietf.org/html/rfc6749
- **Security Guide:** https://tools.ietf.org/html/rfc6819

---

**Good luck with your demo! 🎯**

Need help? Check README.md or review the code comments!