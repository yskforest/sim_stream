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
        getLatestFrame: function getLatestFrame(width, height, hfov) {
            if (!isCapturing) return null;
            var canvas = getCanvasElement();
            if (!canvas) return null;

            width = width || 1280;
            height = height || 960;

            try {
                if (global.renderer && global.scene && global.camera && typeof THREE !== "undefined") {
                    var oldAspect = global.camera.aspect;
                    var oldFov = global.camera.fov;
                    var aspect = width / height;

                    if (!capturer.renderTarget || capturer.renderTarget.width !== width || capturer.renderTarget.height !== height) {
                        if (capturer.renderTarget) capturer.renderTarget.dispose();
                        capturer.renderTarget = new THREE.WebGLRenderTarget(width, height);
                        capturer.pixelBuffer = new Uint8Array(width * height * 4);
                        
                        capturer.offscreenCanvas = document.createElement("canvas");
                        capturer.offscreenCanvas.width = width;
                        capturer.offscreenCanvas.height = height;
                        capturer.offscreenCtx = capturer.offscreenCanvas.getContext("2d");
                        capturer.imageData = capturer.offscreenCtx.createImageData(width, height);
                        capturer.src32 = new Uint32Array(capturer.pixelBuffer.buffer);
                        capturer.dst32 = new Uint32Array(capturer.imageData.data.buffer);
                    }

                    global.camera.aspect = aspect;
                    if (typeof hfov === "number" && hfov > 0) {
                        var hfovRad = (hfov * Math.PI) / 180;
                        var vfovRad = 2 * Math.atan(Math.tan(hfovRad / 2) / aspect);
                        global.camera.fov = (vfovRad * 180) / Math.PI;
                    }
                    global.camera.updateProjectionMatrix();

                    global.renderer.setRenderTarget(capturer.renderTarget);
                    global.renderer.render(global.scene, global.camera);
                    
                    global.renderer.readRenderTargetPixels(capturer.renderTarget, 0, 0, width, height, capturer.pixelBuffer);
                    
                    global.renderer.setRenderTarget(null);
                    global.camera.aspect = oldAspect;
                    global.camera.fov = oldFov;
                    global.camera.updateProjectionMatrix();

                    var src32 = capturer.src32;
                    var dst32 = capturer.dst32;

                    for (var y = 0; y < height; y++) {
                        var srcLine = (height - 1 - y) * width;
                        var dstLine = y * width;
                        dst32.set(src32.subarray(srcLine, srcLine + width), dstLine);
                    }

                    capturer.offscreenCtx.putImageData(capturer.imageData, 0, 0);
                    lastFrameData = capturer.offscreenCanvas.toDataURL("image/jpeg", 0.7);
                } else {
                    lastFrameData = canvas.toDataURL("image/jpeg", 0.7);
                }
            } catch (e) {
                console.error("CanvasCapturer Error:", e);
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
