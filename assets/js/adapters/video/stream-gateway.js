(function attachStreamGateway(global) {
    var listeners = [];
    var serverUploadUrl = "http://127.0.0.1:8080/upload-frame";
    var isSending = false;
    var serverAvailable = true;
    var lastCheckTime = 0;
    var ws = null;
    var isWsConnected = false;
    var wsUrl = "ws://127.0.0.1:8080/";

    function connectWebSocket() {
        if (ws) return;
        try {
            ws = new WebSocket(wsUrl);
            ws.binaryType = "blob";
            ws.onopen = function () {
                isWsConnected = true;
                serverAvailable = true;
            };
            ws.onclose = function () {
                isWsConnected = false;
                ws = null;
                setTimeout(connectWebSocket, 3000);
            };
            ws.onerror = function () {
                isWsConnected = false;
            };
        } catch (e) {
            isWsConnected = false;
        }
    }
    connectWebSocket();

    function sendFrameToServer(frameData) {
        if (!frameData) return;

        var sendStart = performance.now();
        var blobSize = frameData.size || frameData.byteLength || 0;

        function recordMetrics(latencyMs) {
            if (global.CTPerformanceService) {
                var captureLatency = (global.CTCanvasCapturer && typeof global.CTCanvasCapturer.lastCaptureLatencyMs === "number")
                    ? global.CTCanvasCapturer.lastCaptureLatencyMs
                    : 0.0;
                global.CTPerformanceService.recordStreamFrame(captureLatency, latencyMs, blobSize);
            }
        }

        if (isWsConnected && ws && ws.readyState === WebSocket.OPEN) {
            try {
                if (ws.bufferedAmount > 128 * 1024) {
                    return; // バッファが過大な場合はフレームをドロップ
                }
                ws.send(frameData);
                var wsLatency = performance.now() - sendStart;
                recordMetrics(wsLatency);
                return;
            } catch (e) {
                // fallback to fetch if WS send fails
            }
        }

        if (isSending || typeof fetch === "undefined") return;

        var now = Date.now();
        if (!serverAvailable && now - lastCheckTime < 5000) {
            return;
        }

        isSending = true;

        var headers = {};
        if (frameData instanceof ArrayBuffer || frameData instanceof Uint8Array || (typeof Blob !== "undefined" && frameData instanceof Blob)) {
            headers["Content-Type"] = "application/octet-stream";
        } else {
            headers["Content-Type"] = "text/plain";
        }

        fetch(serverUploadUrl, {
            method: "POST",
            headers: headers,
            body: frameData,
        })
            .then(function (res) {
                if (res.ok) {
                    serverAvailable = true;
                    var fetchLatency = performance.now() - sendStart;
                    recordMetrics(fetchLatency);
                }
            })
            .catch(function () {
                serverAvailable = false;
                lastCheckTime = Date.now();
            })
            .finally(function () {
                isSending = false;
            });
    }
    var gateway = {
        broadcastFrame: function broadcastFrame(frameData) {
            if (!frameData) return;

            // 1. ローカル画面内プレビューへ配送
            for (var i = 0; i < listeners.length; i++) {
                try {
                    listeners[i](frameData);
                } catch (e) {
                    // ignore
                }
            }

            // 2. HTTP/MJPEG 中継サーバーへフレーム転送
            sendFrameToServer(frameData);
        },
        subscribeFrames: function subscribeFrames(listener) {
            if (typeof listener !== "function") return function () {};
            listeners.push(listener);
            return function unsubscribe() {
                var idx = listeners.indexOf(listener);
                if (idx >= 0) listeners.splice(idx, 1);
            };
        },
    };

    global.CTStreamGateway = gateway;
})(window);
