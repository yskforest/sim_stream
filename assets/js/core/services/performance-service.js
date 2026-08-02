(function attachPerformanceService(global) {
    var isEnabled = true;
    var isHudVisible = false;

    // 3D Rendering metrics
    var renderFrameCount = 0;
    var lastRenderTime = performance.now();
    var fpsTimer = performance.now();
    var currentFps = 60.0;
    var currentRenderTimeMs = 0.0;
    var currentDrawCalls = 0;
    var currentTriangles = 0;

    // Video Streaming metrics
    var streamFrameCount = 0;
    var streamTimer = performance.now();
    var currentStreamFps = 0.0;
    var currentCaptureLatencyMs = 0.0;
    var currentUploadLatencyMs = 0.0;
    var currentBitrateKbps = 0.0;
    var totalStreamBytes = 0;

    var hudContainer = null;

    function createHudElement() {
        if (typeof document === "undefined") return;
        if (document.getElementById("perf-hud")) {
            hudContainer = document.getElementById("perf-hud");
            return;
        }

        hudContainer = document.createElement("div");
        hudContainer.id = "perf-hud";
        hudContainer.className = "fixed top-3 right-3 bg-slate-950/85 backdrop-blur border border-slate-700/80 rounded-lg p-2.5 text-[11px] font-mono text-slate-200 shadow-2xl z-50 pointer-events-auto transition-opacity duration-200 select-none min-w-[210px]";
        hudContainer.style.display = isHudVisible ? "block" : "none";

        hudContainer.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-1.5">
                <div class="flex items-center gap-1.5 font-bold text-sky-400 text-[10px] tracking-wider uppercase">
                    <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    PERF DIAGNOSTICS
                </div>
                <button id="btn-close-perf-hud" onclick="CTPerformanceService.toggleHud(false)" class="text-slate-400 hover:text-white text-xs px-1 hover:bg-slate-800 rounded">×</button>
            </div>
            
            <!-- 3D Render Stats -->
            <div class="space-y-1 mb-2">
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">3D Render FPS:</span>
                    <span id="perf-render-fps" class="font-bold text-emerald-400">60.0 FPS</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">Render Load:</span>
                    <span id="perf-render-time" class="text-slate-200">1.2 ms (7%)</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1 mt-0.5 overflow-hidden">
                    <div id="perf-load-bar" class="bg-emerald-500 h-full transition-all duration-150" style="width: 7%"></div>
                </div>
                <div class="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>Draw Calls: <strong id="perf-draw-calls" class="text-slate-200">0</strong></span>
                    <span>Polys: <strong id="perf-triangles" class="text-slate-200">0k</strong></span>
                </div>
            </div>

            <!-- Stream Stats -->
            <div id="perf-stream-section" class="border-t border-slate-800 pt-1.5 space-y-1">
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">Stream FPS:</span>
                    <span id="perf-stream-fps" class="font-bold text-sky-400">OFF</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">Encode Latency:</span>
                    <span id="perf-capture-latency" class="text-slate-300">-- ms</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">Network Latency:</span>
                    <span id="perf-upload-latency" class="text-slate-300">-- ms</span>
                </div>
                <div class="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>Bitrate: <strong id="perf-bitrate" class="text-slate-200">-- KB/s</strong></span>
                </div>
            </div>
        `;

        document.body.appendChild(hudContainer);
    }

    var service = {
        init: function init() {
            if (typeof document !== "undefined") {
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", createHudElement);
                } else {
                    createHudElement();
                }
            }
        },

        toggleHud: function toggleHud(show) {
            if (typeof show === "boolean") {
                isHudVisible = show;
            } else {
                isHudVisible = !isHudVisible;
            }

            if (!hudContainer) createHudElement();
            if (hudContainer) {
                hudContainer.style.display = isHudVisible ? "block" : "none";
            }

            var btn = document.getElementById("btn-hud-toggle");
            if (btn) {
                btn.classList.toggle("bg-emerald-700", isHudVisible);
                btn.classList.toggle("bg-slate-800", !isHudVisible);
            }
        },

        recordRenderFrame: function recordRenderFrame(startTimeMs, renderer) {
            if (!isEnabled) return;
            var now = performance.now();
            currentRenderTimeMs = now - startTimeMs;
            renderFrameCount++;

            if (renderer && renderer.info && renderer.info.render) {
                currentDrawCalls = renderer.info.render.calls || 0;
                currentTriangles = renderer.info.render.triangles || 0;
            }

            var elapsed = now - fpsTimer;
            if (elapsed >= 500) {
                currentFps = (renderFrameCount * 1000) / elapsed;
                renderFrameCount = 0;
                fpsTimer = now;
                service.updateHudUI();
            }
        },

        recordStreamFrame: function recordStreamFrame(captureTimeMs, uploadTimeMs, blobSizeBytes) {
            if (!isEnabled) return;
            var now = performance.now();
            streamFrameCount++;
            currentCaptureLatencyMs = typeof captureTimeMs === "number" ? captureTimeMs : 0.0;
            currentUploadLatencyMs = typeof uploadTimeMs === "number" ? uploadTimeMs : 0.0;

            if (typeof blobSizeBytes === "number") {
                totalStreamBytes += blobSizeBytes;
            }

            var elapsed = now - streamTimer;
            if (elapsed >= 1000) {
                currentStreamFps = (streamFrameCount * 1000) / elapsed;
                currentBitrateKbps = (totalStreamBytes / 1024) / (elapsed / 1000);
                streamFrameCount = 0;
                totalStreamBytes = 0;
                streamTimer = now;
            }
        },

        updateHudUI: function updateHudUI() {
            if (typeof document === "undefined") return;

            // Update 3D Render HUD elements
            var renderFpsEl = document.getElementById("perf-render-fps");
            if (renderFpsEl) {
                renderFpsEl.textContent = currentFps.toFixed(1) + " FPS";
                renderFpsEl.className = currentFps >= 50 ? "font-bold text-emerald-400" : (currentFps >= 30 ? "font-bold text-amber-400" : "font-bold text-rose-500");
            }

            var renderTimeEl = document.getElementById("perf-render-time");
            var loadBarEl = document.getElementById("perf-load-bar");
            if (renderTimeEl) {
                var loadPct = Math.min(100, Math.round((currentRenderTimeMs / 16.6) * 100));
                renderTimeEl.textContent = currentRenderTimeMs.toFixed(1) + " ms (" + loadPct + "%)";
                if (loadBarEl) {
                    loadBarEl.style.width = loadPct + "%";
                    loadBarEl.className = loadPct > 80 ? "bg-rose-500 h-full transition-all duration-150" : (loadPct > 50 ? "bg-amber-400 h-full transition-all duration-150" : "bg-emerald-500 h-full transition-all duration-150");
                }
            }

            var drawCallsEl = document.getElementById("perf-draw-calls");
            if (drawCallsEl) drawCallsEl.textContent = currentDrawCalls;

            var triEl = document.getElementById("perf-triangles");
            if (triEl) triEl.textContent = (currentTriangles / 1000).toFixed(1) + "k";

            // Update Stream HUD elements
            var isStreaming = global.CTVideoStreamService ? global.CTVideoStreamService.getActiveStream() && global.CTVideoStreamService.getActiveStream().isStreaming : false;
            var streamFpsEl = document.getElementById("perf-stream-fps");
            var captureLatEl = document.getElementById("perf-capture-latency");
            var uploadLatEl = document.getElementById("perf-upload-latency");
            var bitrateEl = document.getElementById("perf-bitrate");

            if (streamFpsEl) {
                if (isStreaming) {
                    streamFpsEl.textContent = currentStreamFps.toFixed(1) + " FPS";
                    streamFpsEl.className = "font-bold text-sky-400";
                } else {
                    streamFpsEl.textContent = "OFF";
                    streamFpsEl.className = "font-bold text-slate-500";
                }
            }

            if (captureLatEl) {
                captureLatEl.textContent = isStreaming ? currentCaptureLatencyMs.toFixed(1) + " ms" : "-- ms";
            }
            if (uploadLatEl) {
                uploadLatEl.textContent = isStreaming ? currentUploadLatencyMs.toFixed(1) + " ms" : "-- ms";
            }
            if (bitrateEl) {
                bitrateEl.textContent = isStreaming ? currentBitrateKbps.toFixed(0) + " KB/s" : "-- KB/s";
            }

            // Also sync to Stream Diagnostics section in 3D panel if visible
            var panelStreamFpsEl = document.getElementById("diag-stream-fps");
            var panelStreamLatEl = document.getElementById("diag-stream-latency");
            var panelStreamBitrateEl = document.getElementById("diag-stream-bitrate");
            if (panelStreamFpsEl) panelStreamFpsEl.textContent = isStreaming ? currentStreamFps.toFixed(1) + " FPS" : "OFF";
            if (panelStreamLatEl) panelStreamLatEl.textContent = isStreaming ? (currentCaptureLatencyMs + currentUploadLatencyMs).toFixed(1) + " ms" : "-- ms";
            if (panelStreamBitrateEl) panelStreamBitrateEl.textContent = isStreaming ? currentBitrateKbps.toFixed(0) + " KB/s" : "-- KB/s";
        },

        getMetrics: function getMetrics() {
            return {
                renderFps: currentFps,
                renderTimeMs: currentRenderTimeMs,
                drawCalls: currentDrawCalls,
                triangles: currentTriangles,
                streamFps: currentStreamFps,
                captureLatencyMs: currentCaptureLatencyMs,
                uploadLatencyMs: currentUploadLatencyMs,
                totalLatencyMs: currentCaptureLatencyMs + currentUploadLatencyMs,
                bitrateKbps: currentBitrateKbps
            };
        }
    };

    service.init();
    global.CTPerformanceService = service;
})(typeof window !== "undefined" ? window : this);
