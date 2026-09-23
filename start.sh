#!/usr/bin/env bash

# ===================================================
# TerraPrime Platform Starter Script
# Starts PostgreSQL (PostGIS), Backend, and Frontend
# ===================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PG_DATA="/home/amanuel/realestate_pgdata"
PG_BIN="/usr/lib/postgresql/18/bin/pg_ctl"
POSTGIS_LIB="/home/amanuel/postgis_extracted/usr/lib/x86_64-linux-gnu"

echo "Starting TerraPrime Platform..."

# 1. Ensure PostgreSQL is running
if ! $PG_BIN -D "$PG_DATA" status > /dev/null 2>&1; then
  echo "Starting PostgreSQL 18 with PostGIS 3.6 on port 5433..."
  LD_LIBRARY_PATH="$POSTGIS_LIB" $PG_BIN -D "$PG_DATA" -l "$PG_DATA/logfile" start
else
  echo "PostgreSQL is already running on port 5433."
fi

# 2. Function to kill child processes on exit
cleanup() {
  echo ""
  echo "Shutting down backend and frontend..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 3. Start Backend
echo " Starting Node.js Backend API on port 5000..."
cd "$DIR/backend"
npm run dev &
BACKEND_PID=$!

# Wait briefly for backend
sleep 2

# 4. Start Frontend
echo "Starting Vite Frontend on port 5173..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================================"
echo "TerraPrime is Live!"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:5000"
echo " Health:   http://localhost:5000/health"
echo "============================================================"
echo "Press Ctrl+C to stop both servers."

wait
