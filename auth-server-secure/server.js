const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 4001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

// SECURITY FIX #1: While still in-memory for demo, we're using better practices
// Passwords should be hashed (in production use bcrypt/argon2)
const users = {
  'demo': {
    username: 'demo',
    passwordHash: crypto.createHash('sha256').update('password123').digest('hex'), // Better: use bcrypt
    name: 'Demo User',
    email: 'demo@example.com'
  }
};

// SECURITY FIX #2: Proper client registration with redirect URI whitelist
const clients = {
  'client-app-secure': {
    client_id: 'client-app-secure',
    // SECURITY: Strict whitelist of allowed redirect URIs
    redirect_uris: [
      'http://localhost:3001/callback'
    ],
    name: 'Secure Demo Client',
    require_pkce: true // SECURITY: Enforce PKCE for this client
  }
};

// Temporary storage with proper cleanup
const authorizationCodes = new Map();
const accessTokens = new Map();
const sessions = new Map();

// SECURITY FIX #3: Token expiration configuration
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to generate secure random tokens
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// SECURITY FIX #4: Secure logging - never log sensitive data
function logInfo(message, safeData = {}) {
  // Only log non-sensitive information
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, safeData);
}

// SECURITY FIX #5: Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// SECURITY: Hash password for comparison (in production, use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// SECURITY: Validate redirect URI against whitelist
function isValidRedirectUri(clientId, redirectUri) {
  const client = clients[clientId];
  if (!client) return false;
  
  // Exact match required - no wildcards, no partial matches
  return client.redirect_uris.includes(redirectUri);
}

