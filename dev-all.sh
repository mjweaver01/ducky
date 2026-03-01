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

# Load root .env so all packages (server, web-backend, etc.) inherit env when run via this script
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Check if everything is built
if [ ! -d "packages/server/dist" ] || [ ! -d "packages/cli/dist" ] || [ ! -d "packages/database/dist" ] || [ ! -d "packages/web-backend/dist" ]; then
    echo -e "${YELLOW}→ Building packages...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}"
    echo ""
fi

# Start PostgreSQL (start Docker Compose service if not running)
echo -e "${YELLOW}→ Starting PostgreSQL...${NC}"
if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}Docker is not running. Start Docker Desktop (or the Docker daemon) and run npm run dev again.${NC}"
  exit 1
fi
docker compose -f docker-compose.dev.yml up -d postgres
echo -e "${GREEN}✓ PostgreSQL started${NC}"

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}→ Waiting for PostgreSQL to be ready...${NC}"
sleep 3
until docker exec ducky-postgres pg_isready -U ducky > /dev/null 2>&1; do
    echo "  Waiting for database..."
    sleep 1
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
echo ""

# Create log directory
mkdir -p logs

# Kill anything already on 3000, 3001, 3002 so our new processes bind
for port in 3000 3001 3002; do
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
  fi
done
sleep 1

# Start tunnel server in background (TUNNEL_PORT=3001 so CLI can use ws://localhost:3001)
echo -e "${YELLOW}→ Starting tunnel server (port 3000, 3001)...${NC}"
TUNNEL_PORT=3001 npm run dev:server > logs/server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > logs/server.pid
echo -e "${GREEN}✓ Tunnel server started (PID: $SERVER_PID)${NC}"

# Start web backend in background (use Docker Postgres credentials so .env doesn't need editing)
export DATABASE_NAME=ducky DATABASE_USER=ducky DATABASE_PASSWORD=ducky_password
echo -e "${YELLOW}→ Starting web backend API (port 3002)...${NC}"
npm run dev:web-backend > logs/web-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > logs/web-backend.pid
echo -e "${GREEN}✓ Web backend started (PID: $BACKEND_PID)${NC}"

# Wait for web backend to be reachable (avoid "connection refused" when frontend loads)
echo -e "${YELLOW}→ Waiting for web backend (port 3002)...${NC}"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health 2>/dev/null | grep -q 200; then
    echo -e "${GREEN}✓ Web backend ready${NC}"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "${RED}Web backend did not become ready. Check logs/web-backend.log${NC}"
    exit 1
  fi
  sleep 1
done
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Backend services running!${NC}"
echo ""
echo -e "${YELLOW}Services:${NC}"
echo "  • PostgreSQL:     localhost:5432"
echo "  • Tunnel Server:  http://localhost:3000 (WS: 3001)"
echo "  • Web API:        http://localhost:3002 (backend for app)"
echo "  • Web UI:         http://localhost:5173 (open in browser)"
echo ""
echo -e "${YELLOW}Tunnel (ducky CLI):${NC}"
echo "  ducky http 5173 --server-url ws://localhost:3001"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  • Server:  tail -f logs/server.log"
echo "  • Backend: tail -f logs/web-backend.log"
echo ""
echo -e "${YELLOW}Health:${NC}"
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
