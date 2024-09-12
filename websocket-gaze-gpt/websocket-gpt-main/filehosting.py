import http.server
import socketserver
import os

# Get the PORT from the environment variable
PORT = int(os.getenv('PORT', 8000))
FILE_SERVER = os.getenv('FILE_SERVER', f'http://localhost:{PORT}')

handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"Server started at {FILE_SERVER}")
    httpd.serve_forever()