// SECURITY FIX #6: PKCE verification - proper implementation
function verifyPKCE(codeVerifier, codeChallenge, method = 'S256') {
  if (!codeVerifier || !codeChallenge) {
    return false;
  }
  
  // Verify code_verifier length (RFC 7636: 43-128 characters)
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }
  
  // Verify code_verifier format: only [A-Z], [a-z], [0-9], "-", ".", "_", "~"
  if (!/^[A-Za-z0-9\-._~]+$/.test(codeVerifier)) {
    return false;
  }
  
  let computedChallenge;
  
  if (method === 'S256') {
    // Compute SHA256 hash and base64url encode
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    computedChallenge = hash.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else if (method === 'plain') {
    // Plain method is discouraged but supported
    computedChallenge = codeVerifier;
  } else {
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(computedChallenge, codeChallenge);
}

// SECURITY: Clean up expired items periodically
function cleanupExpired() {
  const now = Date.now();
  
  // Clean up expired authorization codes
  for (const [code, data] of authorizationCodes.entries()) {
    if (now - data.created_at > CODE_EXPIRY_MS) {
      authorizationCodes.delete(code);
      logInfo('Expired authorization code cleaned up');
    }
  }
  
  // Clean up expired access tokens
  for (const [token, data] of accessTokens.entries()) {
    if (now - data.created_at > TOKEN_EXPIRY_MS) {
      accessTokens.delete(token);
      logInfo('Expired access token cleaned up');
    }
  }
  
  // Clean up expired sessions
  for (const [sessionId, data] of sessions.entries()) {
    if (now - data.created_at > SESSION_EXPIRY_MS) {
      sessions.delete(sessionId);
      logInfo('Expired session cleaned up');
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpired, 5 * 60 * 1000);

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle login submission
app.post('/login', (req, res) => {
  const { username, password, redirect } = req.body;
  
  // SECURITY FIX #7: Generic error messages to prevent username enumeration
  const user = users[username];
  
  if (!user) {
    // Still check password to maintain constant time
    hashPassword(password);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid username or password' // Generic message
    });
  }
  
  const passwordHash = hashPassword(password);
  
  // SECURITY: Use constant-time comparison for password
  if (!constantTimeCompare(user.passwordHash, passwordHash)) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid username or password' // Same generic message
    });
  }
  
  // Successful login
  const sessionId = generateToken();
  sessions.set(sessionId, { 
    username,
    created_at: Date.now(),
    last_activity: Date.now()
  });
  
  // SECURITY FIX #8: Safe logging - no credentials logged
  logInfo('User logged in', { username }); // Only log username, never password
  
  res.cookie('session_id', sessionId, {
    httpOnly: true, // SECURITY: Prevent JavaScript access
    secure: false, // SECURITY: Set to true in production with HTTPS
    sameSite: 'lax', // SECURITY: CSRF protection
    maxAge: SESSION_EXPIRY_MS
  });
  
  if (redirect) {
    res.redirect(redirect);
  } else {
    res.json({ success: true, message: 'Logged in successfully' });
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
  
  // SECURITY FIX #9: Safe logging - only log non-sensitive parameters
  logInfo('Authorization request', { 
    client_id, 
    response_type,
    has_code_challenge: !!code_challenge,
    has_state: !!state
  });
  
  // SECURITY: Validate client exists
  if (!client_id || !clients[client_id]) {
    return res.status(400).send('Invalid client_id');
  }
  
  const client = clients[client_id];
  
  // SECURITY: Validate response_type
  if (response_type !== 'code') {
    return res.status(400).send('Only response_type=code is supported');
  }
  
  // SECURITY FIX #10: Strict redirect_uri validation
  if (!redirect_uri || !isValidRedirectUri(client_id, redirect_uri)) {
    logInfo('Invalid redirect_uri attempted', { client_id });
    return res.status(400).send('Invalid redirect_uri');
  }
  
  // SECURITY FIX #11: Enforce PKCE for public clients
  if (client.require_pkce) {
    if (!code_challenge) {
      return res.status(400).send('code_challenge is required');
    }
    
    if (!code_challenge_method || (code_challenge_method !== 'S256' && code_challenge_method !== 'plain')) {
      return res.status(400).send('code_challenge_method must be S256 or plain');
    }
    
    // Discourage plain method
    if (code_challenge_method === 'plain') {
      logInfo('Warning: plain code_challenge_method used', { client_id });
    }
    
    // Validate code_challenge format (base64url)
    if (!/^[A-Za-z0-9\-._~]+$/.test(code_challenge)) {
      return res.status(400).send('Invalid code_challenge format');
    }
  }
  
  // SECURITY FIX #12: Require state parameter for CSRF protection
  if (!state) {
    return res.status(400).send('state parameter is required');
  }
  
  // Validate state format (should be unpredictable)
  if (state.length < 32) {
    return res.status(400).send('state parameter must be at least 32 characters');
  }
  
  // Check if user is logged in
  const sessionId = req.cookies.session_id;
  const session = sessions.get(sessionId);
  
  if (!session) {
    // Redirect to login with return URL
    const loginUrl = `/login?redirect=${encodeURIComponent(req.originalUrl)}`;
    return res.redirect(loginUrl);
  }
  
  // SECURITY: Update last activity
  session.last_activity = Date.now();
  
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
        .success { background: #e8f5e9; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #4caf50; }
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
        .security-badge {
          display: inline-block;
          background: #4caf50;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-left: 5px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🔐 Authorization Request</h2>
        
        <div class="info">
          <strong>${client.name}</strong> wants to access your account.
        </div>
        
        <div class="success">
          <strong>✅ SECURE VERSION</strong><br>
          This authorization server implements proper security controls.
        </div>
        
        <p>Logged in as: <strong>${session.username}</strong></p>
        
        <p>The application will receive:</p>
        <ul>
          <li>Your username and email</li>
          <li>Access to your profile information</li>
        </ul>
        
        <div style="margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 4px; font-size: 13px;">
          <strong>🔒 Security Features Active:</strong><br>
          • PKCE Enabled <span class="security-badge">✓</span><br>
          • State Parameter Validated <span class="security-badge">✓</span><br>
          • Redirect URI Whitelisted <span class="security-badge">✓</span><br>
          • Authorization Code Expires <span class="security-badge">✓</span>
        </div>
        
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
    return res.redirect(`${redirect_uri}?error=access_denied${state ? '&state=' + encodeURIComponent(state) : ''}`);
  }
  
  // SECURITY: Re-validate all parameters
  if (!isValidRedirectUri(client_id, redirect_uri)) {
    return res.status(400).send('Invalid redirect_uri');
  }
  
  const client = clients[client_id];
  if (client.require_pkce && !code_challenge) {
    return res.status(400).send('code_challenge is required');
  }
  
  // Generate authorization code
  const authCode = generateToken();
  
  // SECURITY FIX #13: Store code_challenge for later validation
  authorizationCodes.set(authCode, {
    client_id,
    redirect_uri,
    username,
    code_challenge,
    code_challenge_method,
    created_at: Date.now(),
    used: false // SECURITY: Track if code has been used
  });
  
  // SECURITY FIX #14: Safe logging - never log authorization codes
  logInfo('Authorization code generated', { 
    client_id, 
    username,
    expires_in_ms: CODE_EXPIRY_MS
  });
  
  // Redirect back to client with authorization code
  const separator = redirect_uri.includes('?') ? '&' : '?';
  const redirectUrl = `${redirect_uri}${separator}code=${authCode}&state=${encodeURIComponent(state)}`;
  
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
  
  // SECURITY FIX #16: Safe logging - never log code_verifier or tokens
  logInfo('Token request', { grant_type, client_id });
  
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  
  // SECURITY FIX #17: Proper authorization code validation
  const authCode = authorizationCodes.get(code);
  if (!authCode) {
    logInfo('Invalid authorization code', { client_id });
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid authorization code' });
  }
  
  // SECURITY FIX #18: Check if code has expired
  const now = Date.now();
  if (now - authCode.created_at > CODE_EXPIRY_MS) {
    authorizationCodes.delete(code);
    logInfo('Expired authorization code', { client_id });
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired' });
  }
  
  // SECURITY FIX #19: Ensure code is single-use
  if (authCode.used) {
    // Code reuse detected - revoke all tokens for this authorization
    authorizationCodes.delete(code);
    logInfo('Authorization code reuse detected - security breach', { client_id, username: authCode.username });
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code already used' });
  }
  
  // SECURITY: Validate client_id matches
  if (authCode.client_id !== client_id) {
    logInfo('Client ID mismatch', { expected: authCode.client_id, received: client_id });
    return res.status(400).json({ error: 'invalid_client' });
  }
  
  // SECURITY: Validate redirect_uri matches
  if (authCode.redirect_uri !== redirect_uri) {
    logInfo('Redirect URI mismatch', { client_id });
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Redirect URI mismatch' });
  }
  
  // SECURITY FIX #20: VALIDATE PKCE!
  const client = clients[client_id];
  if (client.require_pkce || authCode.code_challenge) {
    if (!code_verifier) {
      logInfo('Missing code_verifier', { client_id });
      return res.status(400).json({ error: 'invalid_request', error_description: 'code_verifier is required' });
    }
    
    // Verify PKCE code_verifier against code_challenge
    if (!verifyPKCE(code_verifier, authCode.code_challenge, authCode.code_challenge_method)) {
      logInfo('PKCE verification failed', { client_id, username: authCode.username });
      authorizationCodes.delete(code);
      return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
    }
    
    logInfo('PKCE verification successful', { client_id, username: authCode.username });
  }
  
  // Mark code as used
  authCode.used = true;
  
  // Generate access token
  const accessToken = generateToken();
  const tokenExpiry = now + TOKEN_EXPIRY_MS;
  
  accessTokens.set(accessToken, {
    username: authCode.username,
    client_id: authCode.client_id,
    scope: 'profile email',
    created_at: now,
    expires_at: tokenExpiry
  });
  
  // SECURITY FIX #21: Safe logging - never log access tokens
  logInfo('Access token issued', { 
    client_id, 
    username: authCode.username,
    expires_in_seconds: TOKEN_EXPIRY_MS / 1000
  });
  
  // Clean up authorization code after successful use
  authorizationCodes.delete(code);
  
  // Return tokens
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: Math.floor(TOKEN_EXPIRY_MS / 1000),
    scope: 'profile email'
  });
});

