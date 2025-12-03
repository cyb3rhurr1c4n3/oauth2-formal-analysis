# OAuth 2.0 Authorization Code Grant with PKCE - Educational Demo

## Overview

This project demonstrates the OAuth 2.0 Authorization Code Grant with PKCE (Proof Key for Code Exchange) flow through four applications:

- **auth-server-vulnerable**: An intentionally insecure authorization server
- **auth-server-secure**: A properly secured authorization server
- **client-app-vulnerable**: An insecure client application with multiple vulnerabilities
- **client-app-secure**: A properly secured client application

## What is OAuth 2.0 Authorization Code Grant with PKCE?

The Authorization Code Grant with PKCE is the recommended OAuth 2.0 flow for:
- Single Page Applications (SPAs)
- Mobile applications
- Any public client that cannot securely store a client secret

### The Flow

```
┌─────────┐                                           ┌──────────────┐
│         │                                           │              │
│  User   │                                           │ Auth Server  │
│         │                                           │              │
└────┬────┘                                           └──────┬───────┘
     │                                                       │
     │  1. Click "Login"                                    │
     │                                                       │
┌────▼────────────────────────────────┐                    │
│                                     │                    │
│  Client App                         │                    │
│                                     │                    │
│  2. Generate:                       │                    │
│     - code_verifier (random)        │                    │
│     - code_challenge = S256(verifier)│                   │
│     - state (anti-CSRF token)       │                    │
│                                     │                    │
└────┬────────────────────────────────┘                    │
     │                                                       │
     │  3. Redirect to /authorize with:                     │
     │     - client_id                                      │
     │     - redirect_uri                                   │
     │     - code_challenge                                 │
     │     - code_challenge_method=S256                     │
     │     - state                                          │
     ├──────────────────────────────────────────────────────▶
     │                                                       │
     │                                        4. Show login form
     │                                           User enters credentials
     │                                                       │
     │  5. Redirect back to redirect_uri with:              │
     │     - code (authorization code)                      │
     │     - state                                          │
     ◀──────────────────────────────────────────────────────┤
     │                                                       │
┌────▼────────────────────────────────┐                    │
│                                     │                    │
│  Client App                         │                    │
│                                     │                    │
│  6. Validate state parameter        │                    │
│                                     │                    │
│  7. Exchange code for token:        │                    │
│     POST /token with:               │                    │
│     - code                          │                    │
│     - code_verifier                 │                    │
│     - client_id                     │                    │
│     - redirect_uri                  │                    │
│     ├──────────────────────────────────────────────────▶ │
│     │                                                     │
│     │                               8. Verify:            │
│     │                                  - code is valid    │
│     │                                  - S256(code_verifier) == code_challenge
│     │                                  - redirect_uri matches
│     │                                                     │
│     │                               9. Return access_token│
│     ◀─────────────────────────────────────────────────── │
│                                     │                    │
│  10. Store token securely           │                    │
│                                     │                    │
└────┬────────────────────────────────┘                    │
     │                                                       │
     │  11. Request protected resource with access_token    │
     ├──────────────────────────────────────────────────────▶
     │                                                       │
     │  12. Return user info                                │
     ◀──────────────────────────────────────────────────────┤
     │                                                       │
```

### Key Security Features

1. **PKCE (Proof Key for Code Exchange)**:
   - Mitigates authorization code interception attacks
   - The `code_verifier` is never transmitted in the authorization request
   - Only the `code_challenge` (SHA256 hash) is sent
   - Attackers cannot use a stolen authorization code without the original `code_verifier`

2. **State Parameter**:
   - Prevents Cross-Site Request Forgery (CSRF) attacks
   - Client generates a random state value
   - Auth server returns it unchanged
   - Client validates it matches before accepting the authorization code

3. **Redirect URI Validation**:
   - Prevents open redirect vulnerabilities
   - Auth server must validate redirect_uri against pre-registered values
   - Prevents attackers from redirecting to malicious sites

## Vulnerabilities Demonstrated

### Vulnerable Versions

The vulnerable versions demonstrate these common security issues:

1. **Missing or Incorrect PKCE Implementation**
   - **Issue**: Not validating `code_verifier` against `code_challenge`
   - **Attack**: Authorization code interception attack
   - **Impact**: Attacker can steal authorization codes and exchange them for tokens

2. **Missing State Parameter Validation**
   - **Issue**: Not generating or validating the `state` parameter
   - **Attack**: CSRF attack / Authorization code injection
   - **Impact**: Attacker can force victim to authorize attacker's account

3. **Weak Redirect URI Validation**
   - **Issue**: Not validating or loosely validating `redirect_uri`
   - **Attack**: Open redirect vulnerability
   - **Impact**: Authorization codes leaked to attacker-controlled domains

