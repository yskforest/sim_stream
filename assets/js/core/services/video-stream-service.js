(function attachVideoStreamService(global) {
    var activeStream = {
        isStreaming: false,
        codec: "mjpeg",
        protocol: "http",
        fps: 30,
        streamUrl: null,
        intervalId: null,
    };

    function generateStreamUrl(protocol, codec) {
        var host = (typeof window !== "undefined" && window.location && window.location.hostname) || "localhost";
        var port = protocol === "rtsp" ? "8554" : "8080";
        var ext = codec === "h264" ? "mp4" : "mjpg";
        return protocol + "://" + host + ":" + port + "/live/ct-camera." + ext;
    }

    var service = {
        start: function start(config) {
            config = config || {};
            if (activeStream.intervalId) {
                clearInterval(activeStream.intervalId);
            }

            activeStream.codec = config.codec || "h264";
            activeStream.protocol = config.protocol || "rtsp";
            activeStream.fps = config.fps || 30;
            activeStream.width = config.width || 1280;
            activeStream.height = config.height || 960;
            activeStream.hfov = config.hfov || 60;
            activeStream.quality = typeof config.quality === "number" ? config.quality : 0.92;
            activeStream.mode = config.mode || config.captureMode || "main";
            activeStream.virtualPosition = config.virtualPosition || null;
            activeStream.virtualLookAt = config.virtualLookAt || null;
            activeStream.isStreaming = true;
            activeStream.streamUrl = generateStreamUrl(activeStream.protocol, activeStream.codec);

            // ブラウザ環境でのキャプチャエンジン呼び出し
            if (global.CTCanvasCapturer && typeof global.CTCanvasCapturer.startCapture === "function") {
                global.CTCanvasCapturer.startCapture({
                    fps: activeStream.fps,
                    codec: activeStream.codec,
                    width: activeStream.width,
                    height: activeStream.height,
                    hfov: activeStream.hfov,
                    quality: activeStream.quality,
                    mode: activeStream.mode,
                    virtualPosition: activeStream.virtualPosition,
                    virtualLookAt: activeStream.virtualLookAt,
                });
            }

            // タイマー駆動によるストリームループのシュミレート
            var intervalMs = Math.floor(1000 / activeStream.fps);
            activeStream.intervalId = setInterval(function () {
                if (global.CTStreamGateway && typeof global.CTStreamGateway.broadcastFrame === "function") {
                    var frame = global.CTCanvasCapturer ? global.CTCanvasCapturer.getLatestFrame(
                        activeStream.width,
                        activeStream.height,
                        activeStream.hfov,
                        activeStream.quality,
                        activeStream.mode,
                        activeStream.virtualPosition,
                        activeStream.virtualLookAt
                    ) : null;
                    global.CTStreamGateway.broadcastFrame(frame);
                }
            }, intervalMs);

            return {
                success: true,
                streamUrl: activeStream.streamUrl,
                config: {
                    codec: activeStream.codec,
                    protocol: activeStream.protocol,
                    fps: activeStream.fps,
                },
            };
        },

        stop: function stop() {
            if (activeStream.intervalId) {
                clearInterval(activeStream.intervalId);
                activeStream.intervalId = null;
            }
            if (global.CTCanvasCapturer && typeof global.CTCanvasCapturer.stopCapture === "function") {
                global.CTCanvasCapturer.stopCapture();
            }

            activeStream.isStreaming = false;
            activeStream.streamUrl = null;

            // カメラのアスペクト比を現在のウィンドウサイズに再計算・復元
            if (typeof window !== "undefined") {
                window.activeViewportBounds = null;
                if (global.camera) {
                    global.camera.aspect = window.innerWidth / window.innerHeight;
                    global.camera.updateProjectionMatrix();
                }
            }

            return { success: true };
        },

        getStatus: function getStatus() {
            return {
                isStreaming: activeStream.isStreaming,
                codec: activeStream.codec,
                protocol: activeStream.protocol,
                fps: activeStream.fps,
                streamUrl: activeStream.streamUrl,
                mode: activeStream.mode,
                width: activeStream.width,
                height: activeStream.height,
                hfov: activeStream.hfov,
            };
        },

        getActiveStream: function getActiveStream() {
            return activeStream;
        },
    };

    global.CTVideoStreamService = service;
})(window);
