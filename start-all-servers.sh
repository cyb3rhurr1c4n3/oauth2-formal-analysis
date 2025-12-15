#!/bin/bash

# OAuth 2.0 Demo - Start All Servers
# This script starts all required servers for the security demonstration

echo "════════════════════════════════════════════════════════════════"
echo "  OAuth 2.0 Security Demo - Starting All Servers"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "Port $1 is already in use"
        return 1
    fi
    return 0
}

# Function to start a server in the background
start_server() {
    local name=$1
    local dir=$2
    local port=$3
    local command=$4
    
    echo "Starting $name on port $port..."
    
    if ! check_port $port; then
        echo "   Skipping (port in use)"
        return 1
    fi
    
    cd "$SCRIPT_DIR/$dir"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "   Installing dependencies..."
        npm install --silent > /dev/null 2>&1
    fi
    
    # Start the server in background
    $command > /dev/null 2>&1 &
    local pid=$!
    
    # Wait a moment and check if process is still running
    sleep 1
    if kill -0 $pid 2>/dev/null; then
        echo "   ✓ Started (PID: $pid)"
        return 0
    else
        echo "   ✗ Failed to start"
        return 1
    fi
}

echo "1. Starting Vulnerable Auth Server (Port 4000)..."
start_server "Vulnerable Auth Server" "auth-server-vulnerable" 4000 "node server.js"

echo ""
echo "2. Starting Vulnerable Client App (Port 3000)..."
start_server "Vulnerable Client App" "client-app-vulnerable" 3000 "node server.js"

echo ""
echo "3. Starting Secure Auth Server (Port 4001)..."
start_server "Secure Auth Server" "auth-server-secure" 4001 "node server.js"

echo ""
echo "4. Starting Secure Client App (Port 3001)..."
start_server "Secure Client App" "client-app-secure" 3001 "node server.js"

echo ""
echo "5. Starting HTTP Server for Demo Pages (Port 8000)..."
cd "$SCRIPT_DIR"
if ! check_port 8000; then
    echo "   Skipping (port in use)"
else
    python3 -m http.server 8000 > /dev/null 2>&1 &
    HTTP_PID=$!
    sleep 1
    if kill -0 $HTTP_PID 2>/dev/null; then
        echo "   ✓ Started (PID: $HTTP_PID)"
    else
        echo "   ✗ Failed to start"
    fi
fi




echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  All Servers Started!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Access Points:"
echo ""
echo "  VULNERABLE IMPLEMENTATION:"
echo "    • Client:      http://localhost:3000"
echo "    • Auth Server: http://localhost:4000"
echo ""
echo "  SECURE IMPLEMENTATION:"
echo "    • Client:      http://localhost:3001"
echo "    • Auth Server: http://localhost:4001"
echo ""
echo "  DEMO PAGES:"
echo "    • Attacks:     http://localhost:8000/attack-demo.html"
echo "    • Security:    http://localhost:8000/secure-attack-demo.html"
echo ""
echo "Test Credentials:"
echo "    • Username: demo"
echo "    • Password: password123"
echo "Have fun yey"