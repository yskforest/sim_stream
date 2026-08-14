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

            var cardCls = "relative rounded-lg p-2 w-[122px] min-w-[122px] max-w-[130px] flex flex-col justify-between transition-all duration-200 " + 
                (isActive ? "bg-blue-950/90 border-2 border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.55)] scale-105 z-10" : "bg-slate-900/90 border border-slate-700 hover:border-slate-500");

            var overlay = (isActive && countdown > 0) ? `<div class="absolute inset-0 bg-black/85 rounded-lg flex flex-col items-center justify-center z-20 backdrop-blur-[2px]">
                <span class="text-[9px] text-yellow-400 font-bold tracking-wider">DELAY</span>
                <span class="text-xl font-mono text-white font-bold leading-none">${countdown}</span></div>` : "";

            var dis = isRunning ? "disabled" : "";
            var disCls = isRunning ? "opacity-70 cursor-not-allowed" : "";

            return `<div class="${cardCls}">
                ${overlay}
                <div class="text-[10px] text-slate-400 mb-1 w-full flex justify-between items-center">
                    <span class="font-bold ${isActive ? 'text-yellow-400' : 'text-slate-300'}">#${index + 1} Batch</span>
                    <button class="btn-del hover:text-red-400 text-sm leading-none font-bold text-slate-400 transition-colors ${(isRunning || seq.length <= 1) ? 'opacity-20 cursor-not-allowed' : ''}" ${(isRunning || seq.length <= 1) ? "disabled" : ""}>&times;</button>
                </div>
                <select class="sel-mode w-full bg-slate-950 text-white text-[10px] py-1 px-1 rounded border border-slate-700 outline-none hover:border-blue-500 transition-colors cursor-pointer ${disCls}" ${dis}>
                    ${optHtml}
                </select>
                <div class="w-full flex items-center justify-between my-1 text-[9px] text-slate-400">
                    <span>Delay:</span>
                    <div class="flex items-center gap-0.5">
                        <input type="number" min="0" max="60" value="${batch.delay}" class="inp-delay w-8 bg-slate-950 text-white py-0.5 px-0.5 rounded border border-slate-700 outline-none text-center font-mono text-[9px]" ${dis}>
                        <span>s</span>
                    </div>
                </div>
                <button class="btn-sync w-full py-0.5 rounded text-[8px] font-bold transition-colors ${isSync ? 'bg-purple-600 text-white border border-purple-400' : 'bg-slate-950 text-slate-400 border border-slate-700 hover:bg-slate-800'} ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}" ${dis}>
                    INJ: ${isSync ? "ON" : "OFF"}
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
        if (addBtn) {
            addBtn.disabled = seq.length >= 6 || isRunning;
            addBtn.className = "flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold py-1.5 rounded text-xs transition " + (addBtn.disabled ? "opacity-30 cursor-not-allowed" : "");
        }

        var runBtn = byId("btn-run-sequence");
        if (runBtn) {
            runBtn.disabled = isRunning && AppState.gantry.cancelRequested;
            runBtn.onclick = isRunning ? stopAutoSequence : runAutoSequence;
            runBtn.className = isRunning 
                ? "flex-[2] bg-red-600 hover:bg-red-500 border border-red-500 text-white font-bold py-1.5 rounded text-xs shadow-md transition " + (AppState.gantry.cancelRequested ? "opacity-60 cursor-not-allowed" : "")
                : "flex-[2] bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white font-bold py-1.5 rounded text-xs shadow-md transition";
            runBtn.innerText = isRunning ? (AppState.gantry.cancelRequested ? "STOPPING..." : "STOP SEQUENCE") : "RUN SEQUENCE";
        }
    }

    function bindPanelControls() {
        // Modern sidebar tab/dock navigation is managed by initModernNavigation()
    }

    function applyConfigToUIInputs() {
        if (!global.CTConfigService) return;
        var get = global.CTConfigService.get.bind(global.CTConfigService);

        var codecSelect = byId("select-stream-codec");
        var protoSelect = byId("select-stream-proto");
        var fpsSelect = byId("select-stream-fps");
        var qualSelect = byId("select-stream-quality");
        var widthInput = byId("input-stream-width");
        var heightInput = byId("input-stream-height");
        var hfovInput = byId("input-stream-hfov");

        if (codecSelect) codecSelect.value = get("camera.codec", "h264");
        if (protoSelect) protoSelect.value = get("camera.protocol", "rtsp");
        if (fpsSelect) fpsSelect.value = String(get("camera.fps", 30));
        if (qualSelect) qualSelect.value = String(get("camera.quality", 0.92));
        if (widthInput) widthInput.value = String(get("camera.width", 1280));
        if (heightInput) heightInput.value = String(get("camera.height", 960));
        if (hfovInput) hfovInput.value = String(get("camera.hfov", 60));

        var detRows = get("hardware.defaultDetectorRows", 320);
        if (AppState && AppState.gantry && typeof detRows === "number") {
            AppState.gantry.detectorRows = detRows;
        }
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

        applyConfigToUIInputs();
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

        initModernNavigation();
        isSetup = true;
    }

    function initModernNavigation() {
        if (!global.CTConfigService) return;
        var get = global.CTConfigService.get.bind(global.CTConfigService);

        var mockEnabled = get("ui.consoleMockEnabled", true);
        setConsoleMockMode(mockEnabled);

        var rightOpen = get("ui.rightSidebarOpen", true);
        var dockOpen = get("ui.bottomDockOpen", true);

        toggleRightSidebar(rightOpen);
        toggleBottomDock(dockOpen);

        var defRightTab = get("ui.defaultRightTab", "view");
        var defDockTab = get("ui.defaultDockTab", "scan");
        switchRightTab(defRightTab);
        switchDockTab(defDockTab);
    }

    function switchLeftTab(tabId) {
        // Left dock merged into bottom dock
    }

    function switchRightTab(tabId) {
        var sidebar = byId("right-sidebar");
        if (!sidebar) return;
        var tabBtns = sidebar.querySelectorAll(".tab-btn");
        var tabPanes = sidebar.querySelectorAll(".tab-pane");

        tabBtns.forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
        });
        tabPanes.forEach(function (pane) {
            pane.classList.toggle("active", pane.id === "tab-right-" + tabId);
        });
    }

    function switchDockTab(tabId) {
        var dock = byId("bottom-dock");
        if (!dock) return;
        var tabBtns = dock.querySelectorAll(".tab-btn");
        var tabPanes = dock.querySelectorAll(".tab-pane");

        tabBtns.forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
        });
        tabPanes.forEach(function (pane) {
            pane.classList.toggle("active", pane.id === "tab-dock-" + tabId);
        });
    }

    function toggleLeftSidebar(forceState) {
        // Left dock merged into bottom dock
    }

    function toggleRightSidebar(forceState) {
        var sidebar = byId("right-sidebar");
        var btn = byId("btn-toggle-right-sidebar");
        var dock = byId("bottom-dock");
        if (!sidebar) return;

        var isCollapsed = typeof forceState === "boolean" ? !forceState : !sidebar.classList.contains("is-collapsed");
        sidebar.classList.toggle("is-collapsed", isCollapsed);
        if (btn) btn.classList.toggle("active", !isCollapsed);
        if (dock) dock.classList.toggle("expand-right", isCollapsed);
    }

    function toggleBottomDock(forceState) {
        var dock = byId("bottom-dock");
        var btn = byId("btn-toggle-dock");
        if (!dock) return;

        var isCollapsed = typeof forceState === "boolean" ? !forceState : !dock.classList.contains("is-collapsed");
        dock.classList.toggle("is-collapsed", isCollapsed);
        if (btn) btn.classList.toggle("active", !isCollapsed);
    }

    function setConsoleMockMode(enabled) {
        if (!AppState.ui) AppState.ui = {};
        AppState.ui.consoleMockEnabled = !!enabled;

        var btnMock = byId("pill-mode-mock");
        var btnExt = byId("pill-mode-external");
        var mockOverlay = byId("mock-console-overlay");
        var scanConsoleBody = byId("mock-console-controls");
        var statusBadge = byId("status-app-mode");

        if (btnMock && btnExt) {
            btnMock.classList.toggle("active", enabled);
            btnExt.classList.toggle("active-external", !enabled);
        }

        if (mockOverlay && scanConsoleBody) {
            if (enabled) {
                mockOverlay.classList.add("hidden");
                scanConsoleBody.classList.remove("opacity-50", "pointer-events-none");
            } else {
                mockOverlay.classList.remove("hidden");
                scanConsoleBody.classList.add("opacity-50", "pointer-events-none");
            }
        }

        if (statusBadge) {
            if (enabled) {
                statusBadge.innerText = "MOCK CONSOLE";
                statusBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-600/50";
            } else {
                statusBadge.innerText = "EXTERNAL CONSOLE";
                statusBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-500/50";
            }
        }
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
        switchLeftTab: switchLeftTab,
        switchRightTab: switchRightTab,
        switchDockTab: switchDockTab,
        toggleLeftSidebar: toggleLeftSidebar,
        toggleRightSidebar: toggleRightSidebar,
        toggleBottomDock: toggleBottomDock,
        setConsoleMockMode: setConsoleMockMode,
    };

    global.switchLeftTab = switchLeftTab;
    global.switchRightTab = switchRightTab;
    global.switchDockTab = switchDockTab;
    global.toggleLeftSidebar = toggleLeftSidebar;
    global.toggleRightSidebar = toggleRightSidebar;
    global.toggleBottomDock = toggleBottomDock;
    global.setConsoleMockMode = setConsoleMockMode;
    global.updateStateMonitor = updateStateMonitor;
    global.renderBatchUI = renderBatchUI;

    var DISTORTION_PRESETS = {
        standard: { k1: 0.20, k2: 0.05, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.00 },
        action_cam: { k1: 0.12, k2: -0.02, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.05 },
        ultra_wide: { k1: 0.45, k2: 0.18, k3: 0.05, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 0.90 },
        pincushion: { k1: -0.15, k2: 0.00, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.00 }
    };

    global.onDistortionParamInput = function onDistortionParamInput() {
        var k1 = parseFloat(byId("slider-distortion-k1").value) || 0;
        var k2 = parseFloat(byId("slider-distortion-k2").value) || 0;
        var k3 = parseFloat(byId("slider-distortion-k3").value) || 0;
        var k4 = parseFloat(byId("slider-distortion-k4").value) || 0;
        var fx = parseFloat(byId("slider-distortion-fx").value) || 1.0;
        var fy = parseFloat(byId("slider-distortion-fy").value) || 1.0;
        var cx = parseFloat(byId("slider-distortion-cx").value) || 0.5;
        var cy = parseFloat(byId("slider-distortion-cy").value) || 0.5;
        var zoom = parseFloat(byId("slider-distortion-zoom").value) || 1.0;

        updateText("val-distortion-k1", k1.toFixed(2));
        updateText("val-distortion-k2", k2.toFixed(2));
        updateText("val-distortion-k3", k3.toFixed(2));
        updateText("val-distortion-k4", k4.toFixed(2));
        updateText("val-distortion-fx", fx.toFixed(2));
        updateText("val-distortion-fy", fy.toFixed(2));
        updateText("val-distortion-cx", cx.toFixed(2));
        updateText("val-distortion-cy", cy.toFixed(2));
        updateText("val-distortion-zoom", zoom.toFixed(2));

        var presetSelect = byId("select-distortion-preset");
        if (presetSelect) presetSelect.value = "custom";

        if (global.AppState && global.AppState.distortion) {
            var d = global.AppState.distortion;
            d.k1 = k1; d.k2 = k2; d.k3 = k3; d.k4 = k4;
            d.fx = fx; d.fy = fy; d.cx = cx; d.cy = cy;
            d.zoom = zoom;
        }

        if (typeof global.updateCameraDistortion === "function") {
            global.updateCameraDistortion();
        }
    };

    global.onDistortionPresetChange = function onDistortionPresetChange(presetKey) {
        var p = DISTORTION_PRESETS[presetKey];
        if (!p) return;

        updateValue("slider-distortion-k1", p.k1);
        updateValue("slider-distortion-k2", p.k2);
        updateValue("slider-distortion-k3", p.k3);
        updateValue("slider-distortion-k4", p.k4);
        updateValue("slider-distortion-fx", p.fx);
        updateValue("slider-distortion-fy", p.fy);
        updateValue("slider-distortion-cx", p.cx);
        updateValue("slider-distortion-cy", p.cy);
        updateValue("slider-distortion-zoom", p.zoom);

        updateText("val-distortion-k1", p.k1.toFixed(2));
        updateText("val-distortion-k2", p.k2.toFixed(2));
        updateText("val-distortion-k3", p.k3.toFixed(2));
        updateText("val-distortion-k4", p.k4.toFixed(2));
        updateText("val-distortion-fx", p.fx.toFixed(2));
        updateText("val-distortion-fy", p.fy.toFixed(2));
        updateText("val-distortion-cx", p.cx.toFixed(2));
        updateText("val-distortion-cy", p.cy.toFixed(2));
        updateText("val-distortion-zoom", p.zoom.toFixed(2));

        if (global.AppState && global.AppState.distortion) {
            Object.assign(global.AppState.distortion, p);
        }

        if (typeof global.updateCameraDistortion === "function") {
            global.updateCameraDistortion();
        }
    };

    global.resetDistortionParamsUI = function resetDistortionParamsUI() {
        var presetSelect = byId("select-distortion-preset");
        if (presetSelect) presetSelect.value = "standard";
        global.onDistortionPresetChange("standard");
    };
})(window);
