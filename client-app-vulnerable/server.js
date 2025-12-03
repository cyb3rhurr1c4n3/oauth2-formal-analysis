const express = require('express');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// VULNERABILITY: Using in-memory session store (lose sessions on restart)
// VULNERABILITY: Session cookie not using SameSite protection
app.use(session({
  secret: 'vulnerable-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, // VULNERABILITY: Not requiring HTTPS
    httpOnly: false, // VULNERABILITY: Allow JavaScript access for demo
    sameSite: 'none', // VULNERABILITY: Allow cross-site requests
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// OAuth 2.0 configuration
const OAUTH_CONFIG = {
  client_id: 'client-app-vulnerable',
  authorization_endpoint: 'http://localhost:4000/authorize',
  token_endpoint: 'http://localhost:4000/token',
  userinfo_endpoint: 'http://localhost:4000/userinfo',
  redirect_uri: 'http://localhost:3000/callback'  // Client-side callback - stores in localStorage
};

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve callback page (client-side version)
app.get('/callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'callback.html'));
});

// CSRF VULNERABLE: Server-side callback (NO STATE VALIDATION)
app.get('/callback-server', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.send(`
      <html>
        <body style="font-family: Arial; padding: 50px; background: #fee;">
          <h1 style="color: #e74c3c;">Authorization Failed</h1>
          <p>Error: ${error}</p>
          <a href="/">Go back</a>
        </body>
      </html>
    `);
  }
  
  if (!code) {
    return res.send(`
      <html>
        <body style="font-family: Arial; padding: 50px; background: #fee;">
          <h1 style="color: #e74c3c;">No Authorization Code</h1>
          <p>Missing authorization code in callback.</p>
          <a href="/">Go back</a>
        </body>
      </html>
    `);
  }
  
  // VULNERABILITY: NO STATE PARAMETER VALIDATION!
  // This allows CSRF attacks where attacker initiates OAuth 
  // but victim completes it, linking victim's account to attacker's session
  
  try {
    // Exchange authorization code for access token
    const fetch = (await import('node-fetch')).default;
    const tokenResponse = await fetch(OAUTH_CONFIG.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OAUTH_CONFIG.redirect_uri,
        client_id: OAUTH_CONFIG.client_id
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || errorData.error);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch(OAUTH_CONFIG.userinfo_endpoint, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    const userData = await userResponse.json();
    
    // VULNERABILITY: Store in session (vulnerable to CSRF)
    req.session.access_token = tokenData.access_token;
    req.session.user = userData;
    req.session.csrf_vulnerable = true;
    
    // Success page
    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success { color: #2ecc71; }
            .danger { 
              background: #fee;
              padding: 20px;
              border-left: 4px solid #e74c3c;
              margin: 20px 0;
            }
            .user-info {
              background: #ecf0f1;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            button {
              background: #3498db;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              margin: 10px 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">Login Successful!</h1>
            
            <div class="danger">
              <h3>CSRF VULNERABILITY ACTIVE</h3>
              <p>This session was created WITHOUT state parameter validation.</p>
              <p>If you clicked a malicious link, you may have just linked your account to an attacker's session!</p>
            </div>
            
            <div class="user-info">
              <h3>Logged in as:</h3>
              <p><strong>Name:</strong> ${userData.name}</p>
              <p><strong>Email:</strong> ${userData.email}</p>
              <p><strong>Username:</strong> ${userData.sub}</p>
            </div>
            
            <button onclick="window.location.href='/profile'">View Profile</button>
            <button onclick="window.location.href='/'">Go Home</button>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 50px; background: #fee;">
          <h1 style="color: #e74c3c;">Token Exchange Failed</h1>
          <p>Error: ${error.message}</p>
          <a href="/">Go back</a>
        </body>
      </html>
    `);
  }
});

// Profile page - shows current session
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  
  res.send(`
    <html>
      <head>
        <style>
          body {
            font-family: Arial;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
          }
          .user-box {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .danger {
            background: #fee;
            padding: 15px;
            border-left: 4px solid #e74c3c;
            margin: 20px 0;
          }
          button {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>User Profile</h1>
          
          ${req.session.csrf_vulnerable ? `
            <div class="danger">
              <strong>WARNING:</strong> This session was created without CSRF protection!
            </div>
          ` : ''}
          
          <div class="user-box">
            <h3>Session Information:</h3>
            <p><strong>Name:</strong> ${req.session.user.name}</p>
            <p><strong>Email:</strong> ${req.session.user.email}</p>
            <p><strong>Username:</strong> ${req.session.user.sub}</p>
            <p><strong>Session ID:</strong> ${req.sessionID}</p>
          </div>
          
          <button onclick="window.location.href='/logout'">Logout</button>
        </div>
      </body>
    </html>
  `);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// API endpoint to get OAuth config
app.get('/api/config', (req, res) => {
  res.json(OAUTH_CONFIG);
});

// Check session API
app.get('/api/session', (req, res) => {
  // Add CORS headers to allow cross-origin requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.session.user) {
    res.json({
      logged_in: true,
      user: req.session.user,
      csrf_vulnerable: req.session.csrf_vulnerable || false,
      session_id: req.sessionID
    });
  } else {
    res.json({ logged_in: false });
  }
});

// VULNERABILITY: Token exchange happens client-side in callback.html
// This exposes the authorization code and token in browser history and JavaScript

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🚨 VULNERABLE OAuth 2.0 Client Application');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Client running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  ⚠️  WARNING: This client contains intentional security');
  console.log('      vulnerabilities for educational purposes only.');
  console.log('      DO NOT use this code in production!');
  console.log('');
  console.log('  Pages:');
  console.log(`    • Home:     http://localhost:${PORT}/`);
  console.log(`    • Callback: http://localhost:${PORT}/callback`);
  console.log('');
  console.log('  Prerequisites:');
  console.log('    Make sure the vulnerable auth server is running at:');
  console.log('    http://localhost:4000');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});
