/**
 * ❌ OAUTH SERVER - VULNERABLE VERSION
 * 
 * Lỗ hổng: Server này KHÔNG validate state parameter
 * Điều này cho phép CSRF attack thành công
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4001;

// ========================================
// DATABASE MOCK
// ========================================
const users = {
  'victim@email.com': {
    id: '1',
    email: 'victim@email.com',
    password: 'victim123',
    name: 'Victim User'
  },
  'attacker@email.com': {
    id: '2',
    email: 'attacker@email.com',
    password: 'attacker123',
    name: 'Attacker User'
  }
};

// Lưu authorization codes
const authCodes = new Map();
// Lưu access tokens
const accessTokens = new Map();

// ========================================
// REGISTERED OAUTH CLIENT
// ========================================
const CLIENT = {
  clientId: 'myapp-vulnerable',
  clientSecret: 'secret-vulnerable-123',
  redirectUris: [ 
    'http://localhost:4000/callback',
    'http://localhost:4000/code-display'
  ]
};

// ========================================
// MIDDLEWARE
// ========================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'oauth-server-secret',
  resave: false,
  saveUninitialized: true
}));

// ========================================
// LOGIN PAGE
// ========================================
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Provider Login</title>
      <style>
        body { 
          font-family: Arial; 
          max-width: 400px; 
          margin: 100px auto; 
          padding: 20px;
          background: #f5f5f5;
        }
        .box { 
          background: white; 
          padding: 30px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h2 { color: #1976d2; margin-top: 0; }
        input { 
          width: 100%; 
          padding: 12px; 
          margin: 10px 0; 
          border: 1px solid #ddd;
          border-radius: 5px;
          box-sizing: border-box;
        }
        button { 
          width: 100%; 
          padding: 12px; 
          background: #1976d2; 
          color: white; 
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover { background: #1565c0; }
        .info { 
          background: #e3f2fd; 
          padding: 15px; 
          border-radius: 5px;
          margin: 15px 0;
          font-size: 14px;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 10px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>🔐 OAuth Provider</h2>
        <div class="warning">
          ⚠️ <strong>VULNERABLE VERSION</strong><br>
          Server này KHÔNG validate state parameter
        </div>
        <div class="info">
          <strong>Demo Accounts:</strong><br>
          👤 victim@email.com / victim123<br>
          👹 attacker@email.com / attacker123
        </div>
        <form method="POST" action="/login">
          <input type="hidden" name="returnUrl" value="${req.query.return || '/'}">
          <input type="email" name="email" placeholder="Email" required>
          <input type="password" name="password" placeholder="Password" required>
          <button type="submit">Login to OAuth Provider</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// ========================================
// LOGIN HANDLER
// ========================================
app.post('/login', (req, res) => {
  const { email, password, returnUrl } = req.body;
  const user = users[email];
  
  if (user && user.password === password) {
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name;
    res.redirect(returnUrl);
  } else {
    res.send(`
      <h2>❌ Invalid credentials</h2>
      <a href="/login">Try again</a>
    `);
  }
});

// ========================================
// AUTHORIZATION ENDPOINT
// ❌ VULNERABLE: Không validate state từ client
// ========================================
app.get('/authorize', (req, res) => {
  // Kiểm tra user đã login chưa
  if (!req.session.userId) {
    return res.redirect('/login?return=' + encodeURIComponent(req.originalUrl));
  }
  
  const { client_id, redirect_uri, response_type, state } = req.query;
  
  console.log('\n========================================');
  console.log('📨 AUTHORIZATION REQUEST RECEIVED');
  console.log('========================================');
  console.log('Client ID:', client_id);
  console.log('Redirect URI:', redirect_uri);
  console.log('State:', state || '❌ NO STATE');
  console.log('User:', req.session.userEmail);
  
  // Validate client
  if (client_id !== CLIENT.clientId) {
    return res.status(400).send('Invalid client_id');
  }
  // ❌ KHÔNG validate redirect_uri chặt chẽ
  // ❌ KHÔNG validate state parameter
  
  if (response_type !== 'code') {
    return res.status(400).send('Unsupported response_type');
  }
  if (!CLIENT.redirectUris.includes(redirect_uri)) {
    return res.status(400).send('Invalid redirect_uri');
  }
  // Hiển thị consent screen
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authorization Request</title>
      <style>
        body { 
          font-family: Arial; 
          max-width: 500px; 
          margin: 100px auto; 
          padding: 20px;
          background: #f5f5f5;
        }
        .box { 
          background: white; 
          padding: 30px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h2 { color: #1976d2; margin-top: 0; }
        .user { 
          background: #e3f2fd; 
          padding: 15px; 
          border-radius: 5px;
          margin: 15px 0;
        }
        .warning {
          background: #ffebee;
          border-left: 4px solid #f44336;
          padding: 15px;
          margin: 15px 0;
        }
        ul { 
          list-style: none; 
          padding: 0; 
          margin: 15px 0;
        }
        li { 
          padding: 8px 0; 
          border-bottom: 1px solid #eee;
        }
        li:before { content: "✓ "; color: #4caf50; font-weight: bold; }
        button { 
          padding: 12px 30px; 
          margin: 5px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        .allow { background: #4caf50; color: white; }
        .deny { background: #f44336; color: white; }
        .allow:hover { background: #45a049; }
        .deny:hover { background: #da190b; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>🔐 Authorization Request</h2>
        
        <div class="user">
          <strong>Logged in as:</strong><br>
          ${req.session.userName} (${req.session.userEmail})
        </div>
        
        <div class="warning">
          ⚠️ <strong>VULNERABLE SERVER</strong><br>
          State parameter: <code>${state || 'NONE'}</code><br>
          Server sẽ KHÔNG validate state này!
        </div>
        
        <p><strong>"${client_id}"</strong> wants to access your account:</p>
        
        <ul>
          <li>Read your profile information</li>
          <li>Access your email address</li>
          <li>View your account details</li>
        </ul>
        
        <form method="POST" action="/authorize">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="state" value="${state || ''}">
          <button type="submit" name="action" value="allow" class="allow">
            ✓ Allow Access
          </button>
          <button type="submit" name="action" value="deny" class="deny">
            ✗ Deny
          </button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// ========================================
// AUTHORIZATION HANDLER
// ❌ VULNERABLE: Không validate state
// ========================================
app.post('/authorize', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('Not logged in');
  }
  
  const { client_id, redirect_uri, state, action } = req.body;
  
  if (action === 'deny') {
    return res.redirect(redirect_uri + '?error=access_denied');
  }
  
  // Generate authorization code
  const code = 'CODE_' + uuidv4();
  
  // ❌ Lưu code KHÔNG kiểm tra state
  authCodes.set(code, {
    userId: req.session.userId,
    userEmail: req.session.userEmail,
    userName: req.session.userName,
    clientId: client_id,
    redirectUri: redirect_uri,
    createdAt: Date.now()
  });
  
  console.log('\n========================================');
  console.log('✅ AUTHORIZATION CODE GENERATED');
  console.log('========================================');
  console.log('Code:', code);
  console.log('User:', req.session.userEmail);
  console.log('State:', state || '❌ NO STATE VALIDATION');
  console.log('⚠️  Code sẽ được gửi về client KHÔNG cần validate state!');
  
  // ❌ Redirect về client VỚI hoặc KHÔNG có state
  // Server KHÔNG quan tâm đến state parameter
  const redirectUrl = redirect_uri + '?code=' + code + 
    (state ? '&state=' + state : '');
  
  console.log('Redirect to:', redirectUrl);
  console.log('========================================\n');
  
  res.redirect(redirectUrl);
});

// ========================================
// TOKEN ENDPOINT
// ❌ Exchange code for access token
// ========================================
app.post('/token', (req, res) => {
  const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
  
  console.log('\n========================================');
  console.log('🔑 TOKEN REQUEST RECEIVED');
  console.log('========================================');
  console.log('Code:', code);
  console.log('Client ID:', client_id);
  
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  
  // Validate client credentials
  if (client_id !== CLIENT.clientId || client_secret !== CLIENT.clientSecret) {
    console.log('❌ Invalid client credentials');
    return res.status(401).json({ error: 'invalid_client' });
  }
  
  // Validate authorization code
  const authData = authCodes.get(code);
  if (!authData) {
    console.log('❌ Invalid authorization code');
    return res.status(400).json({ error: 'invalid_grant' });
  }
  
  // Check if code is expired (10 minutes)
  if (Date.now() - authData.createdAt > 10 * 60 * 1000) {
    authCodes.delete(code);
    console.log('❌ Authorization code expired');
    return res.status(400).json({ error: 'expired_token' });
  }
  
  // Generate access token
  const accessToken = 'TOKEN_' + uuidv4();
  accessTokens.set(accessToken, {
    userId: authData.userId,
    userEmail: authData.userEmail,
    userName: authData.userName,
    clientId: client_id
  });
  
  // Delete used code
  authCodes.delete(code);
  
  console.log('✅ Access token issued');
  console.log('User:', authData.userEmail);
  console.log('Token:', accessToken);
  console.log('========================================\n');
  
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600
  });
});

// ========================================
// USER INFO ENDPOINT
// ========================================
app.get('/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }
  
  const token = authHeader.substring(7);
  const tokenData = accessTokens.get(token);
  
  if (!tokenData) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  
  console.log('\n========================================');
  console.log('👤 USER INFO REQUEST');
  console.log('========================================');
  console.log('User:', tokenData.userEmail);
  console.log('========================================\n');
  
  res.json({
    id: tokenData.userId,
    email: tokenData.userEmail,
    name: tokenData.userName
  });
});

// ========================================
// LOGOUT
// ========================================
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.send(`
    <h2>✅ Logged out</h2>
    <a href="/login">Login again</a>
  `);
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log('\n');
  console.log('========================================');
  console.log('❌ VULNERABLE OAUTH SERVER STARTED');
  console.log('========================================');
  console.log(`Server: http://localhost:${PORT}`);
  console.log('Login: http://localhost:${PORT}/login');
  console.log('');
  console.log('⚠️  WARNING: This server does NOT validate state parameter');
  console.log('⚠️  CSRF attacks will succeed on this server!');
  console.log('========================================\n');
});