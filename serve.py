#!/usr/bin/env python3
"""
Simple HTTP Server for PIM Application
No npm required - just run this script after building
"""

import http.server
import socketserver
import os
import sys

PORT = 3000
DIRECTORY = "dist"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers for API calls
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Check if dist directory exists
    if not os.path.exists(DIRECTORY):
        print(f"Error: '{DIRECTORY}' directory not found!")
        print("Please run 'npm run build' first to create the production build.")
        sys.exit(1)
    
    # Create server
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print("=" * 60)
        print(f"  PIM Application Server Running")
        print("=" * 60)
        print(f"  URL: http://localhost:{PORT}")
        print(f"  Serving from: ./{DIRECTORY}")
        print(f"  Press Ctrl+C to stop")
        print("=" * 60)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()
