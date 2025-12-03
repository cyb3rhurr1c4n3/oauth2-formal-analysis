# Vulnerable Client Application

⚠️ **WARNING**: This application contains intentional security vulnerabilities for educational purposes only. **DO NOT** use this code in production!

## Overview

This is an intentionally vulnerable OAuth 2.0 client application that demonstrates common security mistakes in OAuth client implementations. It's designed to help developers understand insecure practices and their consequences.

## Security Vulnerabilities

This client demonstrates the following vulnerabilities:

1. **No PKCE Implementation**: Doesn't generate or use `code_verifier`/`code_challenge`
2. **Missing State Parameter**: No CSRF protection
3. **Client-Side Token Exchange**: Entire OAuth flow happens in browser
4. **Insecure Token Storage**: Access tokens stored in localStorage
5. **Tokens in URLs**: Authorization code visible in browser history
6. **Sensitive Data Logging**: Logs tokens and codes to console
7. **No Token Expiration Check**: Uses tokens without validating expiry
8. **Token Exposure**: Displays full access token in the page
9. **No Logout on Server**: Only clears localStorage

## Installation

```bash
cd client-app-vulnerable
npm install
```

## Running the Application

```bash
npm start
```

The application will start on `http://localhost:3000`

## Prerequisites

Make sure the vulnerable authorization server is running:
```bash
cd auth-server-vulnerable
npm start
```

## Usage

1. Open `http://localhost:3000` in your browser
2. Click "Login with Demo OAuth"
3. You'll be redirected to the authorization server
4. Login with credentials (username: `demo`, password: `password123`)
5. Authorize the application
6. You'll be redirected back with an authorization code in the URL
7. The app exchanges the code for a token (visible in browser console)
8. User profile is displayed

## What Makes This Vulnerable?

### 1. No PKCE Implementation

```javascript
// VULNERABILITY: No code_verifier or code_challenge generated
const authUrl = new URL(config.authorization_endpoint);
authUrl.searchParams.set('client_id', config.client_id);
authUrl.searchParams.set('redirect_uri', config.redirect_uri);
authUrl.searchParams.set('response_type', 'code');
// MISSING: code_challenge and code_challenge_method
```

**Attack**: If an attacker intercepts the authorization code, they can use it to get an access token.

### 2. No State Parameter

```javascript
// VULNERABILITY: No state parameter
// Makes app vulnerable to CSRF attacks
window.location.href = authUrl.toString();
```

**Attack**: Attacker can trick victim into authorizing attacker's account.

### 3. Client-Side Token Exchange

```javascript
// VULNERABILITY: Token exchange happening in browser
const tokenResponse = await fetch(config.token_endpoint, {
  method: 'POST',
  body: new URLSearchParams(tokenRequest)
});
```

**Attack**: Entire OAuth flow is visible in browser, exposing authorization codes and tokens.

### 4. Insecure Token Storage

```javascript
// VULNERABILITY: Storing token in localStorage
localStorage.setItem('access_token', tokenData.access_token);
```

**Attack**: XSS attacks can steal tokens from localStorage. Malware and browser extensions can also access it.

### 5. Authorization Code in URL

```javascript
// VULNERABILITY: Code visible in URL
// http://localhost:3000/callback?code=abc123...
const code = urlParams.get('code');
```

**Attack**: Authorization code exposed in browser history, server logs, and referrer headers.

### 6. Sensitive Data Logging

```javascript
// VULNERABILITY: Logging tokens to console
console.log('VULNERABILITY: Access token received:', tokenData.access_token);
console.log('VULNERABILITY: Authorization code:', code);
```

**Attack**: Tokens visible in browser console, can be stolen by browser extensions or screenshots.

### 7. No Token Expiration Check

```javascript
// VULNERABILITY: Using token without checking expiration
const accessToken = localStorage.getItem('access_token');
if (accessToken) {
  loadUserInfo(accessToken); // No expiration check!
}
```

**Attack**: Expired tokens are still used, leading to errors and poor UX.

## Attack Demonstrations

### Attack 1: Authorization Code Interception

1. Open browser developer tools
2. Go to the Network tab
3. Click "Login"
4. Watch the redirect URL containing the authorization code
5. Copy the authorization code from the URL
6. An attacker with this code can exchange it for a token (no PKCE protection)

### Attack 2: Token Theft via Console

1. Login to the application
2. Open browser console
3. See the full access token logged
4. Token can be copied and used by attacker

### Attack 3: Token Theft via localStorage

1. Login to the application
2. Open browser console
3. Type: `localStorage.getItem('access_token')`
4. Full access token is displayed
5. XSS attack or malicious extension could steal this

### Attack 4: Browser History Leakage

1. Login to the application
2. Check browser history
3. Authorization code is visible in the callback URL
4. Anyone with access to browser history can see the code

## File Structure

```
client-app-vulnerable/
├── server.js           # Minimal Express server
├── package.json
├── README.md
└── public/
    ├── index.html      # Main page with login button
    └── callback.html   # OAuth callback handler
```

## Comparison with Secure Version

Run the secure client application (`client-app-secure`) to see how these vulnerabilities are properly mitigated.

| Feature | Vulnerable | Secure |
|---------|-----------|---------|
| PKCE | ❌ Not used | ✅ Implemented (S256) |
| State | ❌ Not used | ✅ Generated & validated |
| Token Exchange | ❌ Client-side | ✅ Server-side |
| Token Storage | ❌ localStorage | ✅ Server session |
| Code in URL | ❌ Visible | ✅ Immediately processed |
| Logging | ❌ Logs tokens | ✅ No sensitive data |
| Expiration | ❌ Not checked | ✅ Validated |

## Educational Value

This vulnerable client helps demonstrate:
- Why PKCE is critical for public clients
- The importance of state parameter for CSRF protection
- Risks of client-side token exchange
- Dangers of localStorage for sensitive data
- Impact of exposing tokens in logs and URLs
- Need for server-side OAuth flow

## Pages

### index.html
Main application page with:
- Login button
- User profile display (when logged in)
- Vulnerability warnings and educational notes

### callback.html
OAuth callback handler that:
- Receives authorization code from URL
- Exchanges code for access token (client-side - vulnerable!)
- Stores token in localStorage (vulnerable!)
- Redirects to main page

## Security Improvements Needed

To make this secure, you would need to:
1. Implement PKCE (generate code_verifier and code_challenge)
2. Use state parameter for CSRF protection
3. Move token exchange to server-side
4. Store tokens in secure server-side sessions
5. Never expose tokens in browser or logs
6. Check token expiration before use
7. Clear authorization code from URL immediately
8. Implement proper logout (invalidate tokens on server)

See the `client-app-secure` for proper implementation.

## License

MIT - Educational purposes only
