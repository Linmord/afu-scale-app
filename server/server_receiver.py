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
seen_keys = set()


def load_seen(path):
    """启动时把已落盘记录的 key 读进内存，避免服务重启后重复接收。"""
    if not os.path.exists(path):
        return
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    o = json.loads(line)
                    k = _rec_key(o)
                    if k:
                        seen_keys.add(k)
                except Exception:
                    continue
    except Exception:
        pass


def _rec_key(rec):
    """去重键：优先用前端生成的唯一 id；老数据回退到 time+unit+weight。"""
    if not isinstance(rec, dict):
        return None
    rid = rec.get("id")
    if rid:
        return "id:" + str(rid)
    t = rec.get("time")
    if t:
        return "t:%s|%s|%s" % (t, rec.get("unit"), rec.get("weight_kg"))
    return None


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
            return
        if self.path.startswith("/records"):
            # 拉取远端已有记录，供手机端合并
            try:
                out = []
                with lock:
                    if os.path.exists(self.out_path):
                        with open(self.out_path, encoding="utf-8") as f:
                            for line in f:
                                line = line.strip()
                                if line:
                                    try:
                                        out.append(json.loads(line))
                                    except Exception:
                                        continue
                body = json.dumps({"ok": True, "records": out, "count": len(out)}, ensure_ascii=False).encode()
                self._send(200, body)
            except Exception as e:
                self._send(500, json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False).encode())
            return
        self._send(404)

    def do_POST(self):
        if self.path.startswith("/records"):
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length) or b"{}")
                records = data.get("records", [])
                received = 0
                skipped = 0
                with lock:
                    with open(self.out_path, "a", encoding="utf-8") as f:
                        for rec in records:
                            key = _rec_key(rec)
                            if key and key in seen_keys:
                                skipped += 1
                                continue
                            if key:
                                seen_keys.add(key)
                            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                            received += 1
                print("[dedup] 新增 %d 条，跳过重复 %d 条" % (received, skipped))
                self._send(200, json.dumps({
                    "ok": True, "received": received, "skipped": skipped
                }).encode())
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
    load_seen(args.out)
    print("已装载历史去重键 %d 条" % len(seen_keys))
    httpd = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    print("体脂秤接收服务已启动：http://0.0.0.0:%d" % args.port)
    print("接收文件：%s" % args.out)
    print("手机 App 同步地址：http://<电脑局域网IP>:%d/records" % args.port)
    print("按 Ctrl+C 停止")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
