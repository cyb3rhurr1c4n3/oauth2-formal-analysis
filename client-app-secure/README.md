# Secure Client Application

✅ This application implements OAuth 2.0 Authorization Code Grant with PKCE using security best practices.

## Overview

This is a secure OAuth 2.0 client application that properly implements PKCE (Proof Key for Code Exchange), state parameter validation, server-side token exchange, and other security best practices. It demonstrates how OAuth clients should be implemented to protect user accounts.

## Security Features

This client implements the following security controls:

1. **PKCE with S256**: Generates cryptographically secure code_verifier and code_challenge
2. **State Parameter**: Generates and validates state for CSRF protection
3. **Server-Side Token Exchange**: Authorization code never reaches browser
4. **Session-Based Storage**: Tokens stored in secure server-side sessions
5. **No URL Token Exposure**: Clean URLs, no sensitive data in browser history
6. **Secure Logging**: Never logs tokens, codes, or verifiers
7. **Token Expiration Check**: Validates tokens before use
8. **Proper Logout**: Destroys session and invalidates tokens
9. **HTTP-Only Cookies**: Session cookies not accessible to JavaScript
10. **No Client-Side Token Access**: Tokens never sent to browser

## Installation

```bash
cd client-app-secure
npm install
```

## Running the Application

```bash
npm start
```

The application will start on `http://localhost:3001`

## Prerequisites

Make sure the secure authorization server is running:
```bash
cd auth-server-secure
npm start
```

## Usage

1. Open `http://localhost:3001` in your browser
2. Click "Login with Demo OAuth"
3. You'll be redirected to the authorization server
4. Login with credentials (username: `demo`, password: `password123`)
5. Authorize the application
6. You'll be redirected back and logged in automatically
7. User profile is displayed

## OAuth Flow (Secure Implementation)

### Step 1: Login Initiation (Server-Side)

```javascript
app.get('/api/login', (req, res) => {
  // Generate PKCE parameters
  const pkce = generatePKCE();
  const state = generateState();
  
  // Store in server session (never sent to browser)
  req.session.oauth = {
    state: state,
    code_verifier: pkce.code_verifier
  };
  
  // Return authorization URL with code_challenge
  res.json({ authorization_url: authUrl.toString() });
});
```

**Security**: `code_verifier` and `state` never leave the server.

### Step 2: Authorization (Auth Server)

User is redirected to auth server with:
- `client_id`
- `redirect_uri`
- `response_type=code`
- `code_challenge` (hash of verifier)
- `code_challenge_method=S256`
- `state`

**Security**: Only the challenge is sent, not the verifier.

### Step 3: Callback (Server-Side)

```javascript
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Validate state parameter
  if (state !== req.session.oauth.state) {
    return res.redirect('/?error=invalid_state');
  }
  
  // Exchange code for token (server-side)
  const tokenResponse = await fetch(tokenEndpoint, {
    method: 'POST',
    body: new URLSearchParams({
      code: code,
      code_verifier: req.session.oauth.code_verifier
    })
  });
  
  // Store token in session
  req.session.access_token = tokenData.access_token;
  
  res.redirect('/');
});
```

**Security**: Token exchange happens server-side, tokens stored in session.

## Security Implementation Details

### 1. PKCE Generation

```javascript
function generatePKCE() {
  // Generate 32 random bytes (256 bits)
  const verifier = crypto.randomBytes(32).toString('base64url');
  
  // Compute SHA-256 hash and encode as base64url
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  
  return {
    code_verifier: verifier,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  };
}
```

### 2. State Generation

```javascript
function generateState() {
  // Generate 32 random bytes (256 bits) for CSRF protection
  return crypto.randomBytes(32).toString('hex');
}
```

### 3. Session Configuration

```javascript
app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,    // Not accessible to JavaScript
    secure: false,     // Set true in production with HTTPS
    sameSite: 'lax',   // CSRF protection
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));
```

### 4. Secure Logging

```javascript
// GOOD: Only log non-sensitive information
logInfo('OAuth login initiated', { 
  has_state: true,
  has_pkce: true
});

// GOOD: Safe callback logging
logInfo('OAuth callback received', {
  has_code: !!code,
  has_state: !!state
});

// NEVER log: tokens, codes, verifiers, or state values
```

