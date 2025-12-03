const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3001;

// SECURITY FIX #1: Using server-side sessions instead of client-side storage
app.use(session({
  secret: crypto.randomBytes(32).toString('hex'), // Random secret on each restart (for demo)
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // SECURITY: Prevent JavaScript access
    secure: false, // SECURITY: Set to true in production with HTTPS
    sameSite: 'lax', // SECURITY: CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OAuth 2.0 configuration
const OAUTH_CONFIG = {
  client_id: 'client-app-secure',
  authorization_endpoint: 'http://localhost:4001/authorize',
  token_endpoint: 'http://localhost:4001/token',
  userinfo_endpoint: 'http://localhost:4001/userinfo',
  redirect_uri: 'http://localhost:3001/callback'
};

// SECURITY: Helper to generate PKCE verifier and challenge
function generatePKCE() {
  // SECURITY: Generate cryptographically secure random code_verifier
  // RFC 7636: code_verifier must be 43-128 characters
  const verifier = crypto.randomBytes(32).toString('base64url'); // Base64url encoding
  
  // SECURITY: Compute code_challenge using S256 method
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

// SECURITY: Generate secure random state parameter
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

// SECURITY: Safe logging - never log sensitive data
function logInfo(message, safeData = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, safeData);
}

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to check login status
app.get('/api/status', (req, res) => {
  if (req.session.user) {
    res.json({
      logged_in: true,
      user: req.session.user
    });
  } else {
    res.json({ logged_in: false });
  }
});

// SECURITY FIX #2: Server-side OAuth initiation
app.get('/api/login', (req, res) => {
  // Generate PKCE parameters
  const pkce = generatePKCE();
  
  // Generate state parameter for CSRF protection
  const state = generateState();
  
  // SECURITY: Store PKCE verifier and state in server-side session
  // These never leave the server
  req.session.oauth = {
    state: state,
    code_verifier: pkce.code_verifier,
    initiated_at: Date.now()
  };
  
  // SECURITY: Safe logging - only log that login was initiated
  logInfo('OAuth login initiated', { 
    has_state: true,
    has_pkce: true
  });
  
  // Build authorization URL
  const authUrl = new URL(OAUTH_CONFIG.authorization_endpoint);
  authUrl.searchParams.set('client_id', OAUTH_CONFIG.client_id);
  authUrl.searchParams.set('redirect_uri', OAUTH_CONFIG.redirect_uri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', pkce.code_challenge);
  authUrl.searchParams.set('code_challenge_method', pkce.code_challenge_method);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'profile email');
  
  // Return the authorization URL to the client
  res.json({ authorization_url: authUrl.toString() });
});

// SECURITY FIX #3: Server-side callback handler
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  // SECURITY: Safe logging - never log the authorization code
  logInfo('OAuth callback received', {
    has_code: !!code,
    has_state: !!state,
    has_error: !!error
  });
  
  if (error) {
    logInfo('OAuth authorization denied', { error });
    return res.redirect('/?error=' + encodeURIComponent(error));
  }
  
  if (!code) {
    logInfo('No authorization code received');
    return res.redirect('/?error=no_code');
  }
  
  // SECURITY FIX #4: Validate state parameter
  if (!state || !req.session.oauth || state !== req.session.oauth.state) {
    logInfo('State parameter mismatch - possible CSRF attack', {
      has_session_state: !!req.session.oauth?.state,
      states_match: state === req.session.oauth?.state
    });
    return res.redirect('/?error=invalid_state');
  }
  
  // SECURITY: Check that OAuth flow was recently initiated (not too old)
  const maxAge = 10 * 60 * 1000; // 10 minutes
  if (Date.now() - req.session.oauth.initiated_at > maxAge) {
    logInfo('OAuth flow expired');
    delete req.session.oauth;
    return res.redirect('/?error=expired');
  }
  
  try {
    // SECURITY FIX #5: Token exchange happens server-side
    // The authorization code never reaches the browser
    const tokenRequest = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: OAUTH_CONFIG.redirect_uri,
      client_id: OAUTH_CONFIG.client_id,
      code_verifier: req.session.oauth.code_verifier // SECURITY: PKCE verification
    };
    
    // SECURITY: Safe logging - never log code or verifier
    logInfo('Exchanging authorization code for token');
    
    const tokenResponse = await fetch(OAUTH_CONFIG.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(tokenRequest)
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logInfo('Token exchange failed', { error: errorData.error });
      throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
    }
    
    const tokenData = await tokenResponse.json();
    
    // SECURITY: Safe logging - never log the access token
    logInfo('Access token received', {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in
    });
    
    // SECURITY FIX #6: Fetch user info server-side
    const userInfoResponse = await fetch(OAUTH_CONFIG.userinfo_endpoint, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    const userInfo = await userInfoResponse.json();
    
    // SECURITY FIX #7: Store user info in server-side session
    // Access token is stored server-side and never sent to browser
    req.session.user = {
      sub: userInfo.sub,
      name: userInfo.name,
      email: userInfo.email
    };
    
    // SECURITY FIX #8: Store access token securely in session
    // Token is kept server-side only
    req.session.access_token = tokenData.access_token;
    req.session.token_expires_at = Date.now() + (tokenData.expires_in * 1000);
    
    // SECURITY: Clean up OAuth flow data
    delete req.session.oauth;
    
    logInfo('User logged in successfully', {
      username: userInfo.sub
    });
    
    // SECURITY FIX #9: Redirect without exposing any tokens or codes in URL
    res.redirect('/?login=success');
    
  } catch (error) {
    logInfo('OAuth callback error', { message: error.message });
    delete req.session.oauth;
    res.redirect('/?error=' + encodeURIComponent(error.message));
  }
});

// API endpoint to get user info (from session)
app.get('/api/user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  // SECURITY: Check if token has expired
  if (req.session.token_expires_at && Date.now() > req.session.token_expires_at) {
    logInfo('Token expired', { username: req.session.user.sub });
    delete req.session.user;
    delete req.session.access_token;
    delete req.session.token_expires_at;
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // SECURITY: Only send necessary user info, never the access token
  res.json({
    user: req.session.user,
    expires_in: Math.max(0, Math.floor((req.session.token_expires_at - Date.now()) / 1000))
  });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  if (req.session.user) {
    logInfo('User logged out', { username: req.session.user.sub });
  }
  
  // SECURITY: Properly destroy session on logout
  req.session.destroy((err) => {
    if (err) {
      logInfo('Session destruction error', { error: err.message });
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'client-app-secure',
    version: '1.0.0',
    security_features: [
      'PKCE with S256',
      'State parameter validation',
      'Server-side token exchange',
      'Session-based auth',
      'No tokens in browser',
      'Secure logging',
      'Token expiration check'
    ]
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ✅ SECURE OAuth 2.0 Client Application');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Client running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  🔒 Security Features:');
  console.log('     • PKCE with S256 method');
  console.log('     • State parameter for CSRF protection');
  console.log('     • Server-side token exchange');
  console.log('     • Server-side session storage');
  console.log('     • No tokens exposed to browser');
  console.log('     • Token expiration validation');
  console.log('     • Secure logging (no sensitive data)');
  console.log('');
  console.log('  Pages:');
  console.log(`    • Home:     http://localhost:${PORT}/`);
  console.log(`    • Callback: http://localhost:${PORT}/callback`);
  console.log('');
  console.log('  Prerequisites:');
  console.log('    Make sure the secure auth server is running at:');
  console.log('    http://localhost:4001');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});
