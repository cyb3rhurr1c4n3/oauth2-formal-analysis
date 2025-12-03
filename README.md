# OAuth 2.0 Authorization Code Grant with PKCE - Educational Demo

A comprehensive educational project demonstrating OAuth 2.0 security vulnerabilities and their mitigations through four complete applications: vulnerable and secure versions of both an authorization server and a client application.

## 🎯 Project Overview

This project implements the **OAuth 2.0 Authorization Code Grant with PKCE** flow in JavaScript (Node.js + Express) with two complete sets of applications:

### Vulnerable Versions (Educational - Show What NOT to Do)
- **auth-server-vulnerable** - Authorization server with intentional security flaws
- **client-app-vulnerable** - Client application with common OAuth mistakes

### Secure Versions (Best Practices Implementation)
- **auth-server-secure** - Properly secured authorization server
- **client-app-secure** - Secure client with PKCE and proper token handling

## 🚀 Quick Start

👉 **New to this project?** Start with [GETTING_STARTED.md](GETTING_STARTED.md) for a guided learning path!

### Prerequisites

- **Node.js** 18.x or higher (LTS version)
- **npm** (comes with Node.js)
- A modern web browser (Chrome, Firefox, Edge, Safari)

### Installation & Running

#### Option 1: Run Vulnerable Versions (for learning about attacks)

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

#### Option 2: Run Secure Versions (for learning proper implementation)

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

### Test Credentials

For both versions:
- **Username:** `demo`
- **Password:** `password123`

## 📚 Documentation

- **[OAUTH2_PKCE_DEMO.md](OAUTH2_PKCE_DEMO.md)** - Comprehensive guide to OAuth 2.0 with PKCE
- **[ATTACK_SCENARIOS.md](ATTACK_SCENARIOS.md)** - Detailed attack demonstrations with step-by-step reproduction
- **[auth-server-vulnerable/README.md](auth-server-vulnerable/README.md)** - Vulnerable authorization server documentation
- **[auth-server-secure/README.md](auth-server-secure/README.md)** - Secure authorization server documentation
- **[client-app-vulnerable/README.md](client-app-vulnerable/README.md)** - Vulnerable client application documentation
- **[client-app-secure/README.md](client-app-secure/README.md)** - Secure client application documentation

## 🔒 Security Features Comparison

| Feature | Vulnerable Version | Secure Version |
|---------|-------------------|----------------|
| **PKCE Implementation** | ❌ Not validated | ✅ S256 method enforced |
| **State Parameter** | ❌ Optional/not checked | ✅ Required & validated |
| **Redirect URI Validation** | ❌ Accepts any URI | ✅ Strict whitelist |
| **Token Storage** | ❌ localStorage (XSS vulnerable) | ✅ Server-side sessions |
| **Code in URL** | ❌ Visible in browser history | ✅ Server-side processing |
| **Sensitive Data Logging** | ❌ Logs tokens/codes | ✅ Safe logging only |
| **Password Storage** | ❌ Plain text | ✅ Hashed (SHA-256) |
| **Error Messages** | ❌ Detailed (info disclosure) | ✅ Generic & safe |
| **Token Expiration** | ❌ Never expires | ✅ 1 hour (enforced) |
| **Code Expiration** | ❌ Never expires | ✅ 10 minutes |
| **Code Reuse** | ❌ Allowed | ✅ Single-use only |
| **Token Exchange** | ❌ Client-side | ✅ Server-side |

## 🎓 Learning Objectives

This project teaches:

### 1. **OAuth 2.0 Flow Understanding**
- Authorization Code Grant flow mechanics
- Role of authorization codes vs access tokens
- Client and server responsibilities

### 2. **PKCE (Proof Key for Code Exchange)**
- Why PKCE is critical for public clients
- How code_verifier and code_challenge work
- S256 cryptographic challenge generation

### 3. **Common Vulnerabilities**
- Authorization code interception attacks
- CSRF via missing state parameter
- Open redirect vulnerabilities
- Token theft via XSS and localStorage
- Information disclosure through logging

### 4. **Security Best Practices**
- Proper PKCE implementation
- State parameter for CSRF protection
- Strict redirect URI validation
- Server-side token storage
- Secure logging practices
- Token expiration and validation

### 5. **Attack & Defense**
- How to exploit vulnerable implementations
- Why each mitigation is necessary
- Defense-in-depth strategies

## 🛡️ Vulnerabilities Demonstrated

The vulnerable versions demonstrate:

1. **No PKCE Validation** - Authorization code interception
2. **Missing State Parameter** - CSRF and authorization code injection
3. **Weak Redirect URI Validation** - Open redirect attacks
4. **Insecure Token Storage** - XSS-based token theft
5. **Tokens in URLs** - Browser history leakage
6. **Sensitive Data Logging** - Token exposure in logs
7. **No Token Expiration** - Indefinite token validity
8. **Plain Text Passwords** - Credential compromise
9. **Information Disclosure** - Username enumeration
10. **Timing Attacks** - Username validation timing differences

## 🔍 Attack Demonstrations

See [ATTACK_SCENARIOS.md](ATTACK_SCENARIOS.md) for detailed, step-by-step reproduction of:

- **Attack #1:** Authorization Code Interception (No PKCE)
- **Attack #2:** CSRF / Authorization Code Injection (No State)
- **Attack #3:** Open Redirect via Weak Redirect URI Validation
- **Attack #4:** Token Theft via XSS (localStorage)
- **Attack #5:** Token Leakage via Browser History
- **Attack #6:** Token Leakage via Logging