### 5. Token Storage

Tokens are stored server-side in the session:

```javascript
req.session.access_token = tokenData.access_token;
req.session.token_expires_at = Date.now() + (tokenData.expires_in * 1000);
```

The browser never sees the access token. API requests use the session:

```javascript
app.get('/api/user', (req, res) => {
  // Use token from server session
  const token = req.session.access_token;
  
  // Fetch user info using server-stored token
  // ...
});
```

### 6. State Validation

```javascript
// Validate state matches
if (!state || !req.session.oauth || state !== req.session.oauth.state) {
  logInfo('State parameter mismatch - possible CSRF attack');
  return res.redirect('/?error=invalid_state');
}

// Check OAuth flow age
const maxAge = 10 * 60 * 1000; // 10 minutes
if (Date.now() - req.session.oauth.initiated_at > maxAge) {
  logInfo('OAuth flow expired');
  return res.redirect('/?error=expired');
}
```

## File Structure

```
client-app-secure/
├── server.js           # Express server with OAuth logic
├── package.json
├── README.md
└── public/
    ├── index.html      # Main page
    └── callback.html   # Minimal callback page (server handles logic)
```

## API Endpoints

### GET /api/login
Initiates OAuth flow, generates PKCE and state, returns authorization URL.

**Response**:
```json
{
  "authorization_url": "http://localhost:4001/authorize?client_id=...&code_challenge=..."
}
```

### GET /callback
OAuth callback endpoint (server-side processing).

**Query Params**: `code`, `state`, `error`

**Action**: Validates state, exchanges code for token, stores in session, redirects to home.

### GET /api/status
Check if user is logged in.

**Response**:
```json
{
  "logged_in": true,
  "user": {
    "sub": "demo",
    "name": "Demo User",
    "email": "demo@example.com"
  }
}
```

### GET /api/user
Get current user information.

**Response**:
```json
{
  "user": {
    "sub": "demo",
    "name": "Demo User",
    "email": "demo@example.com"
  },
  "expires_in": 3456
}
```

### POST /api/logout
Logout user, destroy session.

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Comparison with Vulnerable Version

| Feature | Vulnerable | Secure |
|---------|-----------|---------|
| PKCE Implementation | ❌ None | ✅ S256 method |
| State Parameter | ❌ Not used | ✅ Generated & validated |
| Token Exchange | ❌ Client-side | ✅ Server-side |
| Token Storage | ❌ localStorage | ✅ Server session |
| Code in URL | ❌ Visible | ✅ Immediately cleared |
| Token in Browser | ❌ Exposed | ✅ Never sent |
| Logging | ❌ Logs sensitive data | ✅ Safe logging |
| Expiration Check | ❌ None | ✅ Validated |
| Logout | ❌ Client only | ✅ Server session destroyed |

## Security Benefits

### Protection Against Authorization Code Interception

With PKCE:
- Attacker intercepts authorization code from URL
- Attacker tries to exchange code for token
- Auth server requests `code_verifier`
- Attacker doesn't have the verifier (it never left the server)
- Auth server rejects the request ✅

### Protection Against CSRF Attacks

With state parameter:
- Attacker initiates OAuth flow with victim's browser
- Victim completes authorization
- Callback includes attacker's state value
- Client checks state doesn't match session
- Request is rejected ✅

### Protection Against Token Theft

With server-side storage:
- Access tokens stored in server session
- Session ID in HTTP-only cookie
- JavaScript cannot access session cookie
- XSS attacks cannot steal token ✅
- Browser extensions cannot read token ✅

### Protection Against URL-Based Leaks

With server-side callback:
- Authorization code received by server
- Code never appears in browser console
- Code immediately exchanged and removed
- No sensitive data in browser history ✅

## Production Considerations

For production use, you should also:

1. **Enable HTTPS** and set `cookie.secure: true`
2. **Use Redis or database** for session storage (not in-memory)
3. **Implement refresh tokens** for better UX
4. **Add CORS headers** if needed for API access
5. **Rate limit** login attempts
6. **Monitor** for suspicious activity
7. **Use environment variables** for configuration
8. **Add Content Security Policy** headers
9. **Implement proper error pages**
10. **Add logging and monitoring** (without sensitive data)

## License

MIT - Educational and production use
