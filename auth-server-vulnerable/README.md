# Vulnerable Authorization Server

⚠️ **WARNING**: This server contains intentional security vulnerabilities for educational purposes only. **DO NOT** use this code in production!

## Overview

This is an intentionally vulnerable OAuth 2.0 authorization server that demonstrates common security mistakes in OAuth implementations. It's designed to help developers understand what NOT to do and how these vulnerabilities can be exploited.

## Security Vulnerabilities

This server demonstrates the following vulnerabilities:

1. **No PKCE Validation**: Stores `code_challenge` but never validates `code_verifier`
2. **Missing State Validation**: Doesn't require or validate state parameter
3. **Weak Redirect URI Validation**: Accepts any redirect_uri (open redirect vulnerability)
4. **Plain Text Password Storage**: Passwords stored without hashing
5. **Information Disclosure**: Detailed error messages reveal username existence
6. **Sensitive Data Logging**: Logs tokens, codes, and credentials
7. **No Token Expiration**: Tokens and codes never expire
8. **Single-Use Code Not Enforced**: Authorization codes can be reused
9. **Timing Attacks**: Different response times for valid vs invalid usernames
10. **No Rate Limiting**: Vulnerable to brute force attacks

## Installation

```bash
cd auth-server-vulnerable
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:4000`

## Endpoints

- **Authorization**: `GET http://localhost:4000/authorize`
  - Query params: `client_id`, `redirect_uri`, `response_type`, `code_challenge` (optional), `code_challenge_method` (optional), `state` (optional)
  
- **Token**: `POST http://localhost:4000/token`
  - Body params: `grant_type`, `code`, `redirect_uri`, `client_id`, `code_verifier` (optional)
  
- **UserInfo**: `GET http://localhost:4000/userinfo`
  - Header: `Authorization: Bearer <access_token>`
  
- **Login**: `GET http://localhost:4000/login`
  - Shows login form
  
- **Health Check**: `GET http://localhost:4000/health`

## Test Credentials

- **Username**: `demo`
- **Password**: `password123`

## Registered Clients

- **Client ID**: `client-app-vulnerable`
- **Redirect URIs**: None registered (accepts any!)

## Usage with Client Application

1. Start this authorization server: `npm start`
2. Start the vulnerable client application in another terminal
3. Open the client application in your browser
4. Click "Login with Demo OAuth"
5. You'll be redirected here to authorize
6. Login with the test credentials
7. Authorize the application
8. You'll be redirected back to the client

## What Makes This Vulnerable?

### 1. No PKCE Validation
```javascript
// VULNERABILITY: We store code_challenge but never verify it!
if (authCode.code_challenge && code_verifier) {
  console.log('PKCE parameters present but NOT validated - token issued anyway!');
  // Should verify: SHA256(code_verifier) === code_challenge
}
```

### 2. Weak Redirect URI Validation
```javascript
// VULNERABILITY: Empty array means we accept ANY redirect_uri
redirect_uris: []
```

### 3. Sensitive Data Logging
```javascript
// VULNERABILITY: Logging credentials and tokens!
logDebug('User logged in', { username, password, sessionId });
logDebug('Access token generated', { accessToken, ...accessTokens[accessToken] });
```

### 4. No Token Expiration
```javascript
// VULNERABILITY: No expiration check
if (!tokenData) {
  return res.status(401).json({ error: 'invalid_token' });
}
// Should check: if (now > tokenData.expires_at) { ... }
```

## Attack Scenarios

See `ATTACK_SCENARIOS.md` in the project root for detailed attack demonstrations.

## Educational Purpose

This vulnerable server helps demonstrate:
- How authorization code interception works
- Why PKCE is necessary
- The importance of state parameter
- Risks of weak redirect URI validation
- Impact of insecure token storage
- Consequences of information disclosure

## Comparison with Secure Version

Run the secure authorization server (`auth-server-secure`) to see how these vulnerabilities are properly mitigated with:
- Proper PKCE validation (S256)
- Required state parameter validation
- Strict redirect URI whitelist
- Password hashing
- Generic error messages
- Secure logging (no sensitive data)
- Token expiration enforcement
- Single-use authorization codes

## License

MIT - Educational purposes only
