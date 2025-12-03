const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 4000;

// VULNERABILITY: Permissive CORS configuration
// This allows any origin to make requests, which is insecure
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

// VULNERABILITY #1: In-memory storage is fine for demo, but we're storing sensitive data insecurely
// In production, this should be in a proper database with encryption
const users = {
  'demo': {
    username: 'demo',
    password: 'password123', // VULNERABILITY: Plain text password storage
    name: 'Demo User',
    email: 'demo@example.com'
  },
  'attacker': {
    username: 'attacker',
    password: 'evil123',
    name: 'Attacker Account',
    email: 'attacker@evil.com'
  },
  'victim': {
    username: 'victim',
    password: 'victim123',
    name: 'Victim User',
    email: 'victim@innocent.com'
  }
};

// VULNERABILITY #2: Loose client registration - no client secret validation
// This makes it trivial for attackers to impersonate clients
const clients = {
  'client-app-vulnerable': {
    client_id: 'client-app-vulnerable',
    // VULNERABILITY: No redirect URI whitelist - accepts ANY redirect_uri
    // This allows open redirect attacks
    redirect_uris: [], // Empty array means we'll accept anything!
    name: 'Vulnerable Demo Client'
  }
};

// Temporary storage for authorization codes and tokens
// VULNERABILITY #3: No expiration mechanism for codes or tokens
const authorizationCodes = {};
const accessTokens = {};
const sessions = {};

// Helper function to generate tokens
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// VULNERABILITY #4: Logging sensitive information
// Tokens and codes should NEVER be logged
function logDebug(message, data) {
  console.log(`[DEBUG] ${message}`, JSON.stringify(data, null, 2));
}

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle login submission
app.post('/login', (req, res) => {
  const { username, password, redirect } = req.body;
  
  // VULNERABILITY #5: Timing attack - different response times for valid vs invalid usernames
  // Should use constant-time comparison
  const user = users[username];
  
  if (user && user.password === password) {
    const sessionId = generateToken();
    sessions[sessionId] = { username };
    
    // VULNERABILITY #6: Logging credentials!
    logDebug('User logged in', { username, password, sessionId });
    
    res.cookie('session_id', sessionId);
    
    if (redirect) {
      res.redirect(redirect);
    } else {
      res.json({ success: true, message: 'Logged in successfully' });
    }
  } else {
    // VULNERABILITY #7: Information disclosure - tells attacker if username exists
    if (!user) {
      res.status(401).json({ success: false, message: 'Username does not exist' });
    } else {
      res.status(401).json({ success: false, message: 'Incorrect password' });
    }
  }
});

