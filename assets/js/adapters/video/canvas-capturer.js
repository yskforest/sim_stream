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

    function dataURLtoUint8Array(dataUrl) {
        if (typeof dataUrl !== "string") return null;
        var parts = dataUrl.split(",");
        if (parts.length < 2) return null;
        var bstr = (typeof window !== "undefined" && window.atob) ? window.atob(parts[1]) : "";
        var n = bstr.length;
        var u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return u8arr;
    }

    function getCanvasElement() {
        if (typeof document === "undefined") return null;
        var container = document.getElementById("canvas-container");
        return container ? container.querySelector("canvas") : null;
    }

    var capturer = {
        mode: "main",
        startCapture: function startCapture(options) {
            isCapturing = true;
            options = options || {};
            capturer.mode = options.mode || options.captureMode || "main";
        },
        stopCapture: function stopCapture() {
            isCapturing = false;
            lastFrameData = null;
        },
        getLatestFrame: function getLatestFrame(width, height, hfov, quality, mode, virtualPos, virtualLookAt) {
            if (!isCapturing) return null;
            var canvas = getCanvasElement();
            if (!canvas) return null;

            // バックプレッシャー制御：前フレームの Blob 変換が完了していない場合は即時スキップ
            if (capturer.isProcessingBlob) {
                return lastFrameData;
            }

            width = width || 1280;
            height = height || 960;
            quality = typeof quality === "number" ? quality : 0.85;
            mode = mode || capturer.mode || "main";

            try {
                if (mode === "main") {
                    // 【main モード】画面ビューポートのキャプチャとクロップ
                    if (!capturer.offscreenCanvas) {
                        capturer.offscreenCanvas = document.createElement("canvas");
                        capturer.offscreenCtx = capturer.offscreenCanvas.getContext("2d");
                    }
                    if (capturer.offscreenCanvas.width !== width || capturer.offscreenCanvas.height !== height) {
                        capturer.offscreenCanvas.width = width;
                        capturer.offscreenCanvas.height = height;
                    }

                    var ctx = capturer.offscreenCtx;
                    var vp = window.activeViewportBounds;
                    if (vp && vp.w > 0 && vp.h > 0) {
                        var winW = vp.winW || (typeof window !== "undefined" ? window.innerWidth : 1);
                        var winH = vp.winH || (typeof window !== "undefined" ? window.innerHeight : 1);
                        var scaleX = canvas.width / winW;
                        var scaleY = canvas.height / winH;

                        var sx = Math.floor(vp.x * scaleX);
                        var sy = Math.floor((winH - (vp.y + vp.h)) * scaleY);
                        var sw = Math.floor(vp.w * scaleX);
                        var sh = Math.floor(vp.h * scaleY);

                        ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, width, height);
                    } else {
                        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
                    }

                    capturer.isProcessingBlob = true;
                    var captureStart = performance.now();
                    capturer.offscreenCanvas.toBlob(function (blob) {
                        var captureMs = performance.now() - captureStart;
                        capturer.lastCaptureLatencyMs = captureMs;
                        if (blob) lastFrameData = blob;
                        capturer.isProcessingBlob = false;
                    }, "image/jpeg", quality);
                } else if (mode === "virtual" && global.renderer && global.scene && typeof THREE !== "undefined") {
                    // 【virtual モード】独立仮想カメラによるマルチターゲットレンダリング
                    if (!capturer.virtualCamera) {
                        capturer.virtualCamera = new THREE.PerspectiveCamera();
                    }
                    var vCamera = capturer.virtualCamera;
                    var aspect = width / height;
                    vCamera.aspect = aspect;

                    if (typeof hfov === "number" && hfov > 0) {
                        var hfovRad = (hfov * Math.PI) / 180;
                        var vfovRad = 2 * Math.atan(Math.tan(hfovRad / 2) / aspect);
                        vCamera.fov = (vfovRad * 180) / Math.PI;
                    }
                    vCamera.updateProjectionMatrix();

                    if (virtualPos) {
                        vCamera.position.set(
                            typeof virtualPos.x === "number" ? virtualPos.x : vCamera.position.x,
                            typeof virtualPos.y === "number" ? virtualPos.y : vCamera.position.y,
                            typeof virtualPos.z === "number" ? virtualPos.z : vCamera.position.z
                        );
                    }
                    if (virtualLookAt) {
                        vCamera.lookAt(
                            typeof virtualLookAt.x === "number" ? virtualLookAt.x : 0,
                            typeof virtualLookAt.y === "number" ? virtualLookAt.y : 0,
                            typeof virtualLookAt.z === "number" ? virtualLookAt.z : 0
                        );
                    }

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

                    global.renderer.setRenderTarget(capturer.renderTarget);
                    global.renderer.render(global.scene, vCamera);

                    global.renderer.readRenderTargetPixels(capturer.renderTarget, 0, 0, width, height, capturer.pixelBuffer);
                    global.renderer.setRenderTarget(null);

                    // 高速 TypedArray Uint32 メモリブロック転送（上下反転処理）
                    var src32 = new Uint32Array(capturer.pixelBuffer.buffer);
                    var dst32 = new Uint32Array(capturer.imageData.data.buffer);
                    for (var y = 0; y < height; y++) {
                        var srcRow = (height - 1 - y) * width;
                        var dstRow = y * width;
                        dst32.set(src32.subarray(srcRow, srcRow + width), dstRow);
                    }

                    capturer.offscreenCtx.putImageData(capturer.imageData, 0, 0);

                    capturer.isProcessingBlob = true;
                    var vCaptureStart = performance.now();
                    capturer.offscreenCanvas.toBlob(function (blob) {
                        var captureMs = performance.now() - vCaptureStart;
                        capturer.lastCaptureLatencyMs = captureMs;
                        if (blob) lastFrameData = blob;
                        capturer.isProcessingBlob = false;
                    }, "image/jpeg", quality);
                } else {
                    capturer.isProcessingBlob = true;
                    canvas.toBlob(function (blob) {
                        if (blob) lastFrameData = blob;
                        capturer.isProcessingBlob = false;
                    }, "image/jpeg", quality);
                }
            } catch (e) {
                console.error("CanvasCapturer Error:", e);
                capturer.isProcessingBlob = false;
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
