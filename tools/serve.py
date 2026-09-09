#!/usr/bin/env python3
"""
개발용 정적 서버.

  · 0.0.0.0 에 붙어서 같은 와이파이의 핸드폰에서도 접속된다
  · Cache-Control: no-store 를 붙여, 파일을 고치고 새로고침하면 바로 반영된다
    (기본 http.server 는 브라우저가 옛 파일을 계속 쓰는 일이 잦다)
  · 시작할 때 핸드폰에 입력할 주소를 찍어 준다

  python3 tools/serve.py          # 5177 포트
  python3 tools/serve.py 8000     # 포트 지정
"""
import http.server
import os
import socket
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '404' in (fmt % args):
            return                      # 스킨 슬롯 탐색으로 나는 404 는 조용히
        super().log_message(fmt, *args)


def lan_ip():
    """이 기기의 랜 IP. 패킷을 실제로 보내지는 않고 라우팅만 물어본다."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('192.168.1.1', 1))
        return s.getsockname()[0]
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return None
    finally:
        s.close()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5177
    ip = lan_ip()
    print('KINGSAN-RUN 개발 서버')
    print('  이 컴퓨터   http://localhost:%d' % port)
    if ip and not ip.startswith('127.'):
        print('  핸드폰      http://%s:%d      <- 같은 와이파이에서 이 주소' % (ip, port))
    else:
        print('  (랜 IP 를 못 찾았다. 시스템 설정 > 네트워크 에서 IP 확인)')
    print('  Ctrl+C 로 종료\n')
    http.server.ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