// OAuth 2.0 Authorization endpoint
app.get('/authorize', (req, res) => {
  const {
    client_id,
    redirect_uri,
    response_type,
    code_challenge,
    code_challenge_method,
    state,
    scope
  } = req.query;
  
  // VULNERABILITY #8: Logging authorization request with sensitive parameters
  logDebug('Authorization request received', req.query);
  
  // VULNERABILITY #9: Minimal validation - only checking if client_id exists
  // Not validating redirect_uri against whitelist
  if (!client_id || !clients[client_id]) {
    return res.status(400).send('Invalid client_id');
  }
  
  if (response_type !== 'code') {
    return res.status(400).send('Only response_type=code is supported');
  }
  
  // VULNERABILITY #10: Not validating redirect_uri at all!
  // This allows attacker to set redirect_uri to their own domain
  if (!redirect_uri) {
    return res.status(400).send('redirect_uri is required');
  }
  
  // VULNERABILITY #11: Not requiring or validating PKCE parameters
  // PKCE is optional in this vulnerable version - defeating its purpose
  if (!code_challenge) {
    console.log('WARNING: No code_challenge provided - PKCE not used!');
  }
  
  // VULNERABILITY #12: Not validating state parameter
  // This leaves the flow vulnerable to CSRF attacks
  if (!state) {
    console.log('WARNING: No state parameter provided - CSRF protection missing!');
  }
  
  // Check if user is logged in
  const sessionId = req.cookies.session_id;
  const session = sessions[sessionId];
  
  if (!session) {
    // Redirect to login with return URL
    const loginUrl = `/login?redirect=${encodeURIComponent(req.originalUrl)}`;
    return res.redirect(loginUrl);
  }
  
  // User is logged in, show authorization prompt
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authorize Application</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .card {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h2 { color: #333; margin-top: 0; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .danger { background: #f8d7da; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #dc3545; }
        button {
          background: #4CAF50;
          color: white;
          padding: 12px 30px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-right: 10px;
        }
        button.deny {
          background: #f44336;
        }
        button:hover { opacity: 0.9; }
        .debug { 
          background: #f0f0f0; 
          padding: 10px; 
          border-radius: 4px; 
          font-family: monospace;
          font-size: 12px;
          margin-top: 20px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🔐 Authorization Request</h2>
        
        <div class="info">
          <strong>${clients[client_id].name}</strong> wants to access your account.
        </div>
        
        <div class="warning">
          <strong>⚠️ VULNERABLE VERSION</strong><br>
          This authorization server has security vulnerabilities for educational purposes.
        </div>
        
        <div class="danger">
          <strong>🚨 Security Issues Detected:</strong><br>
          ${!code_challenge ? '• PKCE not used (no code_challenge)<br>' : ''}
          ${!state ? '• No state parameter (CSRF vulnerable)<br>' : ''}
          ${code_challenge ? '• PKCE parameters present but NOT validated by server<br>' : ''}
          • Redirect URI not validated against whitelist<br>
          • Authorization code doesn't expire
        </div>
        
        <p>Logged in as: <strong>${session.username}</strong></p>
        
        <p>The application will receive:</p>
        <ul>
          <li>Your username and email</li>
          <li>Access to your profile information</li>
        </ul>
        
        <form action="/authorize/confirm" method="POST">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="code_challenge" value="${code_challenge || ''}">
          <input type="hidden" name="code_challenge_method" value="${code_challenge_method || ''}">
          <input type="hidden" name="state" value="${state || ''}">
          <input type="hidden" name="username" value="${session.username}">
          <button type="submit" name="action" value="allow">Allow</button>
          <button type="submit" name="action" value="deny" class="deny">Deny</button>
        </form>
        
        <div class="debug">
          <strong>Debug Info (VULNERABILITY: Exposing internal parameters):</strong><br>
          Client ID: ${client_id}<br>
          Redirect URI: ${redirect_uri}<br>
          Code Challenge: ${code_challenge || 'NOT PROVIDED'}<br>
          Challenge Method: ${code_challenge_method || 'N/A'}<br>
          State: ${state || 'NOT PROVIDED'}<br>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Handle authorization confirmation
app.post('/authorize/confirm', (req, res) => {
  const {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
    username,
    action
  } = req.body;
  
  if (action !== 'allow') {
    return res.redirect(`${redirect_uri}?error=access_denied${state ? '&state=' + state : ''}`);
  }
  
  // Generate authorization code
  const authCode = generateToken();
  
  // VULNERABILITY #13: Storing code_challenge but will NOT validate it later
  // This defeats the entire purpose of PKCE
  authorizationCodes[authCode] = {
    client_id,
    redirect_uri,
    username,
    code_challenge, // Stored but not validated!
    code_challenge_method,
    created_at: Date.now()
    // VULNERABILITY: No expiration time set or checked
  };
  
  // VULNERABILITY #14: Logging the authorization code!
  logDebug('Authorization code generated', { authCode, ...authorizationCodes[authCode] });
  
  // Redirect back to client with authorization code
  const separator = redirect_uri.includes('?') ? '&' : '?';
  const redirectUrl = `${redirect_uri}${separator}code=${authCode}${state ? '&state=' + state : ''}`;
  
  // VULNERABILITY #15: Logging the full redirect URL with authorization code
  logDebug('Redirecting to client', { redirectUrl });
  
  res.redirect(redirectUrl);
});

// Token endpoint
app.post('/token', (req, res) => {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    code_verifier
  } = req.body;
  
  // VULNERABILITY #16: Logging token request with sensitive data
  logDebug('Token request received', req.body);
  
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  
  // VULNERABILITY #17: Weak authorization code validation
  const authCode = authorizationCodes[code];
  if (!authCode) {
    return res.status(400).json({ error: 'invalid_grant' });
  }
  
  // VULNERABILITY #18: Not checking if code has already been used
  // Authorization codes should be single-use only
  // In a secure implementation, we would delete the code after first use
  
  // VULNERABILITY #19: Not validating client_id matches
  if (authCode.client_id !== client_id) {
    return res.status(400).json({ error: 'invalid_client' });
  }
  
  // VULNERABILITY #20: Not validating redirect_uri matches
  if (authCode.redirect_uri !== redirect_uri) {
    return res.status(400).json({ error: 'invalid_grant' });
  }
  
  // VULNERABILITY #21: NOT VALIDATING PKCE!
  // This is the critical vulnerability - we stored code_challenge but never verify it
  // An attacker who intercepts the authorization code can use it without knowing the code_verifier
  if (authCode.code_challenge && !code_verifier) {
    console.log('WARNING: code_challenge was provided during authorization but no code_verifier in token request');
    // In vulnerable version, we just log a warning but still issue the token!
  }
  
  if (authCode.code_challenge && code_verifier) {
    console.log('PKCE parameters present but NOT validated - token issued anyway!');
    // VULNERABILITY: We should verify that SHA256(code_verifier) === code_challenge
    // But in this vulnerable version, we skip this check entirely
  }
  
  // Generate access token
  const accessToken = generateToken();
  accessTokens[accessToken] = {
    username: authCode.username,
    client_id: authCode.client_id,
    scope: 'profile email',
    created_at: Date.now()
    // VULNERABILITY: No expiration time
  };
  
  // VULNERABILITY #22: Logging access token!
  logDebug('Access token generated', { accessToken, ...accessTokens[accessToken] });
  
  // Return tokens
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600, // Says 1 hour but we don't actually enforce expiration
    scope: 'profile email'
  });
});

// UserInfo endpoint - protected resource
app.get('/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid authorization header' });
  }
  
  const accessToken = authHeader.substring(7);
  const tokenData = accessTokens[accessToken];
  
  if (!tokenData) {
    return res.status(401).json({ error: 'invalid_token', message: 'Access token is invalid or expired' });
  }
  
  // VULNERABILITY #23: Not checking token expiration
  // Even though we set expires_in, we never actually expire tokens
  
  const user = users[tokenData.username];
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  
  // VULNERABILITY #24: Logging access token on every API request
  logDebug('UserInfo request', { accessToken, username: tokenData.username });
  
  // Return user info
  res.json({
    sub: user.username,
    name: user.name,
    email: user.email,
    email_verified: true
  });
});

// Logout endpoint
app.post('/logout', (req, res) => {
  const sessionId = req.cookies.session_id;
  if (sessionId) {
    delete sessions[sessionId];
  }
  res.clearCookie('session_id');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'auth-server-vulnerable', version: '1.0.0' });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🚨 VULNERABLE OAuth 2.0 Authorization Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  ⚠️  WARNING: This server contains intentional security');
  console.log('      vulnerabilities for educational purposes only.');
  console.log('      DO NOT use this code in production!');
  console.log('');
  console.log('  Endpoints:');
  console.log(`    • Authorization: http://localhost:${PORT}/authorize`);
  console.log(`    • Token:         http://localhost:${PORT}/token`);
  console.log(`    • UserInfo:      http://localhost:${PORT}/userinfo`);
  console.log(`    • Login:         http://localhost:${PORT}/login`);
  console.log('');
  console.log('  Test credentials:');
  console.log('    Username: demo');
  console.log('    Password: password123');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});
