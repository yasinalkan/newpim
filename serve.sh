#!/bin/bash
# Simple HTTP Server for PIM Application (Unix/Mac)
# No npm required - just run this script after building

PORT=3000
DIRECTORY="dist"

# Check if dist directory exists
if [ ! -d "$DIRECTORY" ]; then
    echo "Error: '$DIRECTORY' directory not found!"
    echo "Please run 'npm run build' first to create the production build."
    exit 1
fi

echo "============================================================"
echo "  PIM Application Server Running"
echo "============================================================"
echo "  URL: http://localhost:$PORT"
echo "  Serving from: ./$DIRECTORY"
echo "  Press Ctrl+C to stop"
echo "============================================================"
echo ""

# Start Python HTTP server
python3 -m http.server $PORT --directory $DIRECTORY
