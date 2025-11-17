/**
 * CLIENT APPLICATION - PHIÊN BẢN CÓ LỖ HỔNG
 * 
 * Lỗ hổng được cố tình thêm vào:
 * 1. Không sử dụng state parameter (dễ bị CSRF)
 * 2. Không validate state (nếu có)
 * 3. Lưu trữ token không an toàn
 * 4. Log sensitive data
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration
const CLIENT_ID = 'client-vulnerable-app';
const CLIENT_SECRET = 'secret-123';
const REDIRECT_URI = 'http://localhost:3002/callback';
const AUTH_SERVER = 'http://localhost:3001';

// LỖ HỔNG: Lưu trữ tokens trong memory đơn giản, không mã hóa
const sessions = {};

// Trang chủ
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>OAuth Client - Vulnerable</title>
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
                    background: #dc3545;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .btn:hover {
                    background: #c82333;
                }
                .warning {
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
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
                <h1>🔓 Vulnerable OAuth Client Demo</h1>
                
                <div class="warning">
                    <strong>⚠️ LỖ HỔNG TRONG VERSION NÀY:</strong>
                    <ul>
                        <li>Không sử dụng state parameter (dễ bị CSRF)</li>
                        <li>Lưu trữ token không an toàn</li>
                        <li>Log thông tin nhạy cảm</li>
                        <li>Không validate callback đúng cách</li>
                    </ul>
                </div>

                <div class="info">
                    <h3>🎯 Mục đích Demo:</h3>
                    <p>Ứng dụng này cố tình chứa các lỗ hổng bảo mật phổ biến trong OAuth 2.0 để demo việc khai thác.</p>
                    <p><strong>Các cuộc tấn công có thể thực hiện:</strong></p>
                    <ul>
                        <li>Authorization Code Interception</li>
                        <li>CSRF Attack (không có state)</li>
                        <li>Open Redirect Attack</li>
                        <li>Code Replay Attack</li>
                    </ul>
                </div>

                <a href="/login" class="btn">🔐 Login with OAuth (Vulnerable)</a>

                <h3 style="margin-top: 30px;">📊 Debug Info:</h3>
                <pre style="background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto;">
Configuration:
- Client ID: ${CLIENT_ID}
- Redirect URI: ${REDIRECT_URI}
- Auth Server: ${AUTH_SERVER}
- State Parameter: ❌ NOT USED (Vulnerable to CSRF!)
                </pre>
            </div>
        </body>
        </html>
    `);
});

// Khởi tạo OAuth flow
app.get('/login', (req, res) => {
    // LỖ HỔNG 1: Không sử dụng state parameter
    // const state = generateRandomState(); // KHÔNG DÙNG!
    
    const authUrl = new URL(`${AUTH_SERVER}/login`);
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'profile email');
    // LỖ HỔNG: Không append state parameter
    
    console.log('[VULNERABLE] Initiating OAuth flow WITHOUT state parameter');
    console.log('[VULNERABLE] Authorization URL:', authUrl.toString());
    
    res.redirect(authUrl.toString());
});

// Callback endpoint
app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
        return res.status(400).send('Missing authorization code');
    }
    
    // LỖ HỔNG 2: Không validate state parameter
    // if (state !== expectedState) { ... } // KHÔNG KIỂM TRA!
    
    console.log('[VULNERABLE] Received authorization code:', code);
    console.log('[VULNERABLE] State:', state || 'NOT PROVIDED');
    
    try {
        // Exchange code for token
        const tokenResponse = await axios.post(`${AUTH_SERVER}/token`, {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        });
        
        const { access_token, token_type, scope } = tokenResponse.data;
        
        // LỖ HỔNG 3: Log sensitive data
        console.log('[VULNERABLE] Access Token:', access_token);
        console.log('[VULNERABLE] Token Type:', token_type);
        
        // Lấy user info
        const userInfoResponse = await axios.get(`${AUTH_SERVER}/userinfo`, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        
        const userInfo = userInfoResponse.data;
        console.log('[VULNERABLE] User Info:', userInfo);
        
        // LỖ HỔNG 4: Lưu trữ token không an toàn (plain text trong memory)
        const sessionId = Math.random().toString(36).substring(7);
        sessions[sessionId] = {
            access_token,
            user_info: userInfo
        };
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Login Success - Vulnerable</title>
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
                    .warning {
                        background: #fff3cd;
                        border: 1px solid #ffc107;
                        color: #856404;
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
                    .token-display {
                        background: #f8d7da;
                        border: 1px solid #f5c6cb;
                        padding: 10px;
                        border-radius: 4px;
                        word-break: break-all;
                        font-family: monospace;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Authentication Successful!</h1>
                    
                    <div class="success">
                        <strong>You are now logged in as:</strong><br>
                        Name: ${userInfo.name}<br>
                        Email: ${userInfo.email}
                    </div>

                    <div class="warning">
                        <strong>⚠️ SECURITY ISSUES DETECTED:</strong>
                        <ul>
                            <li>Access token exposed in browser console</li>
                            <li>No state validation performed (CSRF risk)</li>
                            <li>Token stored in plain text</li>
                        </ul>
                    </div>

                    <h3>🔑 Access Token (EXPOSED - BAD PRACTICE!):</h3>
                    <div class="token-display">
                        ${access_token}
                    </div>

                    <h3>📋 Session Info:</h3>
                    <pre>
Session ID: ${sessionId}
Token Type: ${token_type}
Scope: ${scope || 'profile email'}
                    </pre>

                    <p><a href="/">← Back to Home</a></p>
                </div>

                <script>
                    // LỖ HỔNG: Log token to console
                    console.log('Access Token:', '${access_token}');
                    console.log('User Info:', ${JSON.stringify(userInfo)});
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('[VULNERABLE] Error during token exchange:', error.message);
        res.status(500).send(`
            <h1>Error</h1>
            <p>${error.message}</p>
            <p><a href="/">Try again</a></p>
        `);
    }
});

// Debug endpoint để xem sessions
app.get('/debug/sessions', (req, res) => {
    res.json({
        warning: 'This endpoint exposes sensitive data - VULNERABLE!',
        sessions: sessions
    });
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🔓 VULNERABLE OAuth Client running on http://localhost:' + PORT);
    console.log('='.repeat(60));
    console.log('⚠️  This client contains intentional security vulnerabilities!');
    console.log('📋 Vulnerabilities included:');
    console.log('   1. No state parameter (CSRF attack possible)');
    console.log('   2. Tokens logged in plain text');
    console.log('   3. Insecure token storage');
    console.log('   4. Debug endpoint exposes sessions');
    console.log('='.repeat(60));
});