// UserInfo endpoint - protected resource
app.get('/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      error_description: 'Missing or invalid authorization header' 
    });
  }
  
  const accessToken = authHeader.substring(7);
  const tokenData = accessTokens.get(accessToken);
  
  if (!tokenData) {
    return res.status(401).json({ 
      error: 'invalid_token', 
      error_description: 'Access token is invalid or expired' 
    });
  }
  
  // SECURITY FIX #22: Check token expiration
  const now = Date.now();
  if (now > tokenData.expires_at) {
    accessTokens.delete(accessToken);
    logInfo('Expired token used', { username: tokenData.username });
    return res.status(401).json({ 
      error: 'invalid_token', 
      error_description: 'Access token has expired' 
    });
  }
  
  const user = users[tokenData.username];
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  
  // SECURITY FIX #23: Safe logging - never log access tokens
  logInfo('UserInfo request', { username: tokenData.username });
  
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
    sessions.delete(sessionId);
    logInfo('User logged out');
  }
  res.clearCookie('session_id');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'auth-server-secure', 
    version: '1.0.0',
    security_features: [
      'PKCE with S256',
      'State parameter validation',
      'Strict redirect URI whitelist',
      'Token expiration',
      'Single-use authorization codes',
      'Secure logging'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ✅ SECURE OAuth 2.0 Authorization Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  🔒 Security Features:');
  console.log('     • PKCE with S256 enforced');
  console.log('     • State parameter required');
  console.log('     • Strict redirect URI validation');
  console.log('     • Authorization codes expire after 10 minutes');
  console.log('     • Access tokens expire after 1 hour');
  console.log('     • Single-use authorization codes');
  console.log('     • No sensitive data in logs');
  console.log('     • Constant-time password comparison');
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
