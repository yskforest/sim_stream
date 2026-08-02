(function attachUIController(global) {
    var isSetup = false;
    var unsubscribers = [];
    var mobileMedia = null;

    function byId(id) {
        return document.getElementById(id);
    }

    function bindRangeProfile(input, cap) {
        if (!input || !cap) return;
        if (typeof cap.min === "number") input.min = String(cap.min);
        if (typeof cap.max === "number") input.max = String(cap.max);
        if (typeof cap.defaultValue === "number") input.value = String(cap.defaultValue);
    }

    function applyProfileUIConfig() {
        if (!global.CTProfileService) return;

        bindRangeProfile(UI.sliderCouchY, CTProfileService.getAxisCapability("couch", "y"));
        bindRangeProfile(UI.sliderCouchZ, CTProfileService.getAxisCapability("couch", "z"));
        bindRangeProfile(UI.sliderInjectA, CTProfileService.getAxisCapability("injector", "a"));
        bindRangeProfile(UI.sliderInjectB, CTProfileService.getAxisCapability("injector", "b"));

        var rows = CTProfileService.getDetectorRowsOptions();
        if (!UI.selectDetectorRows) return;

        UI.selectDetectorRows.innerHTML = "";
        rows.forEach(function (v) {
            var option = document.createElement("option");
            option.value = String(v);
            option.textContent = v === 320 ? "320 Rows (High-End class)" : v + " Rows";
            if (AppState.gantry.detectorRows === v) option.selected = true;
            UI.selectDetectorRows.appendChild(option);
        });
    }

    function executeCommand(source, target, action, valueOrParams) {
        // UI入力値の単一値/オブジェクト差を吸収してコマンドバスへ統一形式で渡す
        var params =
            typeof valueOrParams === "object" && valueOrParams !== null ? valueOrParams : { value: valueOrParams };

        return CTCommandBus.execute({
            source: source,
            target: target,
            action: action,
            params: params,
        });
    }

    function executeConsoleCommand(target, action, valueOrParams) {
        return executeCommand("ui-console", target, action, valueOrParams);
    }

    function updateText(id, text) { var el = byId(id); if (el && el.innerText !== text) el.innerText = text; }
    function updateValue(id, value) { var el = byId(id); if (el && el.value != value) el.value = value; }
    function updateClass(id, cls) { var el = byId(id); if (el && el.className !== cls) el.className = cls; }
    function updateStyle(id, prop, val) { var el = byId(id); if (el && el.style[prop] !== val) el.style[prop] = val; }

    function syncInteractiveState(state) {
        if (!state) return;
        var couch = state.couch || { y: 0, z: 0 };
        var gantry = state.gantry || { rotorSpeed: 0, isScanning: false, activeBatchIndex: -1, detectorRows: 320, xrayVisible: false };
        var injector = state.injector || { a: 0, b: 0 };

        updateText("couch-y-val", couch.y.toFixed(0) + "%");
        updateText("couch-z-val", couch.z.toFixed(0) + "%");
        updateText("rotor-speed-val", gantry.rotorSpeed.toFixed(0) + " rpm");
        updateText("inject-a-val", injector.a.toFixed(0) + "%");
        updateText("inject-b-val", injector.b.toFixed(0) + "%");

        updateValue("slider-couch-y", couch.y);
        updateValue("slider-couch-z", couch.z);
        updateValue("slider-rotor-speed", gantry.rotorSpeed);
        updateValue("slider-inject-a", injector.a);
        updateValue("slider-inject-b", injector.b);
        updateValue("select-detector-rows", gantry.detectorRows);

        var isRunning = gantry.isScanning || gantry.activeBatchIndex >= 0;
        if (UI.selectDetectorRows) UI.selectDetectorRows.disabled = isRunning;

        if (gantry.isScanning) {
            updateText("btn-scan-toggle", "Stop Scan");
            updateClass("btn-scan-toggle", "w-full bg-red-600 hover:bg-red-500 text-sm py-2 rounded shadow-lg transition font-bold");
        } else {
            updateText("btn-scan-toggle", "Start Scan");
            updateClass("btn-scan-toggle", "w-full bg-green-600 hover:bg-green-500 text-sm py-2 rounded shadow-lg transition font-bold");
        }

        if (gantry.xrayVisible) {
            updateText("btn-xray-toggle", "Hide X-Ray Beam");
            updateClass("btn-xray-toggle", "w-full bg-yellow-500 hover:bg-yellow-400 text-xs py-1.5 rounded transition font-bold text-black");
        } else {
            updateText("btn-xray-toggle", "Show X-Ray Beam");
            updateClass("btn-xray-toggle", "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition");
        }

        if (Meshes.xrayBeam) Meshes.xrayBeam.material.opacity = gantry.xrayVisible ? 0.35 : 0.0;
        if (Meshes.patientGroup) Meshes.patientGroup.visible = state.patientVisible;

        if (state.patientVisible) {
            updateText("btn-patient-toggle", "Hide Patient");
            updateClass("btn-patient-toggle", "w-full bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold");
        } else {
            updateText("btn-patient-toggle", "Show Patient");
            updateClass("btn-patient-toggle", "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition text-gray-400");
        }

        if (state.camera) {
            if (state.camera.isStreaming) {
                updateText("btn-camera-stream-toggle", "Stop Stream");
                updateClass("btn-camera-stream-toggle", "w-full bg-red-600 hover:bg-red-500 text-xs py-1 rounded font-bold");
                updateText("stream-url-display", state.camera.streamUrl || "");
                updateClass("stream-url-display", "w-full bg-gray-900 border border-gray-700 text-xs p-1 rounded font-mono text-green-400 break-all");
            } else {
                updateText("btn-camera-stream-toggle", "Start Stream");
                updateClass("btn-camera-stream-toggle", "w-full bg-indigo-600 hover:bg-indigo-500 text-xs py-1 rounded font-bold");
                updateClass("stream-url-display", "hidden");
            }
        }

        if (gantry.isTranslucent) {
            updateClass("btn-gantry-opaque", "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600");
            updateClass("btn-gantry-trans", "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 font-bold");
        } else {
            updateClass("btn-gantry-opaque", "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 font-bold");
            updateClass("btn-gantry-trans", "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600");
        }

        applyStateToMeshes(state);
    }

    function updateLastCommandMonitor() {
        if (!global.CTCommandLogService) return;
        var logs = global.CTCommandLogService.list();
        var last = logs.length > 0 ? logs[logs.length - 1] : null;
        var src = byId("monitor-last-source");
        var res = byId("monitor-last-result");
        var err = byId("monitor-last-error");
        if (!src || !res || !err) return;

        if (!last) {
            src.innerText = "-";
            res.innerText = "-";
            err.innerText = "-";
            return;
        }

        src.innerText = last.source || "-";
        var ok = last.result && last.result.success === true;
        res.innerText = ok ? "success" : "fail";
        err.innerText = ok ? "-" : last.result && last.result.error ? last.result.error : "UNKNOWN_ERROR";
    }

    function updateStateMonitor() {
        var rpm = Math.round(AppState.gantry.rotorSpeed);
        updateText("monitor-rpm", rpm + " rpm");
        updateStyle("monitor-rpm-bar", "width", (rpm / 100) * 100 + "%");
        updateText("monitor-mode", AppState.gantry.currentScanMode.replace(/_/g, " ").toUpperCase());
        updateText("monitor-rows", AppState.gantry.detectorRows);

        if (AppState.gantry.isScanning) {
            updateText("status-badge", "SCANNING");
            updateClass("status-badge", "px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse");
        } else if (rpm > 0) {
            updateText("status-badge", "SPINNING");
            updateClass("status-badge", "px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50");
        } else {
            updateText("status-badge", "STANDBY");
            updateClass("status-badge", "px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600 transition-colors duration-300");
        }

        updateText("monitor-couch-y", Math.round(AppState.couch.y) + "%");
        updateText("monitor-couch-z", Math.round(AppState.couch.z) + "%");

        var injA = Math.round(AppState.injector.a);
        var injB = Math.round(AppState.injector.b);
        updateText("monitor-inj-a", (100 - injA) + "%");
        updateText("monitor-inj-b", (100 - injB) + "%");
        updateStyle("monitor-inj-a-bar", "width", (100 - injA) + "%");
        updateStyle("monitor-inj-b-bar", "width", (100 - injB) + "%");

        updateLastCommandMonitor();
    }

    function renderCommandLog() {
        if (!global.CTCommandLogService || !UI.commandLogList) return;
        var entries = global.CTCommandLogService.list();
        var latest = entries.slice(-40);

        UI.commandLogList.innerHTML = "";
        latest.forEach(function (entry) {
            var row = document.createElement("div");
            var ok = entry.result && entry.result.success === true;
            var action = entry.command ? entry.command.target + "." + entry.command.action : "n/a";
            var stamp = entry.timestamp ? entry.timestamp.split("T")[1].replace("Z", "") : "--:--:--";
            var err = ok ? "" : " " + (entry.result && entry.result.error ? entry.result.error : "ERROR");
            row.className = ok ? "text-green-300" : "text-red-300";
            row.innerText =
                "[" + stamp + "] " + (entry.source || "-") + " " + action + " -> " + (ok ? "OK" : "FAIL") + err;
            UI.commandLogList.appendChild(row);
        });

        UI.commandLogList.scrollTop = UI.commandLogList.scrollHeight;
    }

    function renderBatchUI() {
        var container = byId("batch-container");
        var seq = AppState.gantry.scanSequence;
        var activeIdx = AppState.gantry.activeBatchIndex;
        var syncIdx = AppState.gantry.injectorSyncIndex;
        var countdown = AppState.gantry.countdown;
        var isRunning = AppState.gantry.isScanning || activeIdx >= 0;

        container.innerHTML = seq.map(function (batch, index) {
            var isActive = index === activeIdx;
            var isSync = index === syncIdx;
            var opts = ["scano", "dual_scano", "3d_landmark", "helical", "axial", "volume", "dynamic", "real_prep"];
            var optHtml = opts.map(function(o) {
                return `<option value="${o}" ${o === batch.mode ? "selected" : ""}>${o === "dual_scano" ? "Dual Scano" : o === "3d_landmark" ? "3D Landmark" : o === "real_prep" ? "Real Prep" : o.charAt(0).toUpperCase() + o.slice(1)}</option>`;
            }).join("");

            var cardCls = "relative rounded-lg p-2.5 w-36 flex flex-col items-center transition-all duration-300 " + 
                (isActive ? "bg-blue-900/80 border-2 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-105 z-10" : "bg-gray-800 border border-gray-600");

            var overlay = (isActive && countdown > 0) ? `<div class="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center z-20 backdrop-blur-[2px]">
                <span class="text-[10px] text-yellow-400 font-bold mb-1 tracking-widest">DELAY</span>
                <span class="text-2xl font-mono text-white font-bold leading-none">${countdown}</span></div>` : "";

            var dis = isRunning ? "disabled" : "";
            var disCls = isRunning ? "opacity-70 cursor-not-allowed" : "";

            return `<div class="${cardCls}">
                ${overlay}
                <div class="text-[10px] text-gray-400 mb-1.5 w-full flex justify-between items-center">
                    <span class="${isActive ? 'text-yellow-400 font-bold' : ''}">Batch ${index + 1}</span>
                    <button class="btn-del hover:text-red-400 text-base leading-none transition-colors ${(isRunning || seq.length <= 1) ? 'opacity-30 cursor-not-allowed' : ''}" ${(isRunning || seq.length <= 1) ? "disabled" : ""}>&times;</button>
                </div>
                <select class="sel-mode w-full bg-gray-900 text-white text-[11px] p-1.5 rounded border border-gray-700 outline-none hover:border-blue-500 transition-colors cursor-pointer ${disCls}" ${dis}>
                    ${optHtml}
                </select>
                <div class="w-full flex items-center justify-between mt-2 text-[10px] text-gray-400">
                    <span>Delay (s)</span>
                    <input type="number" min="0" max="60" value="${batch.delay}" class="inp-delay w-10 bg-gray-900 text-white p-1 rounded border border-gray-700 outline-none text-center" ${dis}>
                </div>
                <button class="btn-sync w-full mt-2 py-1 rounded text-[9px] font-bold transition-colors ${isSync ? 'bg-purple-600/80 text-white border border-purple-400' : 'bg-gray-900 text-gray-500 border border-gray-700 hover:bg-gray-700'} ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}" ${dis}>
                    INJ SYNC: ${isSync ? "ON" : "OFF"}
                </button>
            </div>`;
        }).join("");

        Array.from(container.children).forEach(function(card, idx) {
            var delBtn = card.querySelector(".btn-del");
            if(delBtn) delBtn.onclick = function() { removeScanBatch(idx); };
            var sel = card.querySelector(".sel-mode");
            if(sel) sel.onchange = function(e) { updateBatchData(idx, "mode", e.target.value); };
            var inp = card.querySelector(".inp-delay");
            if(inp) inp.onchange = function(e) { updateBatchData(idx, "delay", parseInt(e.target.value, 10) || 0); };
            var syn = card.querySelector(".btn-sync");
            if(syn) syn.onclick = function() { setInjectorSync(idx); };
        });

        var addBtn = byId("btn-add-batch");
        addBtn.disabled = seq.length >= 5 || isRunning;
        addBtn.className = "w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors " + (addBtn.disabled ? "opacity-30 cursor-not-allowed" : "");

        var runBtn = byId("btn-run-sequence");
        runBtn.disabled = isRunning && AppState.gantry.cancelRequested;
        runBtn.onclick = isRunning ? stopAutoSequence : runAutoSequence;
        runBtn.className = isRunning 
            ? "flex-[2] bg-red-600 hover:bg-red-500 border border-red-500 rounded py-1.5 text-xs font-bold " + (AppState.gantry.cancelRequested ? "opacity-60 cursor-not-allowed" : "")
            : "flex-[2] bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded py-1.5 text-xs font-bold";
        runBtn.innerText = isRunning ? (AppState.gantry.cancelRequested ? "STOPPING..." : "STOP SEQUENCE") : "RUN SEQUENCE";
    }

    function setPanelVisibilityForViewport() {
        // 縦長画面でも3D表示領域を確保するため、非表示フラグ付きパネルのみ畳む
        var mobile = mobileMedia && mobileMedia.matches;
        var panels = document.querySelectorAll(".ui-panel");
        if (!mobile) {
            panels.forEach(function (p) {
                if (!p.classList.contains("is-hidden")) p.style.display = "block";
            });
            return;
        }
        panels.forEach(function (p) {
            if (p.classList.contains("is-hidden")) {
                p.style.display = "none";
                return;
            }
            p.style.display = "block";
        });
    }

    function bindPanelControls() {
        mobileMedia = window.matchMedia("(max-width: 1279px)");

        document.querySelectorAll(".toolbar-btn[data-panel-target]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-panel-target");
                var target = byId(id);
                if (!target) return;
                target.classList.toggle("is-hidden");
                setPanelVisibilityForViewport();
            });
        });

        document.querySelectorAll(".ui-panel").forEach(function (panel) {
            var collapseBtn = panel.querySelector('[data-panel-action="collapse"]');
            var hideBtn = panel.querySelector('[data-panel-action="hide"]');

            if (collapseBtn) {
                collapseBtn.addEventListener("click", function () {
                    panel.classList.toggle("is-collapsed");
                });
            }
            if (hideBtn) {
                hideBtn.addEventListener("click", function () {
                    panel.classList.add("is-hidden");
                    setPanelVisibilityForViewport();
                });
            }
        });

        if (mobileMedia && typeof mobileMedia.addEventListener === "function") {
            mobileMedia.addEventListener("change", setPanelVisibilityForViewport);
        }
        setPanelVisibilityForViewport();
    }

    function setupUI() {
        if (isSetup) return;

        UI.sliderCouchY = byId("slider-couch-y");
        UI.sliderCouchZ = byId("slider-couch-z");
        UI.sliderRotorSpeed = byId("slider-rotor-speed");
        UI.sliderInjectA = byId("slider-inject-a");
        UI.sliderInjectB = byId("slider-inject-b");
        UI.btnScanToggle = byId("btn-scan-toggle");
        UI.btnXrayToggle = byId("btn-xray-toggle");
        UI.selectDetectorRows = byId("select-detector-rows");
        UI.btnPatientToggle = byId("btn-patient-toggle");
        UI.commandLogList = byId("command-log-list");
        UI.btnClearCommandLog = byId("btn-clear-command-log");
        UI.btnCameraStreamToggle = byId("btn-camera-stream-toggle");
        UI.selectStreamCodec = byId("select-stream-codec");
        UI.selectStreamProto = byId("select-stream-proto");
        UI.streamUrlDisplay = byId("stream-url-display");

        applyProfileUIConfig();
        bindPanelControls();

        if (UI.btnCameraStreamToggle) {
            UI.btnCameraStreamToggle.addEventListener("click", function () {
                if (global.CameraSim) {
                    var state = global.CameraSim.getState();
                    if (state.isStreaming) {
                        executeConsoleCommand("camera", "stopStream");
                    } else {
                        var codec = UI.selectStreamCodec ? UI.selectStreamCodec.value : "mjpeg";
                        var proto = UI.selectStreamProto ? UI.selectStreamProto.value : "http";
                        var fpsSelect = byId("select-stream-fps");
                        var qualSelect = byId("select-stream-quality");
                        var widthInput = byId("input-stream-width");
                        var heightInput = byId("input-stream-height");
                        var hfovInput = byId("input-stream-hfov");

                        var fps = fpsSelect ? parseInt(fpsSelect.value, 10) : 30;
                        var quality = qualSelect ? parseFloat(qualSelect.value) : 0.92;
                        var width = widthInput ? parseInt(widthInput.value, 10) : 1280;
                        var height = heightInput ? parseInt(heightInput.value, 10) : 960;
                        var hfov = hfovInput ? parseInt(hfovInput.value, 10) : 60;

                        executeConsoleCommand("camera", "startStream", { codec: codec, protocol: proto, fps: fps, quality: quality, width: width, height: height, hfov: hfov });
                    }
                }
            });
        }

        UI.sliderCouchY.addEventListener("input", function (e) {
            executeConsoleCommand("couch", "moveY", parseFloat(e.target.value));
        });
        UI.sliderCouchZ.addEventListener("input", function (e) {
            executeConsoleCommand("couch", "moveZ", parseFloat(e.target.value));
        });
        UI.sliderInjectA.addEventListener("input", function (e) {
            executeConsoleCommand("injector", "setA", parseFloat(e.target.value));
        });
        UI.sliderInjectB.addEventListener("input", function (e) {
            executeConsoleCommand("injector", "setB", parseFloat(e.target.value));
        });
        UI.selectDetectorRows.addEventListener("change", function (e) {
            executeConsoleCommand("gantry", "setDetectorRows", parseInt(e.target.value, 10));
        });

        if (UI.btnClearCommandLog && global.CTCommandLogService) {
            UI.btnClearCommandLog.addEventListener("click", function () {
                global.CTCommandLogService.clear();
                renderCommandLog();
                updateLastCommandMonitor();
            });
        }

        renderBatchUI();
        renderCommandLog();
        unsubscribers.push(AppState.subscribe(syncInteractiveState));
        var lastBatchState = "";
        unsubscribers.push(AppState.subscribe(function () {
            updateStateMonitor();
            var currentState = JSON.stringify([
                AppState.gantry.scanSequence, 
                AppState.gantry.activeBatchIndex, 
                AppState.gantry.injectorSyncIndex, 
                AppState.gantry.countdown, 
                AppState.gantry.isScanning,
                AppState.gantry.cancelRequested
            ]);
            if (currentState !== lastBatchState) {
                lastBatchState = currentState;
                renderBatchUI();
            }
        }));

        if (global.CTCommandLogService && typeof global.CTCommandLogService.subscribe === "function") {
            unsubscribers.push(
                global.CTCommandLogService.subscribe(function () {
                    renderCommandLog();
                    updateLastCommandMonitor();
                }),
            );
        }


        if (typeof global.syncAllPatientTransformUI === "function") {
            global.syncAllPatientTransformUI();
        }

        isSetup = true;
    }

    function teardownUI() {
        while (unsubscribers.length > 0) {
            var off = unsubscribers.pop();
            if (typeof off === "function") off();
        }
        isSetup = false;
    }

    global.CTUIController = {
        setup: setupUI,
        teardown: teardownUI,
        renderBatchQueue: renderBatchUI,
        renderMonitor: updateStateMonitor,
        renderCommandLog: renderCommandLog,
    };

    global.updateStateMonitor = updateStateMonitor;
    global.renderBatchUI = renderBatchUI;
})(window);