Each attack includes:
- Prerequisites and setup
- Step-by-step exploitation
- Why it works on vulnerable version
- How secure version prevents it

## 📁 Project Structure

```
oauth2-formal-analysis/
├── README.md                      # This file
├── OAUTH2_PKCE_DEMO.md           # Comprehensive OAuth 2.0 guide
├── ATTACK_SCENARIOS.md            # Detailed attack demonstrations
│
├── auth-server-vulnerable/        # Vulnerable authorization server
│   ├── server.js                  # Express server with vulnerabilities
│   ├── package.json
│   ├── public/
│   │   └── login.html            # Login page
│   └── README.md
│
├── auth-server-secure/            # Secure authorization server
│   ├── server.js                  # Express server with security best practices
│   ├── package.json
│   ├── public/
│   │   └── login.html            # Secure login page
│   └── README.md
│
├── client-app-vulnerable/         # Vulnerable client application
│   ├── server.js                  # Minimal Express server
│   ├── package.json
│   ├── public/
│   │   ├── index.html            # Main page with OAuth flow
│   │   └── callback.html         # OAuth callback handler
│   └── README.md
│
└── client-app-secure/             # Secure client application
    ├── server.js                  # Express server with proper OAuth
    ├── package.json
    ├── public/
    │   ├── index.html            # Main page
    │   └── callback.html         # Minimal callback page
    └── README.md
```

## 🎯 Use Cases

This project is designed for:

- **Security Researchers** - Understanding OAuth 2.0 vulnerabilities
- **Developers** - Learning proper OAuth 2.0 implementation
- **Students** - Studying web application security
- **Penetration Testers** - Practicing OAuth 2.0 attack scenarios
- **Educators** - Teaching OAuth 2.0 security concepts
- **Security Auditors** - Understanding what to look for in code reviews

## ⚠️ Important Warnings

### For Vulnerable Versions

**🚨 WARNING:** The vulnerable versions contain intentional security flaws. They are for educational purposes only.

**NEVER:**
- Use vulnerable patterns in production code
- Deploy these applications to public servers
- Use them with real user credentials
- Use them with production OAuth providers

### For Secure Versions

While the secure versions implement proper security practices, they are still educational demos:

**For Production Use, Also Implement:**
- HTTPS everywhere (set `secure: true` for cookies)
- Proper database instead of in-memory storage
- bcrypt/Argon2 for password hashing (not SHA-256)
- Rate limiting on authentication endpoints
- CORS configuration for APIs
- Content Security Policy (CSP) headers
- Refresh token rotation
- Client authentication for confidential clients
- Comprehensive error handling
- Monitoring and alerting
- Regular security audits

## 🔧 Technical Stack

- **Backend:** Node.js 18+ with Express.js
- **Frontend:** Plain HTML/CSS/JavaScript (no frameworks)
- **Sessions:** express-session (secure version)
- **Cryptography:** Node.js crypto module
- **HTTP Client:** Fetch API

## 📖 Educational Flow

### Recommended Learning Path

1. **Read [OAUTH2_PKCE_DEMO.md](OAUTH2_PKCE_DEMO.md)** - Understand the OAuth 2.0 flow
2. **Run vulnerable versions** - See how insecure OAuth works
3. **Try attacks from [ATTACK_SCENARIOS.md](ATTACK_SCENARIOS.md)** - Exploit vulnerabilities
4. **Run secure versions** - See proper implementation
5. **Try same attacks on secure versions** - Understand why they fail
6. **Compare code side-by-side** - Learn specific fixes
7. **Review comments in code** - Understand the "why" behind each practice

### Key Code Comparisons

Compare these files to see the differences:

**Authorization Servers:**
- `auth-server-vulnerable/server.js` vs `auth-server-secure/server.js`

**Client Applications:**
- `client-app-vulnerable/public/index.html` vs `client-app-secure/public/index.html`
- `client-app-vulnerable/public/callback.html` vs `client-app-secure/public/callback.html`
- `client-app-vulnerable/server.js` vs `client-app-secure/server.js`

## 🧪 Testing the Applications

### Basic Functionality Test

1. Start auth server and client
2. Click "Login with Demo OAuth"
3. Enter credentials (demo/password123)
4. Authorize the application
5. Verify user profile displays

### Security Feature Verification

**For Vulnerable Version:**
- Check browser console - see tokens logged
- Check browser history - see authorization code in URL
- Check localStorage - `localStorage.getItem('access_token')`
- Check server logs - see all sensitive data

**For Secure Version:**
- Check browser console - no sensitive data
- Check browser history - clean URLs only
- Try localStorage - token not there
- Check server logs - safe logging only

## 📚 Further Reading

- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP OAuth 2.0 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

## 🤝 Contributing

This is an educational project. If you find issues or have suggestions for additional vulnerabilities to demonstrate, please feel free to contribute.

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

This project is for educational purposes. Use at your own risk.

## 🙏 Acknowledgments

This project was created to help developers understand OAuth 2.0 security. It demonstrates both common mistakes and proper implementations to provide a comprehensive learning experience.

**Remember:** Security is not a feature you can add later. It must be built in from the start. Always use PKCE, always validate state, always protect your tokens, and always follow security best practices.

---

**Happy Learning! 🎓🔒**

For questions or issues, please check the documentation files or review the detailed comments in the source code.

A Comprehensive Formal Security Analysis of OAuth 2.0
