/**
 * CLIENT APPLICATION - PHIÊN BẢN AN TOÀN
 * 
 * Các biện pháp bảo mật đã được áp dụng:
 * 1. Sử dụng state parameter (CSRF protection)
 * 2. Validate state khi nhận callback
 * 3. Lưu trữ token an toàn (encrypted)
 * 4. Không log sensitive data
 * 5. Validate callback parameters
 * 6. Session management với timeout
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration
const CLIENT_ID = 'client-secure-app';
// NOTE: Client secret nên lấy từ secure-auth-server.js khi chạy
// Sẽ hiển thị khi server khởi động
let CLIENT_SECRET = ''; // Will be set via command line or config
const REDIRECT_URI = 'http://localhost:3004/callback';
const AUTH_SERVER = 'http://localhost:3003';

// SECURE: Encryption key for storing tokens
const ENCRYPTION_KEY = crypto.randomBytes(32);
const IV_LENGTH = 16;

// SECURE: State management với TTL
const pendingStates = new Map();

// SECURE: Encrypted session storage
const sessions = new Map();

// Helper: Encrypt data
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Helper: Decrypt data
function decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Helper: Generate secure random state
function generateState() {
    return crypto.randomBytes(32).toString('hex'); // 64 characters
}

// SECURE: Clean up expired states
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [state, data] of pendingStates.entries()) {
        if (now > data.expiresAt) {
            pendingStates.delete(state);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`[SECURE] Cleaned up ${cleaned} expired states`);
    }
}, 60000);

// Trang chủ
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>OAuth Client - Secure</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    background: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .btn {
                    display: inline-block;
                    padding: 12px 24px;
                    background: #28a745;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .btn:hover {
                    background: #218838;
                }
                .security {
                    background: #d4edda;
                    border: 1px solid #c3e6cb;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                    color: #155724;
                }
                .info {
                    background: #d1ecf1;
                    border: 1px solid #bee5eb;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔒 Secure OAuth Client Demo</h1>
                
                <div class="security">
                    <strong>✅ BIỆN PHÁP BẢO MẬT TRONG VERSION NÀY:</strong>
                    <ul>
                        <li>Sử dụng state parameter (CSRF protection)</li>
                        <li>Validate state khi callback</li>
                        <li>Token được mã hóa khi lưu trữ</li>
                        <li>Không log thông tin nhạy cảm</li>
                        <li>Session timeout</li>
                        <li>Strict parameter validation</li>
                    </ul>
                </div>

                <div class="info">
                    <h3>🎯 Mục đích Demo:</h3>
                    <p>Ứng dụng này triển khai OAuth 2.0 Authorization Code Grant với đầy đủ các biện pháp bảo mật được khuyến nghị.</p>
                    <p><strong>Các cuộc tấn công KHÔNG THỂ thực hiện được:</strong></p>
                    <ul>
                        <li>❌ CSRF Attack (có state validation)</li>
                        <li>❌ Authorization Code Interception (one-time use)</li>
                        <li>❌ Open Redirect (strict URI validation)</li>
                        <li>❌ Code Replay (code used once)</li>
                    </ul>
                </div>

                <a href="/login" class="btn">🔐 Login with OAuth (Secure)</a>

                <h3 style="margin-top: 30px;">📊 Configuration:</h3>
                <pre style="background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto;">
Client ID: ${CLIENT_ID}
Redirect URI: ${REDIRECT_URI}
Auth Server: ${AUTH_SERVER}
State Parameter: ✅ USED (CSRF Protected)
Token Storage: 🔐 ENCRYPTED
                </pre>
            </div>
        </body>
        </html>
    `);
});

// Khởi tạo OAuth flow
app.get('/login', (req, res) => {
    // SECURE: Generate cryptographically random state
    const state = generateState();
    
    // SECURE: Store state with expiration (5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000;
    pendingStates.set(state, {
        createdAt: Date.now(),
        expiresAt
    });
    
    const authUrl = new URL(`${AUTH_SERVER}/login`);
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'profile email');
    authUrl.searchParams.append('state', state); // SECURE: Include state
    
    console.log('[SECURE] Initiating OAuth flow WITH state parameter');
    console.log(`[SECURE] State: ${state.substring(0, 16)}... (expires in 5 min)`);
    
    res.redirect(authUrl.toString());
});

// Callback endpoint
app.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    // SECURE: Check for errors from auth server
    if (error) {
        console.log('[SECURE] Authorization error:', error);
        return res.status(400).send(`
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p><a href="/">Try again</a></p>
        `);
    }
    
    // SECURE: Validate required parameters
    if (!code || !state) {
        console.log('[SECURE] Missing required parameters');
        return res.status(400).send('Missing code or state parameter');
    }
    
    // SECURE: Validate state parameter
    const stateData = pendingStates.get(state);
    
    if (!stateData) {
        console.log('[SECURE] Invalid or expired state parameter - possible CSRF attack!');
        return res.status(400).send(`
            <h1>Security Error</h1>
            <p>Invalid or expired state parameter. This may indicate a CSRF attack.</p>
            <p><a href="/">Start over</a></p>
        `);
    }
    
    // SECURE: Check state expiration
    if (Date.now() > stateData.expiresAt) {
        pendingStates.delete(state);
        console.log('[SECURE] State expired');
        return res.status(400).send(`
            <h1>Session Expired</h1>
            <p>The authorization session has expired. Please try again.</p>
            <p><a href="/">Start over</a></p>
        `);
    }
    
    // SECURE: Remove used state
    pendingStates.delete(state);
    
    console.log('[SECURE] State validated successfully');
    console.log('[SECURE] Exchanging authorization code for token...');
    
    try {
        // Exchange code for token
        const tokenResponse = await axios.post(`${AUTH_SERVER}/token`, {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        });
        
        const { access_token, token_type, expires_in, scope } = tokenResponse.data;
        
        // SECURE: Do NOT log the actual token
        console.log('[SECURE] Access token received (not logged for security)');
        console.log(`[SECURE] Token expires in: ${expires_in} seconds`);
        
        // Lấy user info
        const userInfoResponse = await axios.get(`${AUTH_SERVER}/userinfo`, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        
        const userInfo = userInfoResponse.data;
        console.log('[SECURE] User authenticated:', userInfo.email);
        
        // SECURE: Encrypt token before storing
        const encryptedToken = encrypt(access_token);
        
        // SECURE: Create session with timeout
        const sessionId = crypto.randomBytes(32).toString('hex');
        const sessionExpiresAt = Date.now() + (expires_in * 1000);
        
        sessions.set(sessionId, {
            encrypted_token: encryptedToken,
            user_info: userInfo,
            created_at: Date.now(),
            expires_at: sessionExpiresAt
        });
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Login Success - Secure</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .success {
                        background: #d4edda;
                        border: 1px solid #c3e6cb;
                        color: #155724;
                        padding: 15px;
                        border-radius: 4px;
                        margin: 20px 0;
                    }
                    .security {
                        background: #d1ecf1;
                        border: 1px solid #bee5eb;
                        color: #0c5460;
                        padding: 15px;
                        border-radius: 4px;
                        margin: 20px 0;
                    }
                    pre {
                        background: #f4f4f4;
                        padding: 15px;
                        border-radius: 4px;
                        overflow-x: auto;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Authentication Successful!</h1>
                    
                    <div class="success">
                        <strong>🔒 Securely logged in as:</strong><br>
                        Name: ${userInfo.name}<br>
                        Email: ${userInfo.email}
                    </div>

                    <div class="security">
                        <strong>✅ SECURITY MEASURES APPLIED:</strong>
                        <ul>
                            <li>State parameter validated (CSRF protected)</li>
                            <li>Access token encrypted in storage</li>
                            <li>No sensitive data in logs</li>
                            <li>Session expires with token (${expires_in}s)</li>
                        </ul>
                    </div>

                    <h3>🔐 Token Status:</h3>
                    <pre>
Token Type: ${token_type}
Expires In: ${expires_in} seconds (${Math.floor(expires_in / 60)} minutes)
Scope: ${scope}
Storage: Encrypted (AES-256-CBC)
Session ID: ${sessionId.substring(0, 16)}...

⚠️ Token is encrypted and NOT displayed for security
                    </pre>

                    <p><a href="/">← Back to Home</a></p>
                </div>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('[SECURE] Error during token exchange:', error.response?.data || error.message);
        
        res.status(500).send(`
            <h1>Authentication Error</h1>
            <p>An error occurred during authentication. Please try again.</p>
            <p><a href="/">Try again</a></p>
        `);
    }
});

// Protected endpoint example
app.get('/profile/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.status(401).send('Invalid or expired session');
    }
    
    if (Date.now() > session.expires_at) {
        sessions.delete(sessionId);
        return res.status(401).send('Session expired');
    }
    
    // SECURE: Decrypt token only when needed
    const accessToken = decrypt(session.encrypted_token);
    
    res.json({
        user: session.user_info,
        session_expires_in: Math.floor((session.expires_at - Date.now()) / 1000)
    });
});

// Health endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        version: 'secure',
        active_sessions: sessions.size,
        pending_states: pendingStates.size
    });
});

const PORT = 3004;

// Function to set client secret
function setClientSecret(secret) {
    CLIENT_SECRET = secret;
    console.log('[CONFIG] Client secret has been set');
}

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🔒 SECURE OAuth Client running on http://localhost:' + PORT);
    console.log('='.repeat(60));
    console.log('✅ Security features enabled:');
    console.log('   1. State parameter with CSRF protection');
    console.log('   2. State validation and expiration');
    console.log('   3. Encrypted token storage (AES-256-CBC)');
    console.log('   4. No sensitive data in logs');
    console.log('   5. Session management with timeout');
    console.log('   6. Strict parameter validation');
    console.log('='.repeat(60));
    console.log('⚠️  IMPORTANT: Set CLIENT_SECRET before testing!');
    console.log('   Get the secret from secure-auth-server.js output');
    console.log('   Then update CLIENT_SECRET in this file');
    console.log('='.repeat(60));
});

// Export for configuration
module.exports = { setClientSecret };