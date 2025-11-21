/**
 * ✅ OAUTH CLIENT - SECURE VERSION (FIXED)
 * 
 * Fix: Attacker page cũng phải generate state đúng format
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

// ========================================
// OAUTH CONFIGURATION
// ========================================
const OAUTH_CONFIG = {
  clientId: 'myapp-secure',
  clientSecret: 'secret-secure-456',
  authorizationUrl: 'http://localhost:5001/authorize',
  tokenUrl: 'http://localhost:5001/token',
  userInfoUrl: 'http://localhost:5001/userinfo',
  redirectUri: 'http://localhost:5000/callback'
};

// ========================================
// MIDDLEWARE
// ========================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'client-app-secure-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}));

// ========================================
// HELPER: Generate Cryptographically Secure State
// ========================================
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

// ========================================
// HOMEPAGE
// ========================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Client - Secure</title>
      <style>
        body { 
          font-family: Arial; 
          max-width: 800px; 
          margin: 50px auto; 
          padding: 20px;
          background: #f5f5f5;
        }
        .box { 
          background: white; 
          padding: 30px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin: 20px 0;
        }
        h1 { color: #333; margin-top: 0; }
        .secure {
          background: #e8f5e9;
          border-left: 5px solid #4caf50;
          padding: 20px;
          margin: 20px 0;
        }
        .user-info {
          background: #e8f5e9;
          border-left: 5px solid #4caf50;
          padding: 20px;
          margin: 20px 0;
        }
        button, .button {
          padding: 15px 30px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          text-decoration: none;
          display: inline-block;
          margin: 5px;
        }
        .login { background: #4caf50; color: white; }
        .logout { background: #f44336; color: white; }
        .login:hover { background: #45a049; }
        .logout:hover { background: #d32f2f; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>✅ OAuth Client (SECURE)</h1>
        
        <div class="secure">
          <h3>✅ BẢO MẬT: CSRF Protection Enabled</h3>
          <p><strong>Client này SỬ DỤNG state parameter đúng cách!</strong></p>
        </div>
        
        ${req.session.user ? `
          <div class="user-info">
            <h3>✅ Logged In Securely</h3>
            <p><strong>Name:</strong> ${req.session.user.name}</p>
            <p><strong>Email:</strong> ${req.session.user.email}</p>
            <p><strong>User ID:</strong> ${req.session.user.id}</p>
            <form method="POST" action="/logout" style="margin-top: 15px;">
              <button type="submit" class="logout">Logout</button>
            </form>
          </div>
        ` : `
          <a href="/login" class="button login">
            🔐 Login with OAuth (Secure)
          </a>
        `}
        
        <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 5px; border-left: 5px solid #ffc107;">
          <h3>🧪 Try CSRF Attack (It will FAIL):</h3>
          <ol>
            <li>Mở <a href="/attacker-page" target="_blank">/attacker-page</a></li>
            <li>Click "Start OAuth Flow as Attacker"</li>
            <li>Copy code từ Code Interceptor page</li>
            <li>Generate malicious link</li>
            <li>Click link → <strong>Attack sẽ BỊ CHẶN! ✅</strong></li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ========================================
// LOGIN - Khởi tạo OAuth flow
// ✅ SECURE: Generate và store state
// ========================================
app.get('/login', (req, res) => {
  console.log('\n========================================');
  console.log('🚀 STARTING OAUTH FLOW (SECURE)');
  console.log('========================================');
  
  // ✅ Generate cryptographically secure random state
  const state = generateState();
  
  console.log('Generated state:', state);
  
  // ✅ Lưu state vào session để validate sau
  req.session.oauthState = state;
  req.session.oauthStateCreatedAt = Date.now();
  
  console.log('✅ State stored in session');
  
  // ✅ Include state trong authorization URL
  const authUrl = 
    `${OAUTH_CONFIG.authorizationUrl}?` +
    `client_id=${OAUTH_CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}&` +
    `response_type=code&` +
    `state=${state}`;
  
  console.log('Redirecting to:', authUrl);
  console.log('✅ STATE PARAMETER INCLUDED - PROTECTED FROM CSRF!');
  console.log('========================================\n');
  
  res.redirect(authUrl);
});

// ========================================
// CODE INTERCEPTOR PAGE
// ========================================
app.get('/code-interceptor', (req, res) => {
  const { code, state, error } = req.query;
  
  console.log('\n========================================');
  console.log('🔍 CODE INTERCEPTOR PAGE (SECURE)');
  console.log('========================================');
  console.log('Code:', code);
  console.log('State:', state ? state.substring(0, 30) + '...' : 'NONE');
  console.log('========================================\n');
  
  if (error) {
    return res.send(`
      <h2>❌ Authorization Error</h2>
      <p>Error: ${error}</p>
      <a href="/">Go back</a>
    `);
  }
  
  if (!code) {
    return res.send(`
      <h2>❌ Missing authorization code</h2>
      <a href="/">Go back</a>
    `);
  }

  // Hiển thị interceptor page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🔐 Code Interceptor - Secure Version</title>
      <style>
        body { 
          font-family: Arial; 
          max-width: 800px; 
          margin: 50px auto; 
          padding: 20px;
          background: #1a1a1a;
          color: white;
        }
        .box { 
          background: #2a2a2a; 
          padding: 30px; 
          border-radius: 10px;
          border: 2px solid #4caf50;
        }
        h1 { color: #4caf50; margin-top: 0; }
        .code-display {
          background: #3a3a3a;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border: 2px solid #4caf50;
        }
        .code-value {
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #4caf50;
          word-break: break-all;
          background: #1a1a1a;
          padding: 15px;
          border-radius: 5px;
          margin: 10px 0;
        }
        button {
          padding: 15px 30px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin: 10px 5px;
          background: #4caf50;
          color: white;
        }
        button:hover { background: #45a049; }
        .success {
          background: #1b5e20;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          display: none;
        }
        .warning {
          background: #f44336;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .info {
          background: #424242;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #4caf50;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>🔐 Authorization Code Captured (Secure Version)</h1>
        
        <div class="warning">
          <strong>⚠️ IMPORTANT:</strong><br>
          This is the SECURE version with state parameter.<br>
          Even with this code, the CSRF attack will FAIL!
        </div>
        
        <h3>📋 Authorization Code:</h3>
        <div class="code-display">
          <div class="code-value" id="authCode">${code}</div>
          <button onclick="copyCode()">📋 Copy Code</button>
        </div>
        
        <h3>🔑 State Parameter:</h3>
        <div class="code-display">
          <div class="code-value" id="stateValue">${state || 'NONE'}</div>
          <button onclick="copyState()">📋 Copy State</button>
        </div>
        
        <h3>🔗 Full Callback URL:</h3>
        <div class="code-display">
          <div class="code-value" id="fullUrl">http://localhost:${PORT}/callback?code=${code}&state=${state || ''}</div>
          <button onclick="copyFullUrl()">📋 Copy Full URL</button>
        </div>
        
        <div id="successMessage" class="success">
          ✅ Copied to clipboard!
        </div>
        
        <div class="info">
          <h4>🛡️ Why Attack Will Fail:</h4>
          <ul style="line-height: 1.8;">
            <li>Victim's session has DIFFERENT state value</li>
            <li>This code + state won't match victim's session</li>
            <li>Callback will reject: "State validation failed"</li>
            <li>✅ CSRF attack will be BLOCKED!</li>
          </ul>
        </div>
        
        <div style="margin-top: 20px;">
          <a href="http://localhost:${PORT}/attacker-page" style="background: #666; color: white; padding: 12px 24px; border-radius: 5px; display: inline-block; text-decoration: none;">
            ← Back to Attacker Page
          </a>
        </div>
      </div>
      
      <script>
        function copyCode() {
          const code = document.getElementById('authCode').textContent;
          navigator.clipboard.writeText(code).then(() => showSuccess());
        }
        
        function copyState() {
          const state = document.getElementById('stateValue').textContent;
          navigator.clipboard.writeText(state).then(() => showSuccess());
        }
        
        function copyFullUrl() {
          const url = document.getElementById('fullUrl').textContent;
          navigator.clipboard.writeText(url).then(() => showSuccess());
        }
        
        function showSuccess() {
          const msg = document.getElementById('successMessage');
          msg.style.display = 'block';
          setTimeout(() => msg.style.display = 'none', 2000);
        }
      </script>
    </body>
    </html>
  `);
});

// ========================================
// CALLBACK - Xử lý OAuth callback
// ✅ SECURE: Validate state parameter
// ========================================
app.get('/callback', async (req, res) => {
  const { code, state: receivedState, error } = req.query;
  
  console.log('\n========================================');
  console.log('📨 OAUTH CALLBACK RECEIVED (SECURE)');
  console.log('========================================');
  console.log('Code:', code);
  console.log('Received State:', receivedState ? receivedState.substring(0, 30) + '...' : 'NONE');
  console.log('Stored State:', req.session.oauthState ? req.session.oauthState.substring(0, 30) + '...' : 'NONE');
  
  if (error) {
    console.log('❌ Error:', error);
    return res.send(`
      <h2>❌ Authorization Error</h2>
      <p>Error: ${error}</p>
      <a href="/">Go back</a>
    `);
  }
  
  // ✅ CRITICAL VALIDATION #1: State exists?
  if (!receivedState) {
    console.log('❌ CSRF ATTACK DETECTED: Missing state!');
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CSRF Attack Blocked</title>
        <style>
          body { font-family: Arial; max-width: 600px; margin: 100px auto; padding: 20px; background: #ffebee; }
          .box { background: white; padding: 30px; border-radius: 10px; border: 3px solid #f44336; }
          h2 { color: #f44336; }
          .error { background: #ffcdd2; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>🛑 CSRF Attack Detected & Blocked!</h2>
          <div class="error">
            <strong>Reason:</strong> Missing state parameter<br>
            <strong>Security Check:</strong> FAILED<br>
            <strong>Action:</strong> Request rejected
          </div>
          <p><strong>✅ Security measures working correctly!</strong></p>
          <a href="/">← Go back</a>
        </div>
      </body>
      </html>
    `);
  }
  
  // ✅ CRITICAL VALIDATION #2: Session has state?
  if (!req.session.oauthState) {
    console.log('❌ CSRF ATTACK DETECTED: No state in session!');
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CSRF Attack Blocked</title>
        <style>
          body { font-family: Arial; max-width: 600px; margin: 100px auto; padding: 20px; background: #ffebee; }
          .box { background: white; padding: 30px; border-radius: 10px; border: 3px solid #f44336; }
          h2 { color: #f44336; }
          .error { background: #ffcdd2; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>🛑 CSRF Attack Detected & Blocked!</h2>
          <div class="error">
            <strong>Reason:</strong> No OAuth state in session<br>
            <strong>Details:</strong> You may have clicked a malicious link<br>
            <strong>Security Check:</strong> FAILED
          </div>
          <p><strong>✅ Security measures working correctly!</strong></p>
          <a href="/">← Go back</a>
        </div>
      </body>
      </html>
    `);
  }
  
  // ✅ CRITICAL VALIDATION #3: States match?
  if (receivedState !== req.session.oauthState) {
    console.log('❌ CSRF ATTACK DETECTED: State mismatch!');
    console.log('Expected:', req.session.oauthState);
    console.log('Received:', receivedState);
    
    delete req.session.oauthState;
    delete req.session.oauthStateCreatedAt;
    
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CSRF Attack Blocked</title>
        <style>
          body { font-family: Arial; max-width: 700px; margin: 100px auto; padding: 20px; background: #ffebee; }
          .box { background: white; padding: 30px; border-radius: 10px; border: 3px solid #f44336; }
          h2 { color: #f44336; }
          .error { background: #ffcdd2; padding: 15px; border-radius: 5px; margin: 20px 0; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>🛑 CSRF Attack Detected & Blocked!</h2>
          <div class="error">
            <strong>Reason:</strong> State validation failed<br>
            <strong>Expected State:</strong> <code>${req.session.oauthState ? req.session.oauthState.substring(0, 20) + '...' : 'N/A'}</code><br>
            <strong>Received State:</strong> <code>${receivedState.substring(0, 20)}...</code>
          </div>
          <h3>What this means:</h3>
          <ul>
            <li>Someone tried to trick you with their OAuth code</li>
            <li>This is likely a CSRF attack attempt</li>
            <li>✅ Your account is safe - attack blocked!</li>
          </ul>
          <a href="/">← Go back to safety</a>
        </div>
      </body>
      </html>
    `);
  }
  
  // ✅ VALIDATION #4: Check age
  const stateAge = Date.now() - (req.session.oauthStateCreatedAt || 0);
  if (stateAge > 10 * 60 * 1000) {
    console.log('❌ State expired');
    delete req.session.oauthState;
    delete req.session.oauthStateCreatedAt;
    return res.status(403).send(`
      <h2>❌ State Expired</h2>
      <p>OAuth flow took too long. Please try again.</p>
      <a href="/">Go back</a>
    `);
  }
  
  console.log('✅ State validation PASSED!');
  
  // ✅ Clear used state
  delete req.session.oauthState;
  delete req.session.oauthStateCreatedAt;
  
  if (!code) {
    return res.send(`<h2>❌ Missing code</h2><a href="/">Go back</a>`);
  }
  
  try {
    console.log('🔄 Exchanging code for token...');
    
    const tokenResponse = await fetch(OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return res.send(`<h2>❌ Token Error</h2><p>${tokenData.error}</p><a href="/">Go back</a>`);
    }
    
    console.log('✅ Token received');
    
    const userResponse = await fetch(OAUTH_CONFIG.userInfoUrl, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    const userData = await userResponse.json();
    console.log('✅ User authenticated:', userData.email);
    console.log('========================================\n');
    
    req.session.user = {
      id: userData.id,
      email: userData.email,
      name: userData.name
    };
    
    res.redirect('/?success=true');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.send(`<h2>❌ Error</h2><p>${error.message}</p><a href="/">Go back</a>`);
  }
});

// ========================================
// LOGOUT
// ========================================
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ========================================
// ATTACKER PAGE
// ========================================
app.get('/attacker-page', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>👹 Attacker Page (Attack Will Fail)</title>
      <style>
        body { font-family: Arial; max-width: 900px; margin: 50px auto; padding: 20px; background: #1a1a1a; color: white; }
        .box { background: #2a2a2a; padding: 30px; border-radius: 10px; border: 2px solid #f44336; margin: 20px 0; }
        h1 { color: #f44336; }
        h3 { color: #ff5252; }
        button { padding: 15px 30px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 10px 5px; font-size: 16px; }
        button:hover { background: #d32f2f; }
        input, textarea { width: 100%; padding: 12px; margin: 10px 0; background: #3a3a3a; border: 1px solid #555; color: white; border-radius: 5px; box-sizing: border-box; font-family: monospace; }
        .warning { background: #4caf50; padding: 15px; border-left: 4px solid #81c784; margin: 15px 0; }
        .info { background: #424242; padding: 15px; border-left: 4px solid #ff5252; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>👹 Attacker Control Panel</h1>
        <div class="warning">
          <strong>⚠️ NOTE:</strong> This attack will FAIL because secure version validates state!
        </div>
      </div>
      
      <div class="box">
        <h3>Step 1: Get Authorization Code</h3>
        <div class="info">
          <strong>Instructions:</strong><br>
          1. Click button below to start OAuth flow<br>
          2. Login as attacker (attacker@email.com / attacker123)<br>
          3. Code Interceptor page will show code + state<br>
          4. Copy both and return here
        </div>
        <button onclick="startOAuthFlowForAttack()">🚀 Start OAuth Flow as Attacker</button>
        <input type="text" id="authCode" placeholder="Paste authorization code here" style="margin-top: 20px;">
        <input type="text" id="authState" placeholder="Paste state here (optional, for demo)">
      </div>
      
      <div class="box">
        <h3>Step 2: Generate Attack Link (Will Fail)</h3>
        <button onclick="generateMaliciousLink()">🎯 Generate CSRF Attack Link</button>
        <div id="result" style="display:none; margin-top: 20px;">
          <h4>Malicious Link:</h4>
          <textarea id="maliciousLink" rows="3" readonly></textarea><br>
          <button onclick="copyLink()">📋 Copy Link</button>
          <button onclick="openLink()">🔗 Try Attack (Will Fail)</button>
          <div class="warning" style="margin-top: 20px;">
            ❌ <strong>Attack will FAIL!</strong><br>
            Reason: State from attacker ≠ State in victim's session<br>
            ✅ CSRF protection working!
          </div>
        </div>
      </div>
      
      <div class="box">
        <h3>🛡️ Why Attack Fails:</h3>
        <div class="info">
          <ol style="line-height: 1.8;">
            <li>Attacker gets code with <strong>attacker's state</strong></li>
            <li>Victim has <strong>different state</strong> in their session</li>
            <li>When victim clicks malicious link, states don't match</li>
            <li>Server rejects: "State validation failed"</li>
            <li>✅ Account stays safe!</li>
          </ol>
        </div>
      </div>
      
      <script>
        function startOAuthFlowForAttack() {
          // Generate a proper random state for attacker
          const attackerState = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          
          const interceptorUri = 'http://localhost:${PORT}/code-interceptor';
          
          const authUrl = '${OAUTH_CONFIG.authorizationUrl}?' +
            'client_id=${OAUTH_CONFIG.clientId}&' +
            'redirect_uri=' + encodeURIComponent(interceptorUri) + '&' +
            'response_type=code&' +
            'state=' + attackerState;
          
          // Save attacker state for later
          sessionStorage.setItem('attackerState', attackerState);
          
          window.open(authUrl, 'oauth', 'width=600,height=700');
          alert('✅ OAuth popup opened!\\n\\n' +
                'Steps:\\n' +
                '1. Login: attacker@email.com / attacker123\\n' +
                '2. Click "Allow Access"\\n' +
                '3. Code Interceptor will show code + state\\n' +
                '4. Copy code back here');
        }
        
        function generateMaliciousLink() {
          const code = document.getElementById('authCode').value.trim();
          let state = document.getElementById('authState').value.trim();
          
          if (!code) { 
            alert('❌ Please enter authorization code first!'); 
            return; 
          }
          
          // If no state provided, use the one from attacker's flow
          if (!state) {
            state = sessionStorage.getItem('attackerState') || 'attacker-fake-state-' + Math.random().toString(36).substr(2, 30);
          }
          
          const url = 'http://localhost:${PORT}/callback?code=' + code + '&state=' + state;
          document.getElementById('maliciousLink').value = url;
          document.getElementById('result').style.display = 'block';
          
          console.log('Generated malicious link:', url);
          console.log('This will fail because victim has different state in session!');
        }
        
        function copyLink() {
          const textarea = document.getElementById('maliciousLink');
          textarea.select();
          document.execCommand('copy');
          alert('✅ Link copied!\\n\\nNow open in new tab to see attack FAIL.');
        }
        
        function openLink() {
          const link = document.getElementById('maliciousLink').value;
          if (confirm('🎯 Try CSRF attack now?\\n\\nAttack will be BLOCKED by state validation!')) {
            window.open(link, '_blank');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log('\n');
  console.log('========================================');
  console.log('✅ SECURE OAUTH CLIENT STARTED (FIXED)');
  console.log('========================================');
  console.log(`Homepage: http://localhost:${PORT}`);
  console.log(`Attacker Page: http://localhost:${PORT}/attacker-page`);
  console.log(`Code Interceptor: http://localhost:${PORT}/code-interceptor`);
  console.log('');
  console.log('✅ This client USES state parameter correctly');
  console.log('✅ CSRF attacks will be BLOCKED!');
  console.log('========================================\n');
});