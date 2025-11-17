/**
 * AUTHORIZATION SERVER - PHIÊN BẢN CÓ LỖ HỔNG
 * 
 * Lỗ hổng được cố tình thêm vào:
 * 1. Không validate redirect_uri đúng cách (cho phép open redirect)
 * 2. Không sử dụng state parameter (dễ bị CSRF)
 * 3. Authorization code có thể tái sử dụng
 * 4. Không kiểm tra client_id khi đổi code lấy token
 * 5. Access token không có thời gian hết hạn
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Secret key (trong thực tế nên lưu an toàn)
const JWT_SECRET = 'vulnerable-secret-key-123';

// Database giả lập
const clients = {
    'client-vulnerable-app': {
        client_secret: 'secret-123',
        redirect_uris: ['http://localhost:3002/callback'] // LỖ HỔNG: Không validate chặt chẽ
    }
};

const users = {
    'user@example.com': {
        password: 'password123',
        name: 'Nguyễn Văn A',
        email: 'user@example.com'
    }
};

const authorizationCodes = {}; // LỖ HỔNG: Lưu trữ đơn giản, không có TTL
const accessTokens = {}; // LỖ HỔNG: Không có expiration

// Trang đăng nhập
app.get('/login', (req, res) => {
    const { client_id, redirect_uri, response_type, scope, state } = req.query;
    
    // LỖ HỔNG: Không validate redirect_uri nghiêm ngặt
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Server - Login (VULNERABLE)</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 400px;
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
                .warning {
                    background: #fff3cd;
                    border: 1px solid #ffc107;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                    color: #856404;
                }
                input {
                    width: 100%;
                    padding: 10px;
                    margin: 10px 0;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-sizing: border-box;
                }
                button {
                    width: 100%;
                    padding: 12px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                }
                button:hover {
                    background: #0056b3;
                }
                .vulnerability-list {
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🔓 VULNERABLE Authorization Server</h2>
                <div class="vulnerability-list">
                    <strong>⚠️ Lỗ hổng có trong version này:</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>Không validate redirect_uri</li>
                        <li>Không sử dụng state (CSRF)</li>
                        <li>Auth code có thể tái sử dụng</li>
                        <li>Không verify client khi exchange token</li>
                    </ul>
                </div>
                <form action="/authorize" method="POST">
                    <input type="email" name="email" placeholder="Email" value="user@example.com" required>
                    <input type="password" name="password" placeholder="Password" value="password123" required>
                    <input type="hidden" name="client_id" value="${client_id}">
                    <input type="hidden" name="redirect_uri" value="${redirect_uri}">
                    <input type="hidden" name="response_type" value="${response_type}">
                    <input type="hidden" name="scope" value="${scope || ''}">
                    <input type="hidden" name="state" value="${state || ''}">
                    <button type="submit">Login & Authorize</button>
                </form>
                <p style="font-size: 12px; color: #666; margin-top: 15px;">
                    Demo credentials: user@example.com / password123
                </p>
            </div>
        </body>
        </html>
    `);
});

// Xử lý authorization
app.post('/authorize', (req, res) => {
    const { email, password, client_id, redirect_uri, response_type, scope, state } = req.body;
    
    // Xác thực user
    const user = users[email];
    if (!user || user.password !== password) {
        return res.status(401).send('Invalid credentials');
    }
    
    // LỖ HỔNG 1: Không validate redirect_uri nghiêm ngặt
    // Attacker có thể inject redirect_uri độc hại
    
    // LỖ HỔNG 2: Không kiểm tra client_id có tồn tại
    
    if (response_type === 'code') {
        // Tạo authorization code
        const code = uuidv4();
        
        // LỖ HỔNG 3: Lưu trữ code mà không có TTL, có thể tái sử dụng
        authorizationCodes[code] = {
            client_id,
            redirect_uri,
            user_email: email,
            scope: scope || 'profile',
            used: false // LỖ HỔNG: Không enforce việc này
        };
        
        // LỖ HỔNG 4: Không sử dụng state parameter để chống CSRF
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.append('code', code);
        if (state) {
            redirectUrl.searchParams.append('state', state);
        }
        
        console.log(`[VULNERABLE] Issuing auth code: ${code} for user: ${email}`);
        console.log(`[VULNERABLE] Redirecting to: ${redirectUrl.toString()}`);
        
        res.redirect(redirectUrl.toString());
    } else {
        res.status(400).send('Unsupported response_type');
    }
});

// Token endpoint
app.post('/token', (req, res) => {
    const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;
    
    if (grant_type !== 'authorization_code') {
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }
    
    const authCode = authorizationCodes[code];
    
    if (!authCode) {
        return res.status(400).json({ error: 'invalid_code' });
    }
    
    // LỖ HỔNG 5: Không kiểm tra client_id và client_secret nghiêm ngặt
    // Attacker có thể sử dụng code của victim mà không cần credentials
    
    // Lỗ HỔNG 6: Không kiểm tra redirect_uri khớp với lúc authorize
    
    // LỖ HỔNG 7: Authorization code có thể sử dụng nhiều lần
    // if (authCode.used) {
    //     return res.status(400).json({ error: 'code_already_used' });
    // }
    
    // Tạo access token
    const accessToken = jwt.sign({
        sub: authCode.user_email,
        client_id: authCode.client_id,
        scope: authCode.scope
    }, JWT_SECRET); // LỖ HỔNG 8: Không có expiresIn
    
    accessTokens[accessToken] = {
        user_email: authCode.user_email,
        client_id: authCode.client_id,
        scope: authCode.scope
    };
    
    console.log(`[VULNERABLE] Issuing access token for: ${authCode.user_email}`);
    console.log(`[VULNERABLE] Code reuse is allowed!`);
    
    res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        scope: authCode.scope
        // LỖ HỔNG: Không có expires_in
    });
});

// User info endpoint
app.get('/userinfo', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    
    const token = authHeader.substring(7);
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users[decoded.sub];
        
        if (!user) {
            return res.status(404).json({ error: 'user_not_found' });
        }
        
        res.json({
            email: user.email,
            name: user.name
        });
    } catch (err) {
        res.status(401).json({ error: 'invalid_token' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        version: 'vulnerable',
        vulnerabilities: [
            'No redirect_uri validation',
            'No state parameter enforcement',
            'Authorization code reuse allowed',
            'Weak client authentication',
            'No token expiration'
        ]
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🔓 VULNERABLE Authorization Server running on http://localhost:' + PORT);
    console.log('='.repeat(60));
    console.log('⚠️  This server contains intentional security vulnerabilities!');
    console.log('📋 Vulnerabilities included:');
    console.log('   1. No redirect_uri validation (Open Redirect)');
    console.log('   2. No state parameter (CSRF vulnerable)');
    console.log('   3. Authorization code can be reused');
    console.log('   4. Weak client verification');
    console.log('   5. No token expiration');
    console.log('='.repeat(60));
});