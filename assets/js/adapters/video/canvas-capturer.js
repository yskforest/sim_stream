(function attachCanvasCapturer(global) {
    var isCapturing = false;
    var lastFrameData = null;

    function getCanvasElement() {
        if (typeof document === "undefined") return null;
        var container = document.getElementById("canvas-container");
        return container ? container.querySelector("canvas") : null;
    }

    var capturer = {
        startCapture: function startCapture(options) {
            isCapturing = true;
            options = options || {};
        },
        stopCapture: function stopCapture() {
            isCapturing = false;
            lastFrameData = null;
        },
        getLatestFrame: function getLatestFrame(width, height) {
            if (!isCapturing) return null;
            var canvas = getCanvasElement();
            if (!canvas) return null;

            width = width || 640;
            height = height || 480;

            if (typeof document !== "undefined") {
                if (!capturer.offscreenCanvas) {
                    capturer.offscreenCanvas = document.createElement("canvas");
                    capturer.offscreenCtx = capturer.offscreenCanvas.getContext("2d");
                }
                
                // 解像度が変更された場合、キャンバスサイズを更新
                if (capturer.offscreenCanvas.width !== width || capturer.offscreenCanvas.height !== height) {
                    capturer.offscreenCanvas.width = width;
                    capturer.offscreenCanvas.height = height;
                }
            }

            try {
                if (capturer.offscreenCtx) {
                    capturer.offscreenCtx.drawImage(canvas, 0, 0, width, height);
                    lastFrameData = capturer.offscreenCanvas.toDataURL("image/jpeg", 0.7);
                } else {
                    lastFrameData = canvas.toDataURL("image/jpeg", 0.7);
                }
            } catch (e) {
                lastFrameData = null;
            }
            return lastFrameData;
        },
        isCapturing: function () {
            return isCapturing;
        },
    };

    global.CTCanvasCapturer = capturer;
})(window);
