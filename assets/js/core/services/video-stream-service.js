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

            activeStream.codec = config.codec || "mjpeg";
            activeStream.protocol = config.protocol || "http";
            activeStream.fps = config.fps || 30;
            activeStream.width = config.width || 640;
            activeStream.height = config.height || 480;
            activeStream.hfov = config.hfov || 60;
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
                });
            }

            // タイマー駆動によるストリームループのシュミレート
            var intervalMs = Math.floor(1000 / activeStream.fps);
            activeStream.intervalId = setInterval(function () {
                if (global.CTStreamGateway && typeof global.CTStreamGateway.broadcastFrame === "function") {
                    var frame = global.CTCanvasCapturer ? global.CTCanvasCapturer.getLatestFrame(activeStream.width, activeStream.height, activeStream.hfov) : null;
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
            return { success: true };
        },

        getStatus: function getStatus() {
            return {
                isStreaming: activeStream.isStreaming,
                codec: activeStream.codec,
                protocol: activeStream.protocol,
                fps: activeStream.fps,
                streamUrl: activeStream.streamUrl,
            };
        },
    };

    global.CTVideoStreamService = service;
})(window);
