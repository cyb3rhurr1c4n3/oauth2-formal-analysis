# Secure Authorization Server

✅ This server implements OAuth 2.0 Authorization Code Grant with PKCE using security best practices.

## Overview

This is a secure OAuth 2.0 authorization server that properly implements PKCE (Proof Key for Code Exchange), state parameter validation, and other security best practices. It demonstrates how OAuth should be implemented to protect against common attacks.

## Security Features

This server implements the following security controls:

1. **PKCE Validation (S256)**: Properly validates `code_verifier` against `code_challenge`
2. **State Parameter Required**: Enforces and validates state parameter for CSRF protection
3. **Strict Redirect URI Validation**: Whitelist-based validation, no wildcards
4. **Password Hashing**: Passwords hashed with SHA-256 (use bcrypt in production)
5. **Generic Error Messages**: Prevents username enumeration
6. **Secure Logging**: Never logs tokens, codes, or credentials
7. **Token Expiration**: Authorization codes expire in 10 minutes, tokens in 1 hour
8. **Single-Use Codes**: Authorization codes can only be used once
9. **Constant-Time Comparison**: Prevents timing attacks
10. **Automatic Cleanup**: Expired tokens and codes are automatically removed

## Installation

```bash
cd auth-server-secure
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:4001`

## Endpoints

- **Authorization**: `GET http://localhost:4001/authorize`
  - Query params: `client_id`, `redirect_uri`, `response_type`, `code_challenge` (required), `code_challenge_method` (required), `state` (required)
  
- **Token**: `POST http://localhost:4001/token`
  - Body params: `grant_type`, `code`, `redirect_uri`, `client_id`, `code_verifier` (required)
  
- **UserInfo**: `GET http://localhost:4001/userinfo`
  - Header: `Authorization: Bearer <access_token>`
  
- **Login**: `GET http://localhost:4001/login`
  - Shows login form
  
- **Health Check**: `GET http://localhost:4001/health`

## Test Credentials

- **Username**: `demo`
- **Password**: `password123`

## Registered Clients

- **Client ID**: `client-app-secure`
- **Redirect URIs**: 
  - `http://localhost:3001/callback`
- **PKCE Required**: Yes

## Configuration

### Token Expiration

```javascript
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
```

### Cleanup Interval

Expired tokens and codes are automatically cleaned up every 5 minutes.

## Usage with Client Application

1. Start this authorization server: `npm start`
2. Start the secure client application in another terminal
3. Open the client application in your browser at `http://localhost:3001`
4. Click "Login with Demo OAuth"
5. You'll be redirected here to authorize
6. Login with the test credentials
7. Authorize the application
8. You'll be redirected back to the client with proper PKCE validation

## Security Implementation Details

### 1. PKCE Validation

```javascript
function verifyPKCE(codeVerifier, codeChallenge, method = 'S256') {
  // Verify format and length
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }
  
  // Compute challenge from verifier
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const computedChallenge = hash.toString('base64url');
  
  // Constant-time comparison
  return constantTimeCompare(computedChallenge, codeChallenge);
}
```

### 2. Redirect URI Validation

```javascript
function isValidRedirectUri(clientId, redirectUri) {
  const client = clients[clientId];
  if (!client) return false;
  
  // Exact match required - no wildcards
  return client.redirect_uris.includes(redirectUri);
}
```

### 3. State Parameter Validation

```javascript
// Authorization endpoint
if (!state) {
  return res.status(400).send('state parameter is required');
}

if (state.length < 32) {
  return res.status(400).send('state parameter must be at least 32 characters');
}
```

### 4. Single-Use Authorization Codes

```javascript
// Check if code was already used
if (authCode.used) {
  authorizationCodes.delete(code);
  logInfo('Authorization code reuse detected - security breach');
  return res.status(400).json({ error: 'invalid_grant' });
}

// Mark as used
authCode.used = true;
```

### 5. Token Expiration

```javascript
// Check token expiration
if (now > tokenData.expires_at) {
  accessTokens.delete(accessToken);
  return res.status(401).json({ error: 'invalid_token' });
}
```

### 6. Secure Logging

```javascript
// GOOD: Only log non-sensitive information
logInfo('Access token issued', { 
  client_id, 
  username: authCode.username,
  expires_in_seconds: TOKEN_EXPIRY_MS / 1000
});

// NEVER log tokens, codes, or credentials!
```

## Comparison with Vulnerable Version

| Feature | Vulnerable | Secure |
|---------|-----------|---------|
| PKCE Validation | ❌ Not validated | ✅ Properly validated (S256) |
| State Parameter | ❌ Optional, not checked | ✅ Required and validated |
| Redirect URI | ❌ Any URI accepted | ✅ Strict whitelist |
| Password Storage | ❌ Plain text | ✅ Hashed (SHA-256) |
| Error Messages | ❌ Detailed | ✅ Generic |
| Logging | ❌ Logs sensitive data | ✅ No sensitive data |
| Code Expiration | ❌ Never expires | ✅ 10 minutes |
| Token Expiration | ❌ Never expires | ✅ 1 hour |
| Code Reuse | ❌ Allowed | ✅ Single-use only |

## Production Considerations

For production use, you should also:

1. **Use bcrypt or Argon2** for password hashing instead of SHA-256
2. **Enable HTTPS** (set `secure: true` for cookies)
3. **Use a proper database** instead of in-memory storage
4. **Implement rate limiting** on login and token endpoints
5. **Add CORS configuration** for API endpoints
6. **Use environment variables** for configuration
7. **Implement refresh tokens** for better UX
8. **Add client authentication** for confidential clients
9. **Monitor for suspicious activity** (multiple failed attempts, etc.)
10. **Regular security audits** and penetration testing

## License

MIT - Educational and production use
