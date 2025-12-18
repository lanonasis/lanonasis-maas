#!/bin/bash
# Quick test server for dashboard on port 3005
# Uses the decommissioned quickauth port for testing

cd "$(dirname "$0")"

echo "🚀 Starting Dashboard Test Server on port 3005..."
echo "📍 Access at: http://localhost:3005"
echo ""

# Check if already running
if lsof -Pi :3005 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3005 is already in use!"
    echo "   Kill existing process or use a different port"
    exit 1
fi

# Start preview server (serves built dist folder)
bun run preview --port 3005 --host 0.0.0.0

