/**
 * ❌ OAUTH CLIENT - VULNERABLE VERSION (FIXED)
 * 
 * Cải tiến: Thêm code-display page để dễ dàng copy authorization code
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = 4000;

// ========================================
// OAUTH CONFIGURATION
// ========================================
const OAUTH_CONFIG = {
  clientId: 'myapp-vulnerable',
  clientSecret: 'secret-vulnerable-123',
  authorizationUrl: 'http://localhost:4001/authorize',
  tokenUrl: 'http://localhost:4001/token',
  userInfoUrl: 'http://localhost:4001/userinfo',
  redirectUri: 'http://localhost:4000/callback',
  displayUri: 'http://localhost:4000/code-display' // URI riêng để hiển thị code
};

// ========================================
// MIDDLEWARE
// ========================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'client-app-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true }
}));

// ========================================
// HOMEPAGE
// ========================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Client - Vulnerable</title>
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
        .warning {
          background: #ffebee;
          border-left: 5px solid #f44336;
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
        .login { background: #2196f3; color: white; }
        .logout { background: #f44336; color: white; }
        .login:hover { background: #1976d2; }
        .logout:hover { background: #d32f2f; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>❌ OAuth Client (VULNERABLE)</h1>
        
        <div class="warning">
          <h3>⚠️ LỖ HỔNG: CSRF in OAuth</h3>
          <p><strong>Client này KHÔNG sử dụng state parameter!</strong></p>
        </div>
        
        ${req.session.user ? `
          <div class="user-info">
            <h3>✅ Logged In</h3>
            <p><strong>Name:</strong> ${req.session.user.name}</p>
            <p><strong>Email:</strong> ${req.session.user.email}</p>
            <p><strong>User ID:</strong> ${req.session.user.id}</p>
            <form method="POST" action="/logout" style="margin-top: 15px;">
              <button type="submit" class="logout">Logout</button>
            </form>
          </div>
        ` : `
          <a href="/login" class="button login">
            🔐 Login with OAuth (Vulnerable)
          </a>
        `}
        
        <div style="margin-top: 30px; padding: 20px; background: #e3f2fd; border-radius: 5px;">
          <h3>📚 Demo Instructions:</h3>
          <ol>
            <li>Mở <a href="/attacker-page" target="_blank">/attacker-page</a> trong tab mới</li>
            <li>Trên attacker page, click "Start OAuth Flow as Attacker"</li>
            <li><strong>QUAN TRỌNG:</strong> Sau khi authorize, bạn sẽ thấy trang "Code Display" với code</li>
            <li>Copy code từ console hoặc từ trang và quay lại attacker page</li>
            <li>Generate malicious link và test attack</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ========================================
// LOGIN - Khởi tạo OAuth flow
// ❌ VULNERABLE: Không generate và store state
// ========================================
app.get('/login', (req, res) => {
  console.log('\n========================================');
  console.log('🚀 STARTING OAUTH FLOW (VULNERABLE)');
  console.log('========================================');
  
  // ❌ KHÔNG generate state parameter
  const authUrl = 
    `${OAUTH_CONFIG.authorizationUrl}?` +
    `client_id=${OAUTH_CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}&` +
    `response_type=code`;
  
  console.log('Redirecting to:', authUrl);
  console.log('⚠️  NO STATE PARAMETER - VULNERABLE TO CSRF!');
  console.log('========================================\n');
  
  res.redirect(authUrl);
});

// ========================================
// CODE DISPLAY PAGE
// Trang này CHỈ hiển thị code, KHÔNG xử lý token exchange
// Dùng cho attacker để copy code
// ========================================
app.get('/code-display', (req, res) => {
  const { code, error } = req.query;

  console.log('\n========================================');
  console.log('🛑 CODE DISPLAY PAGE - ATTACKER VIEW');
  console.log('========================================');
  console.log('👉 AUTHORIZATION CODE (CỦA ATTACKER):', code);
  console.log('⚠️  Code này CHƯA được sử dụng!');
  console.log('⚠️  Copy code này để tạo malicious link!');
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

  // ❌ KHÔNG CHẠY TOKEN EXCHANGE. CHỈ HIỂN THỊ CODE VÀ DỪNG.
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>👹 Code Display - Attacker View</title>
      <style>
        body { 
          font-family: Arial; 
          max-width: 700px; 
          margin: 50px auto; 
          padding: 20px; 
          background: #1a1a1a;
          color: white;
        }
        .box { 
          background: #2a2a2a; 
          padding: 30px; 
          border-radius: 10px; 
          border: 3px solid #f44336;
          box-shadow: 0 10px 30px rgba(244, 67, 54, 0.3);
        }
        h2 { 
          color: #f44336; 
          margin-top: 0; 
        }
        .code-display { 
          background: #000; 
          color: #4CAF50; 
          padding: 20px; 
          font-size: 1.1em; 
          font-family: 'Courier New', monospace;
          border-radius: 8px; 
          word-break: break-all; 
          margin: 20px 0;
          border: 2px solid #4CAF50;
        }
        button {
          padding: 15px 30px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin: 10px 5px;
          background: #f44336;
          color: white;
          font-weight: bold;
        }
        button:hover { 
          background: #d32f2f; 
        }
        .success {
          background: #1b5e20;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          display: none;
        }
        .info {
          background: #424242;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #ff5252;
        }
        .step {
          margin: 10px 0;
          padding: 10px;
          background: #333;
          border-radius: 5px;
        }
        a {
          color: #4CAF50;
          text-decoration: none;
          font-weight: bold;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>👹 Authorization Code Captured!</h2>
        
        <div class="info">
          <strong>🎯 Hướng dẫn tiếp theo:</strong>
          <div class="step">
            <strong>1.</strong> Copy authorization code bên dưới
          </div>
          <div class="step">
            <strong>2.</strong> Quay lại <a href="http://localhost:${PORT}/attacker-page" target="_blank">Attacker Page</a>
          </div>
          <div class="step">
            <strong>3.</strong> Paste code vào ô input
          </div>
          <div class="step">
            <strong>4.</strong> Click "Generate CSRF Attack Link"
          </div>
        </div>
        
        <p><strong>📋 Authorization Code:</strong></p>
        <div class="code-display" id="authCode">${code}</div>
        
        <button onclick="copyCode()">📋 Copy Code</button>
        <button onclick="copyFullUrl()">🔗 Copy Full Callback URL</button>
        
        <div id="successMessage" class="success">
          ✅ Copied to clipboard!
        </div>
        
        <div style="background: #4caf50; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <strong>✅ Success!</strong><br>
          Code này là authorization code HỢP LỆ của attacker.<br>
          Code này CHƯA được sử dụng, bạn có thể dùng nó để tạo CSRF attack!
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="http://localhost:${PORT}/attacker-page" style="background: #666; color: white; padding: 12px 24px; border-radius: 5px; display: inline-block;">
            ← Quay lại Attacker Page
          </a>
        </div>
      </div>
      
      <script>
        function copyCode() {
          const code = document.getElementById('authCode').textContent;
          navigator.clipboard.writeText(code).then(() => {
            showSuccess();
          }).catch(err => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = code;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showSuccess();
          });
        }
        
        function copyFullUrl() {
          const code = document.getElementById('authCode').textContent;
          const url = 'http://localhost:${PORT}/callback?code=' + code;
          navigator.clipboard.writeText(url).then(() => {
            showSuccess();
          }).catch(err => {
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showSuccess();
          });
        }
        
        function showSuccess() {
          const msg = document.getElementById('successMessage');
          msg.style.display = 'block';
          setTimeout(() => {
            msg.style.display = 'none';
          }, 2000);
        }
        
        // Auto-select code on load
        window.onload = function() {
          const codeElement = document.getElementById('authCode');
          const range = document.createRange();
          range.selectNodeContents(codeElement);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        };
      </script>
    </body>
    </html>
  `);
});

// ========================================
// CALLBACK - Xử lý OAuth callback
// ❌ VULNERABLE: Không validate state
// ========================================
app.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  
  console.log('\n========================================');
  console.log('📨 OAUTH CALLBACK RECEIVED');
  console.log('========================================');
  console.log('Code:', code);
  console.log('State:', req.query.state || '❌ NO STATE');
  
  if (error) {
    console.log('❌ Error:', error);
    return res.send(`
      <h2>❌ Authorization Error</h2>
      <p>Error: ${error}</p>
      <a href="/">Go back</a>
    `);
  }
  
  if (!code) {
    console.log('❌ Missing code');
    return res.send(`
      <h2>❌ Missing authorization code</h2>
      <a href="/">Go back</a>
    `);
  }
  
  // ❌ KHÔNG validate state parameter
  console.log('⚠️  NO STATE VALIDATION - Processing code from ANYONE!');
  console.log('========================================\n');
  
  try {
    // Exchange authorization code for access token
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
      console.log('❌ Token error:', tokenData.error);
      return res.send(`
        <h2>❌ Token Error</h2>
        <p>${tokenData.error}</p>
        <a href="/">Go back</a>
      `);
    }
    
    console.log('✅ Token received:', tokenData.access_token);
    
    // Get user information
    console.log('👤 Fetching user info...');
    
    const userResponse = await fetch(OAUTH_CONFIG.userInfoUrl, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    const userData = await userResponse.json();
    
    console.log('✅ User info received:', userData.email);
    console.log('\n⚠️  CRITICAL: Linking account WITHOUT state validation!');
    console.log('This could be attacker\'s OAuth account!');
    console.log('========================================\n');
    
    // ❌ Lưu thông tin user vào session
    req.session.user = {
      id: userData.id,
      email: userData.email,
      name: userData.name
    };
    
    // Redirect về homepage
    res.redirect('/?success=true');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.send(`
      <h2>❌ Error</h2>
      <p>${error.message}</p>
      <a href="/">Go back</a>
    `);
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
      <title>👹 Attacker Control Panel</title>
      <style>
        body { 
          font-family: Arial; 
          max-width: 900px; 
          margin: 50px auto; 
          padding: 20px;
          background: #1a1a1a;
          color: white;
        }
        .box { 
          background: #2a2a2a; 
          padding: 30px; 
          border-radius: 10px;
          border: 2px solid #f44336;
          margin: 20px 0;
        }
        h1 { color: #f44336; margin-top: 0; }
        h3 { color: #ff5252; }
        button {
          padding: 15px 30px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin: 10px 5px;
          background: #f44336;
          color: white;
        }
        button:hover { background: #d32f2f; }
        input, textarea {
          width: 100%;
          padding: 12px;
          margin: 10px 0;
          background: #3a3a3a;
          border: 1px solid #555;
          color: white;
          border-radius: 5px;
          box-sizing: border-box;
          font-family: monospace;
        }
        .info {
          background: #424242;
          padding: 15px;
          border-left: 4px solid #ff5252;
          margin: 15px 0;
        }
        .success {
          background: #1b5e20;
          padding: 15px;
          border-left: 4px solid #4caf50;
          margin: 15px 0;
        }
        .step {
          background: #333;
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
          border-left: 3px solid #f44336;
        }
        .highlight {
          background: #4caf50;
          padding: 2px 6px;
          border-radius: 3px;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>👹 Attacker Control Panel</h1>
        <div class="success">
          <strong>Mục tiêu:</strong> Lấy authorization code của attacker để tạo CSRF attack!
        </div>
      </div>
      
      <div class="box">
        <h3>Step 1: Get Authorization Code</h3>
        <div class="info">
          <strong>Cách thức hoạt động:</strong><br>
          1. Click button bên dưới để start OAuth flow<br>
          2. Login as attacker (attacker@email.com / attacker123)<br>
          3. Click "Allow Access"<br>
          4. <span class="highlight">Trang "Code Display" sẽ hiển thị code của attacker!</span><br>
          5. Copy code và paste vào đây
        </div>
        
        <button onclick="startOAuthFlowForAttack()">
          🚀 Start OAuth Flow as Attacker
        </button>
        
        <div class="step" style="margin-top: 20px;">
          <strong>Sau khi có code:</strong> Paste vào đây
        </div>
        <input type="text" id="authCode" placeholder="Paste authorization code here">
      </div>
      
      <div class="box">
        <h3>Step 2: Generate Malicious Link</h3>
        <button onclick="generateMaliciousLink()">
          🎯 Generate CSRF Attack Link
        </button>
        
        <div id="maliciousLinkSection" style="display: none; margin-top: 20px;">
          <h3>🎉 Malicious Link Generated!</h3>
          <p><strong>Send this link to victim:</strong></p>
          <textarea id="maliciousLink" rows="3" readonly></textarea>
          <br>
          <button onclick="copyLink()">📋 Copy Link</button>
          <button onclick="openLink()">🔗 Test Attack (Open Link)</button>
          
          <div class="success" style="margin-top: 20px;">
            <strong>Expected Result:</strong><br>
            ✅ Victim's account will be linked to attacker's OAuth account<br>
            ✅ When victim clicks this link, CSRF attack succeeds!
          </div>
        </div>
      </div>
      
      <div class="box">
        <h3>📖 How It Works:</h3>
        <div class="step">
          <strong>1. Attacker gets their own OAuth code</strong><br>
          Attacker authorizes the app and gets a valid authorization code
        </div>
        <div class="step">
          <strong>2. Attacker creates malicious link</strong><br>
          Link format: <code style="color: #4caf50;">/callback?code=ATTACKER_CODE</code>
        </div>
        <div class="step">
          <strong>3. Victim clicks the malicious link</strong><br>
          Because there's NO state validation, the app accepts attacker's code
        </div>
        <div class="step">
          <strong>4. CSRF Attack succeeds!</strong><br>
          Victim's account is now linked to attacker's OAuth account
        </div>
      </div>
      
      <script>
        function startOAuthFlowForAttack() {
          // Sử dụng code-display URI để hiển thị code thay vì xử lý ngay
          const displayUri = '${OAUTH_CONFIG.displayUri}';
          
          const authUrl = '${OAUTH_CONFIG.authorizationUrl}?' +
            'client_id=${OAUTH_CONFIG.clientId}&' +
            'redirect_uri=' + encodeURIComponent(displayUri) + '&' +
            'response_type=code';
          
          // Open in popup
          const popup = window.open(authUrl, 'oauth', 'width=600,height=700');
          
          alert('✅ OAuth popup opened!\\n\\n' +
                'Steps:\\n' +
                '1. Login: attacker@email.com / attacker123\\n' +
                '2. Click "Allow Access"\\n' +
                '3. Bạn sẽ thấy trang "Code Display"\\n' +
                '4. Copy code từ trang đó\\n' +
                '5. Paste vào ô input trên trang này');
        }
        
        function generateMaliciousLink() {
          const code = document.getElementById('authCode').value.trim();
          
          if (!code) {
            alert('❌ Please enter the authorization code first!');
            return;
          }
          
          // Create malicious callback URL
          const maliciousUrl = 'http://localhost:${PORT}/callback?code=' + code;
          
          document.getElementById('maliciousLink').value = maliciousUrl;
          document.getElementById('maliciousLinkSection').style.display = 'block';
          
          console.log('✅ Malicious link generated:', maliciousUrl);
        }
        
        function copyLink() {
          const textarea = document.getElementById('maliciousLink');
          textarea.select();
          document.execCommand('copy');
          alert('✅ Link copied!\\n\\nBây giờ:\\n1. Mở tab mới\\n2. Paste link vào address bar\\n3. Quan sát attack thành công!');
        }
        
        function openLink() {
          const link = document.getElementById('maliciousLink').value;
          if (confirm('🎯 Open malicious link now?\\n\\nAttack sẽ diễn ra ngay!')) {
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
  console.log('❌ VULNERABLE OAUTH CLIENT STARTED');
  console.log('========================================');
  console.log(`Homepage: http://localhost:${PORT}`);
  console.log(`Attacker Page: http://localhost:${PORT}/attacker-page`);
  console.log(`Code Display: http://localhost:${PORT}/code-display`);
  console.log('');
  console.log('⚠️  WARNING: This client does NOT use state parameter');
  console.log('⚠️  CSRF attacks will succeed on this client!');
  console.log('========================================\n');
});