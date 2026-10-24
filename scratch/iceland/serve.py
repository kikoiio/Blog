"""Serve the Iceland prototype on loopback without a build or dependencies."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

HERE = Path(__file__).resolve().parent
PREFIX = '/scratch/iceland/'
PREVIOUS_ENTRIES = ('/scratch/polar-phase-shift/', '/scratch/polar-phase-shift/index.html')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def resolve_request(self):
        path = unquote(urlsplit(self.path).path)
        if not path.startswith(PREFIX):
            return None
        target = (HERE / path[len(PREFIX):]).resolve()
        return target if target.is_relative_to(HERE) else None

    def translate_path(self, path):
        return str(self.resolve_request())

    def check_request(self):
        if urlsplit(self.path).path in ('/', *PREVIOUS_ENTRIES):
            self.send_response(302)
            self.send_header('Location', PREFIX)
            self.end_headers()
            return False
        if self.resolve_request() is None:
            self.send_error(404)
            return False
        return True

    def do_GET(self):
        if self.check_request():
            super().do_GET()

    def do_HEAD(self):
        if self.check_request():
            super().do_HEAD()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8153)
    args = parser.parse_args()
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
