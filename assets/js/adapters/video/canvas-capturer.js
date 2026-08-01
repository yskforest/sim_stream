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

            width = width || 1280;
            height = height || 960;
            quality = typeof quality === "number" ? quality : 0.92;
            mode = mode || capturer.mode || "main";

            try {
                if (mode === "main") {
                    // 【main モード】画面ビューポートに黒帯（レターボックス/ピラーボックス）を挿入し、配信映像は3D表示領域をクロップして指定解像度・アス比で送信
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
                        var sx = vp.x;
                        var sy = vp.winH - (vp.y + vp.h);
                        var sw = vp.w;
                        var sh = vp.h;
                        ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, width, height);
                    } else {
                        ctx.drawImage(canvas, 0, 0, width, height);
                    }

                    capturer.offscreenCanvas.toBlob(function (blob) {
                        lastFrameData = blob;
                    }, "image/jpeg", quality);
                } else if (mode === "virtual" && global.renderer && global.scene && typeof THREE !== "undefined") {
                    // 【virtual モード】独立した仮想カメラと WebGLRenderTarget を使って二次レンダリング
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

                    var src = capturer.pixelBuffer;
                    var dst = capturer.imageData.data;
                    var rowLength = width * 4;

                    var dstIdx = 0;
                    for (var y = height - 1; y >= 0; y--) {
                        var srcIdx = y * rowLength;
                        var endIdx = srcIdx + rowLength;
                        while (srcIdx < endIdx) {
                            dst[dstIdx++] = SRGB_LUT[src[srcIdx++]];
                            dst[dstIdx++] = SRGB_LUT[src[srcIdx++]];
                            dst[dstIdx++] = SRGB_LUT[src[srcIdx++]];
                            dst[dstIdx++] = 255;
                            srcIdx++;
                        }
                    }

                    capturer.offscreenCtx.putImageData(capturer.imageData, 0, 0);

                    capturer.offscreenCanvas.toBlob(function (blob) {
                        lastFrameData = blob;
                    }, "image/jpeg", quality);
                } else {
                    canvas.toBlob(function (blob) {
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
