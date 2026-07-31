const http = require("http");
const net = require("net");

const HTTP_PORT = 8080;
const RTSP_PORT = 8554;
const BOUNDARY = "ct_simulator_mjpeg_boundary";

const httpClients = new Set();
const rtspClients = new Set();
let latestFrameBuffer = null;
const startTime = Date.now();

// ===================================================
// 1. HTTP ストリーミングサーバー (Port 8080)
// ===================================================
const httpServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // シミュレータからのフレーム受信 (POST /upload-frame)
    if (req.method === "POST" && req.url === "/upload-frame") {
        const chunks = [];
        req.on("data", (chunk) => {
            chunks.push(chunk);
        });
        req.on("end", () => {
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0) {
                if (buffer[0] === 0xff && buffer[1] === 0xd8) {
                    // 生の JPEG バイナリデータの直接処理（超高速）
                    latestFrameBuffer = buffer;
                } else {
                    const body = buffer.toString("utf8");
                    if (body.startsWith("data:image/jpeg;base64,")) {
                        const base64Data = body.replace(/^data:image\/jpeg;base64,/, "");
                        latestFrameBuffer = Buffer.from(base64Data, "base64");
                    }
                }

                if (latestFrameBuffer) {
                    broadcastHttpMjpeg(latestFrameBuffer);
                    broadcastRtspFrame(latestFrameBuffer);
                }
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, httpViewers: httpClients.size, rtspViewers: rtspClients.size }));
        });
        return;
    }

    // ブラウザ / VLC 向け HTTP MJPEG エンドポイント
    if (req.method === "GET" && (req.url.startsWith("/live/") || req.url === "/")) {
        if (req.url === "/") {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>CT Simulator Stream Server</title></head>
                <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem;">
                    <h1>🎥 CT Simulator Streaming Server</h1>
                    <p><strong>HTTP Port:</strong> ${HTTP_PORT} | <strong>RTSP Port:</strong> ${RTSP_PORT}</p>
                    <p><strong>HTTP Viewers:</strong> ${httpClients.size} | <strong>RTSP Viewers:</strong> ${rtspClients.size}</p>
                    <hr style="border-color: #334155;" />
                    <h3>📡 Stream Endpoints:</h3>
                    <ul>
                        <li><strong>HTTP MJPEG (VLC/Browser):</strong> <a href="http://127.0.0.1:${HTTP_PORT}/live/ct-camera.mjpg" target="_blank" style="color: #38bdf8;">http://127.0.0.1:${HTTP_PORT}/live/ct-camera.mjpg</a></li>
                        <li><strong>RTSP Stream:</strong> <code style="color: #a7f3d0;">rtsp://127.0.0.1:${RTSP_PORT}/live/ct-camera.mp4</code></li>
                    </ul>
                    <div style="margin-top: 1rem;">
                        <img src="/live/ct-camera.mjpg" style="border: 2px solid #38bdf8; max-width: 640px; border-radius: 8px;" alt="Live Stream Preview" />
                    </div>
                </body>
                </html>
            `);
            return;
        }

        res.writeHead(200, {
            "Content-Type": `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            Connection: "keep-alive",
        });

        httpClients.add(res);

        if (latestFrameBuffer) {
            sendHttpChunk(res, latestFrameBuffer);
        }

        req.on("close", () => {
            httpClients.delete(res);
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

function sendHttpChunk(res, buffer) {
    try {
        res.write(`--${BOUNDARY}\r\n`);
        res.write("Content-Type: image/jpeg\r\n");
        res.write(`Content-Length: ${buffer.length}\r\n\r\n`);
        res.write(buffer);
        res.write("\r\n");
    } catch (e) {
        httpClients.delete(res);
    }
}

function broadcastHttpMjpeg(buffer) {
    for (const clientRes of httpClients) {
        sendHttpChunk(clientRes, buffer);
    }
}

// ===================================================
// 2. RTSP ストリーミングサーバー (Port 8554 / TCP Interleaved)
// ===================================================
const rtspServer = net.createServer((socket) => {
    let session = {
        id: Math.floor(Math.random() * 100000000),
        cseq: 1,
        channel: 0,
        isPlaying: false,
        socket: socket,
        framesSent: 0,
    };

    console.log(`[RTSP Log] Client connected from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on("data", (data) => {
        const msg = data.toString();
        const lines = msg.split("\r\n");
        const firstLine = lines[0] || "";
        const parts = firstLine.split(" ");
        const method = parts[0];

        const cseqMatch = msg.match(/CSeq:\s*(\d+)/i);
        if (cseqMatch) {
            session.cseq = cseqMatch[1];
        }

        if (method === "OPTIONS") {
            console.log(`[RTSP Log] Client CSeq=${session.cseq}: OPTIONS`);
            const resp =
                `RTSP/1.0 200 OK\r\n` +
                `CSeq: ${session.cseq}\r\n` +
                `Public: OPTIONS, DESCRIBE, SETUP, PLAY, TEARDOWN\r\n\r\n`;
            socket.write(resp);
            return;
        }

        if (method === "DESCRIBE") {
            console.log(`[RTSP Log] Client CSeq=${session.cseq}: DESCRIBE`);
            const sdp =
                `v=0\r\n` +
                `o=- ${Date.now()} 1 IN IP4 127.0.0.1\r\n` +
                `s=CT Simulator Virtual Camera\r\n` +
                `t=0 0\r\n` +
                `m=video 0 RTP/AVP 26\r\n` +
                `c=IN IP4 127.0.0.1\r\n` +
                `a=rtpmap:26 JPEG/90000\r\n` +
                `a=control:track0\r\n` +
                `a=framerate:30\r\n`;

            const resp =
                `RTSP/1.0 200 OK\r\n` +
                `CSeq: ${session.cseq}\r\n` +
                `Content-Type: application/sdp\r\n` +
                `Content-Length: ${Buffer.byteLength(sdp)}\r\n\r\n` +
                sdp;
            socket.write(resp);
            return;
        }

        if (method === "SETUP") {
            console.log(`[RTSP Log] Client CSeq=${session.cseq}: SETUP`);
            const transportMatch = msg.match(/Transport:\s*([^\r\n]+)/i);
            const transport = transportMatch ? transportMatch[1] : "RTP/AVP/TCP;interleaved=0-1";

            const resp =
                `RTSP/1.0 200 OK\r\n` +
                `CSeq: ${session.cseq}\r\n` +
                `Transport: ${transport}\r\n` +
                `Session: ${session.id};timeout=60\r\n\r\n`;
            socket.write(resp);
            return;
        }

        if (method === "PLAY") {
            console.log(`[RTSP Log] Client CSeq=${session.cseq}: PLAY -> Streaming started`);
            session.isPlaying = true;
            rtspClients.add(session);

            const nowTime = Math.floor((Date.now() - startTime) * 90) >>> 0;
            const resp =
                `RTSP/1.0 200 OK\r\n` +
                `CSeq: ${session.cseq}\r\n` +
                `Session: ${session.id}\r\n` +
                `Range: npt=now-\r\n` +
                `RTP-Info: url=track0;seq=${rtpSeq & 0xffff};rtptime=${nowTime}\r\n\r\n`;
            socket.write(resp);

            if (latestFrameBuffer) {
                sendRtpFrame(session, latestFrameBuffer);
            }
            return;
        }

        if (method === "TEARDOWN") {
            console.log(`[RTSP Log] Client CSeq=${session.cseq}: TEARDOWN -> Stopped (Sent ${session.framesSent} frames)`);
            session.isPlaying = false;
            rtspClients.delete(session);
            const resp = `RTSP/1.0 200 OK\r\nCSeq: ${session.cseq}\r\n\r\n`;
            socket.write(resp);
            socket.end();
            return;
        }
    });

    socket.on("close", () => {
        console.log(`[RTSP Log] Client disconnected (Sent ${session.framesSent} frames)`);
        session.isPlaying = false;
        rtspClients.delete(session);
    });

    socket.on("error", (err) => {
        console.log(`[RTSP Log] Socket error: ${err.message}`);
        session.isPlaying = false;
        rtspClients.delete(session);
    });
});

let rtpSeq = 0;

// JPEGバイナリのSOF0/SOF2マーカーから動的に正確な画像解像度(Width / Height)を抽出する
function parseJpegDimensions(jpegBuffer) {
    let width = 640;
    let height = 480;
    try {
        let offset = 2;
        while (offset < jpegBuffer.length - 8) {
            if (jpegBuffer[offset] !== 0xff) {
                offset++;
                continue;
            }
            const marker = jpegBuffer[offset + 1];
            if (marker === 0xc0 || marker === 0xc2) {
                height = jpegBuffer.readUInt16BE(offset + 5);
                width = jpegBuffer.readUInt16BE(offset + 7);
                break;
            }
            const len = jpegBuffer.readUInt16BE(offset + 2);
            offset += 2 + len;
        }
    } catch (e) {
        // パース失敗時はデフォルト維持
    }
    return { width, height };
}

function sendRtpFrame(session, jpegBuffer) {
    if (!session || !session.socket || session.socket.destroyed) return;

    try {
        let payloadData = jpegBuffer;
        if (jpegBuffer.length > 2 && jpegBuffer[0] === 0xff && jpegBuffer[1] === 0xd8) {
            payloadData = jpegBuffer.slice(2);
        }

        const rtpHeaderLen = 12;
        const jpeghdrLen = 8;
        const totalPayloadLen = rtpHeaderLen + jpeghdrLen + payloadData.length;

        // 1. Interleaved Frame (TCP) Header (4 bytes)
        const tcpHeader = Buffer.alloc(4);
        tcpHeader[0] = 0x24; // '$'
        tcpHeader[1] = 0x00; // Channel 0
        tcpHeader.writeUInt16BE(totalPayloadLen, 2);

        // 2. RTP Header (12 bytes)
        const rtpHeader = Buffer.alloc(rtpHeaderLen);
        rtpHeader[0] = 0x80; // V=2, P=0, X=0, CC=0
        rtpHeader[1] = 0x9a; // M=1 (Marker: Frame Complete), PT=26 (JPEG)
        rtpHeader.writeUInt16BE(rtpSeq & 0xffff, 2);

        const timestamp = Math.floor((Date.now() - startTime) * 90) >>> 0;
        rtpHeader.writeUInt32BE(timestamp, 4);
        rtpHeader.writeUInt32BE(0x12345678, 8); // SSRC

        // 3. JPEG Header for RTP (8 bytes - RFC 2435)
        const dims = parseJpegDimensions(jpegBuffer);
        const jpegHeader = Buffer.alloc(jpeghdrLen);
        jpegHeader[0] = 0x00; // Type Specific
        jpegHeader[1] = 0x00; // Fragment Offset High
        jpegHeader[2] = 0x00; // Fragment Offset Mid
        jpegHeader[3] = 0x00; // Fragment Offset Low
        jpegHeader[4] = 0x01; // Type = 1 (4:2:0)
        jpegHeader[5] = 0x50; // Q = 80
        jpegHeader[6] = Math.min(255, Math.ceil(dims.width / 8));
        jpegHeader[7] = Math.min(255, Math.ceil(dims.height / 8));

        // 4. パケットの単一バッファ化一括送信
        const packet = Buffer.concat([tcpHeader, rtpHeader, jpegHeader, payloadData]);
        session.socket.write(packet);

        rtpSeq++;
        session.framesSent++;
    } catch (e) {
        rtspClients.delete(session);
    }
}

function broadcastRtspFrame(buffer) {
    for (const session of rtspClients) {
        if (session.isPlaying) {
            sendRtpFrame(session, buffer);
        }
    }
}

// サーバー起動
httpServer.listen(HTTP_PORT, () => {
    console.log(`===================================================`);
    console.log(`🎥 CT Simulator Multi-Protocol Stream Server Started`);
    console.log(`🌐 HTTP MJPEG (VLC/Browser): http://127.0.0.1:${HTTP_PORT}/live/ct-camera.mjpg`);
    console.log(`📡 RTSP Stream: rtsp://127.0.0.1:${RTSP_PORT}/live/ct-camera.mp4`);
    console.log(`===================================================`);
});

rtspServer.listen(RTSP_PORT);
