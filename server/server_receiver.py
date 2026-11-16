# -*- coding: utf-8 -*-
"""电脑端接收服务：接收手机 App 同步的体脂秤数据，落本地 JSONL。
复用 mi-fitness-mcp-cn 的 Python 环境，不装新依赖（仅标准库 http.server）。

用法：
  python server_receiver.py --port 8765
  电脑端保持运行，手机 App 在同局域网内点「同步到电脑」。
"""
import argparse
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "received.jsonl")

lock = threading.Lock()
seen_times = set()


class Handler(BaseHTTPRequestHandler):
    out_path = DEFAULT_OUT

    def _send(self, code, body=b"{}"):
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/ping"):
            self._send(200, json.dumps({"ok": True}).encode())
        else:
            self._send(404)

    def do_POST(self):
        if self.path.startswith("/records"):
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length) or b"{}")
                records = data.get("records", [])
                received = 0
                with lock:
                    with open(self.out_path, "a", encoding="utf-8") as f:
                        for rec in records:
                            key = rec.get("time")
                            if key and key in seen_times:
                                continue
                            if key:
                                seen_times.add(key)
                            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                            received += 1
                self._send(200, json.dumps({"ok": True, "received": received}).encode())
            except Exception as e:
                self._send(400, json.dumps({"ok": False, "error": str(e)}).encode())
        else:
            self._send(404)

    def log_message(self, fmt, *args):
        # 简化日志
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()
    Handler.out_path = args.out
    httpd = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    print("体脂秤接收服务已启动：http://0.0.0.0:%d" % args.port)
    print("接收文件：%s" % args.out)
    print("手机 App 同步地址：http://<电脑局域网IP>:%d/records" % args.port)
    print("按 Ctrl+C 停止")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