4. **Insecure Token Storage**
   - **Issue**: Storing tokens in URL parameters or localStorage
   - **Attack**: Token theft via browser history, XSS, or malware
   - **Impact**: Account takeover

5. **Information Disclosure**
   - **Issue**: Logging sensitive information, exposing tokens in URLs
   - **Attack**: Token leakage via logs, referrer headers, browser history
   - **Impact**: Unauthorized access to user accounts

### Secure Versions

The secure versions implement proper mitigations:

1. **Correct PKCE Implementation**
   - Generate cryptographically random `code_verifier` (43-128 characters)
   - Compute `code_challenge = BASE64URL(SHA256(code_verifier))`
   - Server validates the verifier matches the challenge

2. **State Parameter Protection**
   - Generate cryptographically random `state` value
   - Store it securely on client (sessionStorage)
   - Validate it matches on callback

3. **Strict Redirect URI Validation**
   - Whitelist of allowed redirect URIs
   - Exact string matching (no wildcards)
   - Reject any non-matching URIs

4. **Secure Token Storage**
   - Never store tokens in URLs
   - Use in-memory storage or secure sessionStorage
   - Clear tokens on logout

5. **Secure Logging and Error Handling**
   - Never log tokens or sensitive data
   - Generic error messages to users
   - Detailed errors only in secure server logs

## Project Structure

```
oauth2-formal-analysis/
├── OAUTH2_PKCE_DEMO.md          # This file
├── ATTACK_SCENARIOS.md           # Detailed attack demonstrations
├── auth-server-vulnerable/       # Vulnerable authorization server
│   ├── server.js
│   ├── package.json
│   ├── public/
│   │   └── login.html
│   └── README.md
├── auth-server-secure/           # Secure authorization server
│   ├── server.js
│   ├── package.json
│   ├── public/
│   │   └── login.html
│   └── README.md
├── client-app-vulnerable/        # Vulnerable client application
│   ├── server.js
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   └── callback.html
│   └── README.md
└── client-app-secure/            # Secure client application
    ├── server.js
    ├── package.json
    ├── public/
    │   ├── index.html
    │   └── callback.html
    └── README.md
```

## Quick Start

### Prerequisites

- Node.js (LTS version 18.x or higher)
- npm (comes with Node.js)

### Running the Demo

Choose either vulnerable or secure versions to run:

#### Option 1: Run Vulnerable Versions

```bash
# Terminal 1 - Start vulnerable auth server
cd auth-server-vulnerable
npm install
npm start
# Runs on http://localhost:4000

# Terminal 2 - Start vulnerable client app
cd client-app-vulnerable
npm install
npm start
# Runs on http://localhost:3000

# Open browser to http://localhost:3000
```

#### Option 2: Run Secure Versions

```bash
# Terminal 1 - Start secure auth server
cd auth-server-secure
npm install
npm start
# Runs on http://localhost:4001

# Terminal 2 - Start secure client app
cd client-app-secure
npm install
npm start
# Runs on http://localhost:3001

# Open browser to http://localhost:3001
```

### Testing the Applications

1. Open the client application in your browser
2. Click "Login with Demo OAuth"
3. You'll be redirected to the authorization server
4. Login with credentials:
   - Username: `demo`
   - Password: `password123`
5. Authorize the application
6. You'll be redirected back to the client
7. The client will exchange the code for a token
8. User profile information will be displayed

## Comparing Vulnerable vs Secure

### Key Differences

| Feature | Vulnerable Version | Secure Version |
|---------|-------------------|----------------|
| PKCE Implementation | ❌ Missing or not validated | ✅ Properly implemented with S256 |
| State Parameter | ❌ Not used | ✅ Generated and validated |
| Redirect URI Validation | ❌ Weak or missing | ✅ Strict whitelist validation |
| Token Storage | ❌ URL params / insecure localStorage | ✅ In-memory or secure sessionStorage |
| Error Messages | ❌ Detailed, leak information | ✅ Generic, safe messages |
| Logging | ❌ Logs sensitive data | ✅ Never logs tokens |
| Code Validation | ❌ Weak checks | ✅ Strong validation with expiry |

## Educational Value

This demo is designed for:
- **Security researchers** learning OAuth 2.0 vulnerabilities
- **Developers** understanding proper OAuth 2.0 implementation
- **Students** studying web application security
- **Penetration testers** practicing OAuth 2.0 attack scenarios

⚠️ **WARNING**: The vulnerable versions contain intentional security flaws. Never use these patterns in production code!

## Further Reading

- [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://tools.ietf.org/html/rfc7636)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [OWASP OAuth 2.0 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

## License

This is an educational project. See LICENSE file for details.
