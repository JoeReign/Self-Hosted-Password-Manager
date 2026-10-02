"""Serve the production build on localhost with restrictive response headers."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BUILD = Path(__file__).resolve().parents[1] / "dist"
CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; "
    "img-src data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; font-src 'self'; "
    "base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'"
)


class StaticHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()


if __name__ == "__main__":
    if not (BUILD / "index.html").is_file():
        raise SystemExit("Run npm run build first, or use the included production build.")
    server = ThreadingHTTPServer(("127.0.0.1", 8000), partial(StaticHandler, directory=str(BUILD)))
    print("Local Vault: http://127.0.0.1:8000 (Ctrl+C to stop)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
