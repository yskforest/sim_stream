#!/usr/bin/env python3
"""
CT Simulator Multi-Protocol Stream Server (Refactored)
Provides HTTP MJPEG, RTSP, and WebSocket ingestion in a clean, non-blocking class architecture.
"""
import base64, hashlib, json, re, socket, struct, threading, time

HTTP_PORT, RTSP_PORT = 8080, 8554
BOUNDARY = "ct_simulator_mjpeg_boundary"

class CTStreamServer:
    def __init__(self):
        self.lock = threading.Lock()
        self.frame = None
        self.last_time = time.time()
        self.start_time = time.time()
        self.http_clients = set()
        self.rtsp_clients = {}
        self.rtp_seq = 0

    def parse_jpeg_dims(self, jpeg):
        w, h = 640, 480
        try:
            off, end = 2, len(jpeg)
            while off < end - 8:
                while off < end and jpeg[off] == 0xFF: off += 1
                if off >= end: break
                m, off = jpeg[off], off + 1
                if m in (0xD8, 0xD9) or 0xD0 <= m <= 0xD7: continue
                if off + 2 > end: break
                mlen = (jpeg[off] << 8) | jpeg[off + 1]
                if m in (0xC0, 0xC2) and off + 7 < end:
                    h, w = struct.unpack(">HH", jpeg[off+3:off+7])
                    break
                off += mlen
        except Exception: pass
        return w, h

    def broadcast(self, buffer):
        with self.lock:
            self.frame = buffer
            http_socks = list(self.http_clients)
            rtsp_sessions = list(self.rtsp_clients.values())

        # HTTP MJPEG Broadcast
        chunk = f"--{BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: {len(buffer)}\r\n\r\n".encode() + buffer + b"\r\n"
        for sock in http_socks:
            try: sock.sendall(chunk)
            except Exception:
                with self.lock: self.http_clients.discard(sock)

        # RTSP RTP Broadcast
        if not rtsp_sessions: return
        w, h = self.parse_jpeg_dims(buffer)
        raw_jpeg = buffer[2:] if buffer.startswith(b"\xff\xd8") else buffer
        ts = int((time.time() - self.start_time) * 90000) & 0xFFFFFFFF
        chunk_sz, total = 1400, len(raw_jpeg)
        wb, hb = min(255, (w+7)//8), min(255, (h+7)//8)

        for sess in rtsp_sessions:
            if not sess.get("play") or sess.get("closed"): continue
            sock, ch, off = sess["socket"], sess["ch"], 0
            try:
                while off < total:
                    curr = min(chunk_sz, total - off)
                    data = raw_jpeg[off:off+curr]
                    is_last = (off + chunk_sz >= total)
                    
                    tcp = struct.pack(">BBH", 0x24, ch, 12 + 8 + curr)
                    rtp = struct.pack(">BBHII", 0x80, (0x80 if is_last else 0) | 26, self.rtp_seq & 0xFFFF, ts, 0x12345678)
                    jpg = struct.pack(">BBBBBBBB", 0, (off>>16)&0xFF, (off>>8)&0xFF, off&0xFF, 1, 0x50, wb, hb)
                    
                    sock.sendall(tcp + rtp + jpg + data)
                    self.rtp_seq = (self.rtp_seq + 1) & 0xFFFF
                    off += curr
                sess["frames"] += 1
            except Exception:
                sess["closed"] = True
                with self.lock: self.rtsp_clients.pop(sess["id"], None)

    def heartbeat(self):
        while True:
            time.sleep(0.1)
            if self.frame and time.time() - self.last_time >= 0.1 and self.rtsp_clients:
                self.broadcast(self.frame)

    def process_buffer(self, buf, is_ws=False):
        if not buf: return
        self.last_time = time.time()
        if is_ws:
            self.broadcast(buf)
            return
            
        idx = buf.find(b"\xff\xd8")
        if idx != -1:
            self.broadcast(buf[idx:])
            return
            
        try:
            txt = buf.decode("utf-8", "ignore")
            if "base64," in txt:
                self.broadcast(base64.b64decode(txt.split("base64,")[1].split('"')[0].split("'")[0].strip()))
        except Exception: pass

    def send_http(self, sock, code, ctype, body=None, extra=""):
        res = f"HTTP/1.1 {code}\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: {ctype}\r\n"
        if body is not None:
            res += f"Content-Length: {len(body)}\r\n{extra}\r\n"
            sock.sendall(res.encode() + body)
        else:
            sock.sendall((res + extra + "\r\n").encode())

    def handle_http(self, sock):
        try:
            sock.settimeout(10.0)
            req = b""
            while b"\r\n\r\n" not in req:
                c = sock.recv(4096)
                if not c: return
                req += c
                
            hdr_str, body = req.split(b"\r\n\r\n", 1)
            hdr = hdr_str.decode("utf-8", "ignore")
            lines = hdr.split("\r\n")
            meth, path = (lines[0].split(" ") + ["", ""])[:2]

            if meth == "OPTIONS":
                self.send_http(sock, "204 No Content", "text/plain", b"", "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n")
                return

            if "Upgrade: websocket" in hdr or "upgrade: websocket" in hdr:
                self.handle_ws(sock, hdr, body)
                return

            if meth == "POST" and path == "/upload-frame":
                cl = int(next((l.split(":")[1].strip() for l in lines if l.lower().startswith("content-length:")), "0"))
                while len(body) < cl:
                    c = sock.recv(min(cl - len(body), 65536))
                    if not c: break
                    body += c
                self.process_buffer(body)
                with self.lock:
                    n_h, n_r = len(self.http_clients), len(self.rtsp_clients)
                self.send_http(sock, "200 OK", "application/json", json.dumps({"success": True, "httpViewers": n_h, "rtspViewers": n_r}).encode())
                return

            if meth == "GET" and path == "/":
                with self.lock:
                    n_h, n_r = len(self.http_clients), len(self.rtsp_clients)
                html = f"<html><body style='font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:2rem;'><h1>[Stream Server] CT Simulator Stream Server (Optimized)</h1><p>HTTP: {HTTP_PORT} | RTSP: {RTSP_PORT}</p><p>Viewers - HTTP: {n_h} | RTSP: {n_r}</p><hr/><a href='/live/ct-camera.mjpg' style='color:#38bdf8'>MJPEG Stream</a><br/><br/><img src='/live/ct-camera.mjpg' style='max-width:640px;border:2px solid #38bdf8;border-radius:8px;'/></body></html>"
                self.send_http(sock, "200 OK", "text/html", html.encode())
                return

            if meth == "GET" and "/live/" in path:
                sock.settimeout(None)
                self.send_http(sock, "200 OK", f"multipart/x-mixed-replace; boundary={BOUNDARY}", None, "Cache-Control: no-cache\r\nConnection: keep-alive\r\n")
                with self.lock:
                    self.http_clients.add(sock)
                    if self.frame:
                        try: sock.sendall(f"--{BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: {len(self.frame)}\r\n\r\n".encode() + self.frame + b"\r\n")
                        except Exception: self.http_clients.discard(sock)
                return

            self.send_http(sock, "404 Not Found", "text/plain", b"")
        except Exception: pass
        finally:
            if sock not in self.http_clients: sock.close()

    def handle_ws(self, sock, hdr, body):
        try:
            key = next((l.split(":")[1].strip() for l in hdr.split("\r\n") if l.lower().startswith("sec-websocket-key:")), "")
            accept = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
            sock.sendall(f"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {accept}\r\n\r\n".encode())
            sock.settimeout(None)
            
            buf, frames = bytearray(body), bytearray()
            while True:
                c = sock.recv(4096)
                if not c: break
                buf.extend(c)
                while len(buf) >= 2:
                    fin, op, masked, plen, off = bool(buf[0]&0x80), buf[0]&0x0F, bool(buf[1]&0x80), buf[1]&0x7F, 2
                    if plen == 126: plen, off = struct.unpack(">H", buf[2:4])[0], 4
                    elif plen == 127: plen, off = struct.unpack(">Q", buf[2:10])[0], 10
                    if masked: mkey, off = buf[off:off+4], off+4
                    if len(buf) < off + plen: break
                    
                    pld = buf[off:off+plen]
                    if masked: pld = bytearray(b ^ mkey[i%4] for i, b in enumerate(pld))
                    
                    if op == 0x8: return
                    if op in (0x2, 0x0):
                        frames.extend(pld)
                        if fin:
                            self.process_buffer(bytes(frames), True)
                            frames.clear()
                    buf = buf[off+plen:]
        except Exception: pass
        finally: sock.close()

    def handle_rtsp(self, sock):
        sid = int(time.time()*1000)%100000000
        sess = {"id": sid, "cseq": "1", "ch": 0, "play": False, "socket": sock, "frames": 0, "closed": False}
        def reply(code, extra=""): sock.sendall(f"RTSP/1.0 {code}\r\nCSeq: {sess['cseq']}\r\n{extra}\r\n".encode())

        try:
            while not sess["closed"]:
                d = sock.recv(2048)
                if not d: break
                msg = d.decode("utf-8", "ignore")
                sess["cseq"] = next((m.group(1) for m in [re.search(r"CSeq:\s*(\d+)", msg, re.I)] if m), sess["cseq"])
                meth = msg.split(" ")[0]

                if meth == "OPTIONS": reply("200 OK", "Public: OPTIONS, DESCRIBE, SETUP, PLAY, TEARDOWN\r\n")
                elif meth == "DESCRIBE":
                    sdp = f"v=0\r\no=- {int(time.time())} 1 IN IP4 127.0.0.1\r\ns=CT Stream\r\nt=0 0\r\nm=video 0 RTP/AVP 26\r\nc=IN IP4 127.0.0.1\r\na=rtpmap:26 JPEG/90000\r\na=control:track0\r\na=framerate:30\r\n"
                    reply("200 OK", f"Content-Type: application/sdp\r\nContent-Length: {len(sdp)}\r\n\r\n{sdp}")
                elif meth == "SETUP":
                    trans = next((m.group(1) for m in [re.search(r"Transport:\s*([^\r\n]+)", msg, re.I)] if m), "")
                    sess["ch"] = int(next((m.group(1) for m in [re.search(r"interleaved=(\d+)", trans, re.I)] if m), 0))
                    if "interleaved" not in trans: trans = f"RTP/AVP/TCP;unicast;interleaved={sess['ch']}-{sess['ch']+1}"
                    reply("200 OK", f"Transport: {trans}\r\nSession: {sid};timeout=60\r\n")
                elif meth == "PLAY":
                    sess["play"] = True
                    with self.lock: self.rtsp_clients[sid] = sess
                    now_rtp = int((time.time() - self.start_time) * 90000) & 0xFFFFFFFF
                    reply("200 OK", f"Session: {sid}\r\nRange: npt=now-\r\nRTP-Info: url=track0;seq={self.rtp_seq & 0xffff};rtptime={now_rtp}\r\n")
                    if self.frame: self.broadcast(self.frame)
                elif meth == "TEARDOWN":
                    sess["play"] = False
                    with self.lock: self.rtsp_clients.pop(sid, None)
                    reply("200 OK")
                    break
        except Exception as e: print(f"[RTSP Exception]: {e}")
        finally:
            sess["closed"] = True
            with self.lock: self.rtsp_clients.pop(sid, None)
            sock.close()

    def start_server(self, port, handler):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", port))
        s.listen(50)
        while True:
            try: threading.Thread(target=handler, args=(s.accept()[0],), daemon=True).start()
            except Exception: break

    def run(self):
        threading.Thread(target=self.heartbeat, daemon=True).start()
        threading.Thread(target=self.start_server, args=(HTTP_PORT, self.handle_http), daemon=True).start()
        threading.Thread(target=self.start_server, args=(RTSP_PORT, self.handle_rtsp), daemon=True).start()
        print(f"===================================================\n[Stream Server] CT Simulator Stream Server (Optimized)\n[HTTP MJPEG]: http://127.0.0.1:{HTTP_PORT}/live/ct-camera.mjpg\n[RTSP Stream]: rtsp://127.0.0.1:{RTSP_PORT}/live/ct-camera.mp4\n===================================================")
        try:
            while True: time.sleep(1)
        except KeyboardInterrupt: print("\nShutting down stream server...")

if __name__ == "__main__":
    CTStreamServer().run()
