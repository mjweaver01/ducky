#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🦆 ducky - Local Development Environment                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if everything is built
if [ ! -d "packages/server/dist" ] || [ ! -d "packages/cli/dist" ] || [ ! -d "packages/database/dist" ] || [ ! -d "packages/web-backend/dist" ]; then
    echo -e "${YELLOW}→ Building packages...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}"
    echo ""
fi

# Start PostgreSQL
echo -e "${YELLOW}→ Starting PostgreSQL...${NC}"
docker compose -f docker-compose.dev.yml up -d postgres
echo -e "${GREEN}✓ PostgreSQL started${NC}"

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}→ Waiting for PostgreSQL to be ready...${NC}"
sleep 3
until docker exec ngrok-clone-postgres pg_isready -U ngrok > /dev/null 2>&1; do
    echo "  Waiting for database..."
    sleep 1
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
echo ""

# Create log directory
mkdir -p logs

# Start tunnel server in background
echo -e "${YELLOW}→ Starting tunnel server (port 3000, 3001)...${NC}"
npm run dev:server > logs/server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > logs/server.pid
echo -e "${GREEN}✓ Tunnel server started (PID: $SERVER_PID)${NC}"

# Start web backend in background
echo -e "${YELLOW}→ Starting web backend API (port 3002)...${NC}"
npm run dev:web-backend > logs/web-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > logs/web-backend.pid
echo -e "${GREEN}✓ Web backend started (PID: $BACKEND_PID)${NC}"

# Wait a bit for servers to start
sleep 3

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Backend services running!${NC}"
echo ""
echo -e "${YELLOW}Services:${NC}"
echo "  • PostgreSQL:    http://localhost:5432"
echo "  • Tunnel Server: http://localhost:3000 (WS: 3001)"
echo "  • Web API:       http://localhost:3002"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  • Server:  tail -f logs/server.log"
echo "  • Backend: tail -f logs/web-backend.log"
echo ""
echo -e "${YELLOW}Health Checks:${NC}"
echo "  • curl http://localhost:3000/metrics"
echo "  • curl http://localhost:3002/health"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}→ Starting web frontend (port 5173)...${NC}"
echo -e "${BLUE}   Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}→ Shutting down services...${NC}"
    
    if [ -f logs/server.pid ]; then
        kill $(cat logs/server.pid) 2>/dev/null || true
        rm logs/server.pid
    fi
    
    if [ -f logs/web-backend.pid ]; then
        kill $(cat logs/web-backend.pid) 2>/dev/null || true
        rm logs/web-backend.pid
    fi
    
    echo -e "${GREEN}✓ Services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Start frontend (this will block and show output)
cd packages/web-frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}→ Installing frontend dependencies...${NC}"
    npm install
fi

npm run dev
