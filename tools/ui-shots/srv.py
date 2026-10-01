"""Сервер прототипа для кадров: тот же http.server, но с длинной очередью соединений. Без кэша Chrome просит сотни картинок разом,
а очередь по умолчанию (5) сбрасывает их — на карте вместо портрета битая картинка, не загружается screens/*.js.
  python tools/ui-shots/srv.py <порт> <папка>        например: python tools/ui-shots/srv.py 8811 design/ui
Слушает только 127.0.0.1. Для кадров shots.js — вместо python -m http.server."""
import functools
import http.server
import sys


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 512
    daemon_threads = True


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


port, root = int(sys.argv[1]), sys.argv[2]
Server(('127.0.0.1', port), functools.partial(Quiet, directory=root)).serve_forever()
