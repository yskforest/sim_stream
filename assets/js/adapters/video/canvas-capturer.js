(function attachCanvasCapturer(global) {
    var isCapturing = false;
    var lastFrameData = null;

    // sRGB Gamma Correction Lookup Table (Linear to sRGB Color Space)
    var SRGB_LUT = new Uint8Array(256);
    for (var i = 0; i < 256; i++) {
        var c = i / 255.0;
        var s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
        SRGB_LUT[i] = Math.min(255, Math.max(0, Math.round(s * 255)));
    }

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
        getLatestFrame: function getLatestFrame(width, height, hfov, quality) {
            if (!isCapturing) return null;
            var canvas = getCanvasElement();
            if (!canvas) return null;

            width = width || 1280;
            height = height || 960;
            quality = typeof quality === "number" ? quality : 0.92;

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

                    var src = capturer.pixelBuffer;
                    var dst = capturer.imageData.data;
                    var rowLength = width * 4;

                    // Y軸反転 ＋ sRGB ガンマ補正を適応（メインビューアーと同等の明るさ・コントラスト）
                    // 速度最適化: 掛け算によるインデックス計算を排除し、シーケンシャルなポインタインクリメントを使用
                    var dstIdx = 0;
                    for (var y = height - 1; y >= 0; y--) {
                        var srcIdx = y * rowLength;
                        var endIdx = srcIdx + rowLength;
                        while (srcIdx < endIdx) {
                            dst[dstIdx++] = SRGB_LUT[src[srcIdx++]]; // R
                            dst[dstIdx++] = SRGB_LUT[src[srcIdx++]]; // G
                            dst[dstIdx++] = SRGB_LUT[src[srcIdx++]]; // B
                            dst[dstIdx++] = 255;                      // A
                            srcIdx++; // 元画像のAlphaスキップ
                        }
                    }

                    capturer.offscreenCtx.putImageData(capturer.imageData, 0, 0);
                    
                    // 非同期パイプライン: メインスレッドをブロックするtoDataURLを避け、Blobでエンコード
                    capturer.offscreenCanvas.toBlob(function(blob) {
                        lastFrameData = blob;
                    }, "image/jpeg", quality);
                } else {
                    canvas.toBlob(function(blob) {
                        lastFrameData = blob;
                    }, "image/jpeg", quality);
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
