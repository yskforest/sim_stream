// CT 3D Simulator - UI Controller Adapter (Slim & Modular)
(function attachUIController(global) {
    "use strict";

    var isSetup = false;
    var unsubscribers = [];

    var byId = function (id) { return document.getElementById(id); };
    var updateText = function (id, text) { var el = byId(id); if (el && el.innerText !== text) el.innerText = text; };
    var updateValue = function (id, val) { var el = byId(id); if (el && el.value != val) el.value = val; };
    var updateClass = function (id, cls) { var el = byId(id); if (el && el.className !== cls) el.className = cls; };
    var updateStyle = function (id, prop, val) { var el = byId(id); if (el && el.style[prop] !== val) el.style[prop] = val; };

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
            var opt = document.createElement("option");
            opt.value = String(v);
            opt.textContent = v === 320 ? "320 Rows (High-End class)" : v + " Rows";
            if (AppState.gantry.detectorRows === v) opt.selected = true;
            UI.selectDetectorRows.appendChild(opt);
        });
    }

    function executeCommand(target, action, valOrParams) {
        var params = typeof valOrParams === "object" && valOrParams !== null ? valOrParams : { value: valOrParams };
        return CTCommandBus.execute({ source: "ui-console", target: target, action: action, params: params });
    }

    function getStreamConfigFromUI() {
        var protoEl = byId("select-stream-proto") || byId("select-stream-protocol");
        var fpsEl = byId("select-stream-fps") || byId("input-stream-fps");
        var qualEl = byId("select-stream-quality") || byId("input-stream-quality");
        var codecEl = byId("select-stream-codec");
        var modeEl = byId("select-stream-mode");
        var wEl = byId("input-stream-width");
        var hEl = byId("input-stream-height");
        var fovEl = byId("input-stream-hfov");

        return {
            width: parseInt(wEl ? wEl.value : "1280", 10) || 1280,
            height: parseInt(hEl ? hEl.value : "960", 10) || 960,
            fps: parseInt(fpsEl ? fpsEl.value : "30", 10) || 30,
            quality: parseFloat(qualEl ? qualEl.value : "0.85") || 0.85,
            mode: modeEl ? modeEl.value : "main",
            codec: codecEl ? codecEl.value : "h264",
            protocol: protoEl ? protoEl.value : "rtsp",
            hfov: parseFloat(fovEl ? fovEl.value : "60") || 60
        };
    }

    function syncInteractiveState(state) {
        if (!state) return;
        var couch = state.couch || { y: 0, z: 0 };
        var gantry = state.gantry || { rotorSpeed: 0, isScanning: false, activeBatchIndex: -1, detectorRows: 320, xrayVisible: false };
        var injector = state.injector || { a: 0, b: 0 };

        [["couch-y-val", couch.y.toFixed(0) + "%"], ["couch-z-val", couch.z.toFixed(0) + "%"],
         ["rotor-speed-val", gantry.rotorSpeed.toFixed(0) + " rpm"],
         ["inject-a-val", injector.a.toFixed(0) + "%"], ["inject-b-val", injector.b.toFixed(0) + "%"]
        ].forEach(function (item) { updateText(item[0], item[1]); });

        [["slider-couch-y", couch.y], ["slider-couch-z", couch.z],
         ["slider-rotor-speed", gantry.rotorSpeed], ["slider-inject-a", injector.a],
         ["slider-inject-b", injector.b], ["select-detector-rows", gantry.detectorRows]
        ].forEach(function (item) { updateValue(item[0], item[1]); });

        var isRunning = gantry.isScanning || gantry.activeBatchIndex >= 0;
        if (UI.selectDetectorRows) UI.selectDetectorRows.disabled = isRunning;

        updateText("btn-scan-toggle", gantry.isScanning ? "Stop Scan" : "Start Scan");
        updateClass("btn-scan-toggle", gantry.isScanning
            ? "w-full bg-red-600 hover:bg-red-500 text-sm py-2 rounded shadow-lg transition font-bold"
            : "w-full bg-green-600 hover:bg-green-500 text-sm py-2 rounded shadow-lg transition font-bold");

        updateText("btn-xray-toggle", gantry.xrayVisible ? "Hide X-Ray Beam" : "Show X-Ray Beam");
        updateClass("btn-xray-toggle", gantry.xrayVisible
            ? "w-full bg-yellow-500 hover:bg-yellow-400 text-xs py-1.5 rounded transition font-bold text-black"
            : "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition");

        var meshes = global.Meshes || window.Meshes;
        if (meshes && meshes.xrayBeam && meshes.xrayBeam.material) {
            meshes.xrayBeam.material.opacity = gantry.xrayVisible ? 0.35 : 0.0;
        }
        if (meshes && meshes.patientGroup) {
            meshes.patientGroup.visible = state.patientVisible;
        }

        updateText("btn-patient-toggle", state.patientVisible ? "Hide Patient" : "Show Patient");
        updateClass("btn-patient-toggle", state.patientVisible
            ? "w-full bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold"
            : "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition text-gray-400");

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

        updateClass("btn-gantry-opaque", gantry.isTranslucent
            ? "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600"
            : "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 font-bold");
        updateClass("btn-gantry-trans", gantry.isTranslucent
            ? "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 font-bold"
            : "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600");

        applyStateToMeshes(state);
    }

    function applyStateToMeshes(state) {
        if (!state) return;
        var meshes = global.Meshes || window.Meshes;
        if (!meshes) return;

        var yRange = (global.CTProfileService && typeof global.CTProfileService.getCouchWorldRange === "function")
            ? global.CTProfileService.getCouchWorldRange("y") : { min: 0.45, max: 0.95 };
        var targetY = yRange.min + (yRange.max - yRange.min) * (state.couch.y / 100);

        if (meshes.tabletopGroup) meshes.tabletopGroup.position.y = targetY;

        if (meshes.bellows && Array.isArray(meshes.bellows)) {
            var partHeight = (targetY - 0.22) / meshes.bellows.length;
            meshes.bellows.forEach(function (mesh, idx) {
                mesh.scale.y = partHeight / 0.1;
                mesh.position.y = idx * partHeight + partHeight / 2;
            });
        }

        var zRange = (global.CTProfileService && typeof global.CTProfileService.getCouchWorldRange === "function")
            ? global.CTProfileService.getCouchWorldRange("z") : { min: 2.6, max: -1.0 };
        if (meshes.tabletopGroup) {
            meshes.tabletopGroup.position.z = zRange.min + (zRange.max - zRange.min) * (state.couch.z / 100);
        }

        if (meshes.detectorGroup && meshes.xrayBeam) {
            var maxRows = (global.CTProfileService && typeof global.CTProfileService.getDetectorRowsMax === "function")
                ? global.CTProfileService.getDetectorRowsMax() : 320;
            var ratio = state.gantry.detectorRows / maxRows;
            meshes.detectorGroup.scale.z = ratio;
            var baseBeam = (global.CTProfileService && typeof global.CTProfileService.getBeamZScaleAtMax === "function")
                ? global.CTProfileService.getBeamZScaleAtMax() : 0.16;
            meshes.xrayBeam.scale.z = baseBeam * ratio;
        }

        function updateSyringe(fluid, plunger, pct) {
            if (fluid) fluid.scale.y = Math.max(0.01, 1.0 - pct / 100);
            if (plunger) plunger.position.y = 0.15 - 0.3 * (pct / 100);
        }
        if (meshes.injector) {
            updateSyringe(meshes.injector.fluidA, meshes.injector.plungerA, state.injector.a);
            updateSyringe(meshes.injector.fluidB, meshes.injector.plungerB, state.injector.b);
        }
    }

    function updateLastCommandMonitor() {
        if (!global.CTCommandLogService) return;
        var logs = global.CTCommandLogService.list();
        var last = logs.length > 0 ? logs[logs.length - 1] : null;
        var src = byId("monitor-last-source"), res = byId("monitor-last-result"), err = byId("monitor-last-error");
        if (!src || !res || !err) return;
        if (!last) { src.innerText = "-"; res.innerText = "-"; err.innerText = "-"; return; }

        src.innerText = last.source || "-";
        var ok = last.result && last.result.success === true;
        res.innerText = ok ? "OK" : "FAIL";
        res.className = ok ? "text-green-400 font-mono" : "text-red-400 font-mono";
        err.innerText = ok ? "-" : (last.result && last.result.error ? last.result.error : "ERROR");
    }

    function updateStateMonitor() {
        var gantry = AppState.gantry;
        var rpm = Math.round(gantry.rotorSpeed);

        updateText("monitor-rpm", rpm + " rpm");
        updateStyle("monitor-rpm-bar", "width", (rpm / 3) + "%");
        updateText("monitor-mode", gantry.currentScanMode ? gantry.currentScanMode.toUpperCase() : "SCANO");
        updateText("monitor-rows", String(gantry.detectorRows));

        updateText("status-badge", gantry.isScanning ? "SCANNING" : "STANDBY");
        updateClass("status-badge", gantry.isScanning
            ? "px-2 py-0.5 rounded text-[10px] font-bold bg-green-900/60 text-green-400 border border-green-500/50 animate-pulse"
            : "px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600 transition-colors duration-300");

        updateText("monitor-couch-y", Math.round(AppState.couch.y) + "%");
        updateText("monitor-couch-z", Math.round(AppState.couch.z) + "%");

        var injA = Math.round(AppState.injector.a), injB = Math.round(AppState.injector.b);
        updateText("monitor-inj-a", (100 - injA) + "%");
        updateText("monitor-inj-b", (100 - injB) + "%");
        updateStyle("monitor-inj-a-bar", "width", (100 - injA) + "%");
        updateStyle("monitor-inj-b-bar", "width", (100 - injB) + "%");

        updateLastCommandMonitor();
    }

    function renderCommandLog() {
        var container = byId("command-log-list");
        if (!container || !global.CTCommandLogService) return;
        var logs = global.CTCommandLogService.list();
        if (logs.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-center py-2">No commands logged yet</div>';
            return;
        }

        container.innerHTML = logs.slice().reverse().map(function (item) {
            var time = new Date(item.timestamp).toLocaleTimeString();
            var ok = item.result && item.result.success;
            var color = ok ? "text-green-400" : "text-red-400";
            var err = !ok && item.result && item.result.error ? " - " + item.result.error : "";
            return '<div class="flex items-center justify-between border-b border-gray-800 pb-1 pt-1"><div class="flex items-center gap-1.5"><span class="text-gray-500">[' + time + ']</span><span class="text-blue-300 font-bold">' + item.source + '</span><span class="text-gray-400">&rarr;</span><span class="text-purple-300">' + item.target + '.' + item.action + '</span></div><span class="' + color + ' font-bold">' + (ok ? "OK" : "FAIL" + err) + '</span></div>';
        }).join("");
    }

    function renderBatchUI() {
        var container = byId("batch-list-container");
        if (!container || !AppState.gantry.scanSequence) return;

        var seq = AppState.gantry.scanSequence;
        var activeIdx = AppState.gantry.activeBatchIndex;
        var syncIdx = AppState.gantry.injectorSyncIndex;
        var isRunning = activeIdx >= 0;
        var isAutoRun = global.isSequenceRunning || false;

        var runBtn = byId("btn-run-seq");
        if (runBtn) {
            runBtn.innerText = isAutoRun ? "Stop Sequence" : "Run All Batches";
            runBtn.className = isAutoRun
                ? "bg-red-700 hover:bg-red-600 text-white font-bold px-3 py-1 rounded text-xs shadow-md transition-colors"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-3 py-1 rounded text-xs shadow-md transition-colors";
        }

        var modes = [
            { id: "scano", label: "Scano (Topo)" }, { id: "dual_scano", label: "Dual Scano" },
            { id: "helical", label: "Helical Scan" }, { id: "axial", label: "Axial Scan" },
            { id: "volume", label: "Volume (3D)" }, { id: "dynamic", label: "Dynamic Perfusion" },
            { id: "real_prep", label: "RealPrep Monitoring" }, { id: "3d_landmark", label: "3D Landmark" }
        ];

        container.innerHTML = seq.map(function (b, idx) {
            var isActive = activeIdx === idx;
            var isSync = syncIdx === idx;
            var dis = isRunning ? "disabled" : "";
            var cardBorder = isActive ? "border-amber-400 ring-2 ring-amber-500/50 bg-slate-800" : "border-slate-700 bg-slate-900/90";

            var optionsHtml = modes.map(function (m) {
                return '<option value="' + m.id + '" ' + (b.mode === m.id ? "selected" : "") + ">" + m.label + "</option>";
            }).join("");

            return '<div class="batch-card flex flex-col justify-between p-2 rounded-lg border text-xs relative transition-all duration-200 ' + cardBorder + '">' +
                '<div class="flex items-center justify-between border-b border-slate-700/60 pb-1 mb-1.5">' +
                    '<span class="font-bold text-slate-300 text-[11px]">#' + (idx + 1) + "</span>" +
                    '<button class="btn-del text-slate-500 hover:text-red-400 font-bold text-sm px-1 ' + (seq.length <= 1 || isRunning ? "opacity-30 pointer-events-none" : "") + '" ' + dis + ">&times;</button>" +
                "</div>" +
                '<div class="space-y-1.5 mb-2">' +
                    '<select class="sel-mode w-full bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-blue-500" ' + dis + ">" + optionsHtml + "</select>" +
                    '<div class="flex items-center justify-between text-[9px] text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">' +
                        "<span>Delay:</span>" +
                        '<div class="flex items-center gap-0.5"><input type="number" class="inp-delay w-10 bg-transparent text-right font-mono text-white focus:outline-none" value="' + (b.delay || 0) + '" min="0" max="60" ' + dis + " /><span>s</span></div>" +
                    "</div>" +
                "</div>" +
                '<button class="btn-sync w-full py-0.5 rounded text-[8px] font-bold transition-colors ' + (isSync ? "bg-purple-600 text-white border border-purple-400" : "bg-slate-950 text-slate-400 border border-slate-700 hover:bg-slate-800") + " " + (isRunning ? "opacity-50 cursor-not-allowed" : "") + '" ' + dis + ">INJ: " + (isSync ? "ON" : "OFF") + "</button>" +
            "</div>";
        }).join("");

        Array.from(container.children || []).forEach(function (card, idx) {
            var delBtn = card.querySelector(".btn-del");
            if (delBtn) delBtn.onclick = function () { removeScanBatch(idx); };
            var sel = card.querySelector(".sel-mode");
            if (sel) sel.onchange = function (e) { updateBatchData(idx, "mode", e.target.value); };
            var inp = card.querySelector(".inp-delay");
            if (inp) inp.onchange = function (e) { updateBatchData(idx, "delay", parseInt(e.target.value, 10) || 0); };
            var syn = card.querySelector(".btn-sync");
            if (syn) syn.onclick = function () { setInjectorSync(idx); };
        });

        var addBtn = byId("btn-add-batch");
        if (addBtn) {
            addBtn.disabled = isRunning || seq.length >= 6;
            addBtn.className = (seq.length >= 6 || isRunning)
                ? "bg-slate-800 text-slate-600 border border-slate-700 px-3 py-1 rounded text-xs font-semibold cursor-not-allowed opacity-50"
                : "bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-600 hover:border-blue-400 px-3 py-1 rounded text-xs font-semibold shadow transition-colors";
        }
    }

    function setupUI() {
        if (isSetup) return;

        UI.sliderCouchY = byId("slider-couch-y");
        UI.sliderCouchZ = byId("slider-couch-z");
        UI.sliderRotorSpeed = byId("slider-rotor-speed");
        UI.sliderInjectA = byId("slider-inject-a");
        UI.sliderInjectB = byId("slider-inject-b");
        UI.selectDetectorRows = byId("select-detector-rows");
        UI.selectCameraView = byId("select-camera-view");
        UI.selectFocus = byId("select-focus");

        applyProfileUIConfig();
        initModernNavigation();

        function addListener(el, event, handler) {
            if (!el) return;
            el.addEventListener(event, handler);
            unsubscribers.push(function () { el.removeEventListener(event, handler); });
        }

        [["sliderCouchY", "couch", "y"], ["sliderCouchZ", "couch", "z"],
         ["sliderInjectA", "injector", "a"], ["sliderInjectB", "injector", "b"]
        ].forEach(function (def) {
            addListener(UI[def[0]], "input", function (e) {
                executeCommand(def[1], "setPosition", { axis: def[2], value: parseFloat(e.target.value) });
            });
        });

        addListener(UI.sliderRotorSpeed, "input", function (e) {
            executeCommand("gantry", "setRotorSpeed", { speed: parseFloat(e.target.value) });
        });

        addListener(UI.selectDetectorRows, "change", function (e) {
            executeCommand("gantry", "setDetectorRows", { rows: parseInt(e.target.value, 10) });
        });

        addListener(UI.selectCameraView, "change", function (e) {
            if (typeof global.setCameraView === "function") global.setCameraView(e.target.value);
        });

        addListener(UI.selectFocus, "change", function (e) {
            handleFocusChange(e.target.value);
        });

        var btnClearLog = byId("btn-clear-command-log");
        if (btnClearLog) {
            addListener(btnClearLog, "click", function () {
                if (global.CTCommandLogService) global.CTCommandLogService.clear();
            });
        }

        var btnStreamToggle = byId("btn-camera-stream-toggle");
        if (btnStreamToggle) {
            addListener(btnStreamToggle, "click", toggleCameraStream);
        }

        var streamMode = byId("select-stream-mode"),
            streamCodec = byId("select-stream-codec"),
            streamProto = byId("select-stream-proto") || byId("select-stream-protocol"),
            streamFps = byId("select-stream-fps") || byId("input-stream-fps"),
            streamQual = byId("select-stream-quality") || byId("input-stream-quality"),
            streamW = byId("input-stream-width"),
            streamH = byId("input-stream-height"),
            streamHfov = byId("input-stream-hfov");

        function updateStreamConfig() {
            var cfg = getStreamConfigFromUI();
            if (global.CTVideoStreamService) {
                global.CTVideoStreamService.start(cfg);
            }
            if (global.requestRenderFrame) global.requestRenderFrame(15);
        }

        [streamMode, streamCodec, streamProto, streamFps, streamQual, streamW, streamH, streamHfov].filter(Boolean).forEach(function (el) {
            addListener(el, "change", function () {
                if (AppState.camera && AppState.camera.isStreaming) updateStreamConfig();
            });
            if (el.tagName === "INPUT") {
                addListener(el, "input", function () {
                    if (AppState.camera && AppState.camera.isStreaming) updateStreamConfig();
                });
            }
        });

        if (global.CTStreamGateway && typeof global.CTStreamGateway.subscribeFrames === "function") {
            var prevBlobUrl = null;
            var unsubFrames = global.CTStreamGateway.subscribeFrames(function (blob) {
                var img = byId("stream-preview-img");
                if (img && blob && typeof URL !== "undefined") {
                    if (prevBlobUrl) URL.revokeObjectURL(prevBlobUrl);
                    prevBlobUrl = URL.createObjectURL(blob);
                    img.src = prevBlobUrl;
                }
            });
            unsubscribers.push(unsubFrames);
        }

        var distEnable = byId("input-distortion-enable");
        if (distEnable) {
            addListener(distEnable, "change", function (e) { toggleFisheye(e.target.checked); });
        }

        var distPreset = byId("select-distortion-preset");
        if (distPreset) {
            addListener(distPreset, "change", function (e) {
                if (e.target.value !== "custom") onDistortionPresetChange(e.target.value);
            });
        }

        ["k1", "k2", "k3", "k4", "fx", "fy", "cx", "cy", "zoom"].forEach(function (k) {
            var slider = byId("slider-distortion-" + k);
            if (slider) addListener(slider, "input", onDistortionParamInput);
        });

        unsubscribers.push(AppState.subscribe(function (state) {
            syncInteractiveState(state);
            updateStateMonitor();
            renderBatchUI();
        }));

        if (global.CTCommandLogService && typeof global.CTCommandLogService.subscribe === "function") {
            unsubscribers.push(global.CTCommandLogService.subscribe(function () {
                renderCommandLog();
                updateLastCommandMonitor();
            }));
        }

        syncInteractiveState(AppState);
        updateStateMonitor();
        renderBatchUI();
        renderCommandLog();
        updatePatientGlbSelectOptions();
        syncAllPatientTransformUI();

        isSetup = true;
    }

    function initModernNavigation() {
        if (!global.CTConfigService) return;
        var get = global.CTConfigService.get.bind(global.CTConfigService);
        setConsoleMockMode(get("ui.consoleMockEnabled", true));
        toggleRightSidebar(get("ui.rightSidebarOpen", true));
        toggleBottomDock(get("ui.bottomDockOpen", true));
        switchRightTab(get("ui.defaultRightTab", "view"));
        switchDockTab(get("ui.defaultDockTab", "scan"));
    }

    function switchRightTab(tabId) {
        var sidebar = byId("right-sidebar");
        if (!sidebar) return;
        sidebar.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === tabId); });
        sidebar.querySelectorAll(".tab-pane").forEach(function (p) { p.classList.toggle("active", p.id === "tab-right-" + tabId); });
    }

    function switchDockTab(tabId) {
        var dock = byId("bottom-dock");
        if (!dock) return;
        dock.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === tabId); });
        dock.querySelectorAll(".tab-pane").forEach(function (p) { p.classList.toggle("active", p.id === "tab-dock-" + tabId); });
    }

    function toggleRightSidebar(forceState) {
        var sidebar = byId("right-sidebar"), btn = byId("btn-toggle-right-sidebar"), dock = byId("bottom-dock");
        if (!sidebar) return;
        var isCollapsed = typeof forceState === "boolean" ? !forceState : !sidebar.classList.contains("is-collapsed");
        sidebar.classList.toggle("is-collapsed", isCollapsed);
        if (btn) btn.classList.toggle("active", !isCollapsed);
        if (dock) dock.classList.toggle("expand-right", isCollapsed);
    }

    function toggleBottomDock(forceState) {
        var dock = byId("bottom-dock"), btn = byId("btn-toggle-dock");
        if (!dock) return;
        var isCollapsed = typeof forceState === "boolean" ? !forceState : !dock.classList.contains("is-collapsed");
        dock.classList.toggle("is-collapsed", isCollapsed);
        if (btn) btn.classList.toggle("active", !isCollapsed);
    }

    function setConsoleMockMode(enabled) {
        if (!AppState.ui) AppState.ui = {};
        AppState.ui.consoleMockEnabled = !!enabled;

        var btnMock = byId("pill-mode-mock"), btnExt = byId("pill-mode-external"),
            mockOverlay = byId("mock-console-overlay"), scanBody = byId("mock-console-controls"),
            statusBadge = byId("status-app-mode");

        if (btnMock && btnExt) {
            btnMock.classList.toggle("active", enabled);
            btnExt.classList.toggle("active-external", !enabled);
        }
        if (mockOverlay && scanBody) {
            mockOverlay.classList.toggle("hidden", enabled);
            scanBody.classList.toggle("opacity-50", !enabled);
            scanBody.classList.toggle("pointer-events-none", !enabled);
        }
        if (statusBadge) {
            statusBadge.innerText = enabled ? "MOCK CONSOLE" : "EXTERNAL CONSOLE";
            statusBadge.className = enabled
                ? "text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-600/50"
                : "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-500/50";
        }
    }

    function toggleCameraStream() {
        var isStreaming = AppState.camera && AppState.camera.isStreaming;
        if (isStreaming) {
            CTCommandBus.execute({ source: "ui-console", target: "camera", action: "stopStream" });
        } else {
            var cfg = getStreamConfigFromUI();
            CTCommandBus.execute({ source: "ui-console", target: "camera", action: "startStream", params: cfg });
        }
        if (global.requestRenderFrame) global.requestRenderFrame(30);
    }

    function toggleScan() {
        var isScan = !AppState.gantry.isScanning;
        CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setScanning", params: { value: isScan } });
        if (typeof TWEEN !== "undefined") {
            new TWEEN.Tween(AppState.gantry).to({ rotorSpeed: isScan ? 100 : 0 }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut).onUpdate(function () { AppState.notify(); }).start();
        }
    }

    function setScanMode(mode) {
        CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "scanMode", value: mode } });
    }

    function toggleXRay() {
        var isVisible = !AppState.gantry.xrayVisible;
        CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setXrayVisible", params: { value: isVisible } });
        if (isVisible) setGantryOpacity(true);
    }

    function setGantryOpacity(isTranslucent) {
        if (!Meshes.materials) return;
        var opacity = isTranslucent ? 0.2 : 1.0;
        if (Meshes.materials.gantry) {
            Meshes.materials.gantry.transparent = isTranslucent;
            Meshes.materials.gantry.opacity = opacity;
            Meshes.materials.gantry.depthWrite = !isTranslucent;
            Meshes.materials.gantry.needsUpdate = true;
        }
        if (Meshes.materials.tunnel) {
            Meshes.materials.tunnel.transparent = isTranslucent;
            Meshes.materials.tunnel.opacity = isTranslucent ? 0.35 : 1.0;
            Meshes.materials.tunnel.transmission = isTranslucent ? 0.9 : 0.0;
            Meshes.materials.tunnel.depthWrite = !isTranslucent;
            Meshes.materials.tunnel.needsUpdate = true;
        }
        if (Array.isArray(Meshes.materials.accessories)) {
            Meshes.materials.accessories.forEach(function (mat) {
                mat.transparent = isTranslucent;
                mat.opacity = opacity;
                mat.depthWrite = !isTranslucent;
                mat.needsUpdate = true;
            });
        }
        if (window.AppState) AppState.update("gantry", "isTranslucent", isTranslucent);
    }

    function togglePatient() {
        CTCommandBus.execute({ source: "ui-console", target: "simulator", action: "setPatientVisible", params: { value: !AppState.patientVisible } });
    }

    async function changePatientGlbModel(modelId) {
        AppState.patientModelId = modelId;
        if (window.CTModelRegistry && window.Meshes && window.Meshes.patientGroup) {
            while (Meshes.patientGroup.children.length > 0) {
                Meshes.patientGroup.remove(Meshes.patientGroup.children[0]);
            }
            var instance = await CTModelRegistry.spawnModelInstance(modelId, { instanceId: "patient_primary", attachTo: "couch", visible: AppState.patientVisible });
            if (instance && instance.sceneObject) {
                Meshes.patientGroup.add(instance.sceneObject);
                Meshes.patientGroup.visible = AppState.patientVisible;
                var pos = instance.transform.position || [0, -0.1, 0.45], rot = instance.transform.rotation || [-90, 0, 0];
                window.AppState.patientOffset = { x: pos[0], y: pos[1], z: pos[2], rotX: rot[0], rotY: rot[1], rotZ: rot[2] };
                syncAllPatientTransformUI();
            }
        }
    }

    function updatePatientGlbSelectOptions() {
        var selectEl = byId("select-patient-glb");
        if (!selectEl) return;
        var models = (window.CTModelsConfig && typeof window.CTModelsConfig.getAllModels === "function") ? window.CTModelsConfig.getAllModels() : [];
        selectEl.innerHTML = "";
        models.forEach(function (m) {
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.name || (m.id + " (" + (m.path || "").split("/").pop() + ")");
            if (window.AppState && window.AppState.patientModelId === m.id) opt.selected = true;
            selectEl.appendChild(opt);
        });
    }

    async function spawnCustomGlbFromInput() {
        var inputEl = byId("input-add-glb-path");
        if (!inputEl || !inputEl.value.trim()) return;
        var path = inputEl.value.trim();
        var modelId = path.split("/").pop().replace(".glb", "") || "custom_glb";

        if (window.CTModelsConfig) {
            window.CTModelsConfig.registerModel({ id: modelId, name: "Custom GLB: " + modelId, path: path, category: "patient", attachTo: "couch" });
            updatePatientGlbSelectOptions();
        }
        try {
            await CTModelRegistry.spawnModelInstance(modelId, { path: path, attachTo: "couch" });
            alert("Successfully spawned model: " + modelId);
            inputEl.value = "";
        } catch (err) {
            alert("Failed to load GLB from path: " + path);
        }
    }

    function _updatePatientTransform(key, valStr) {
        if (!window.AppState) return;
        if (!window.AppState.patientOffset) {
            window.AppState.patientOffset = { x: 0, y: -0.1, z: 0.45, rotX: -90, rotY: 0, rotZ: 0, scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0 };
        }
        if (!key) return syncAllPatientTransformUI();

        var val = parseFloat(valStr);
        if (isNaN(val)) return;
        window.AppState.patientOffset[key] = val;
        syncAllPatientTransformUI();

        var po = window.AppState.patientOffset;
        if (window.CTModelRegistry) {
            window.CTModelRegistry.updateInstanceTransform("patient_primary", {
                position: [po.x, po.y, po.z], rotation: [po.rotX, po.rotY, po.rotZ], scale: [po.scaleX, po.scaleY, po.scaleZ]
            });
        }
    }

    function onPatientPosSliderChange(key) { var el = byId("slider-patient-pos-" + key); if (el) _updatePatientTransform(key, el.value); }
    function onPatientPosInputChange(key) { var el = byId("input-patient-pos-" + key); if (el) _updatePatientTransform(key, el.value); }

    function syncAllPatientTransformUI() {
        if (!window.AppState || !window.AppState.patientOffset) return;
        var po = window.AppState.patientOffset;
        ["x", "y", "z", "rotX", "rotY", "rotZ", "scaleX", "scaleY", "scaleZ"].forEach(function (k) {
            var input = byId("input-patient-pos-" + k), slider = byId("slider-patient-pos-" + k);
            var val = typeof po[k] === "number" ? po[k] : (k.startsWith("scale") ? 1.0 : 0);
            if (input) input.value = k.startsWith("rot") ? val.toFixed(0) : val.toFixed(2);
            if (slider) slider.value = String(val);
        });
    }

    function resetPatientPositionUI() {
        if (!window.AppState) return;
        window.AppState.patientOffset = { x: 0, y: -0.1, z: 0.45, rotX: -90, rotY: 0, rotZ: 0, scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0 };
        syncAllPatientTransformUI();
        var po = window.AppState.patientOffset;
        if (window.CTModelRegistry) {
            window.CTModelRegistry.updateInstanceTransform("patient_primary", {
                position: [po.x, po.y, po.z], rotation: [po.rotX, po.rotY, po.rotZ], scale: [po.scaleX, po.scaleY, po.scaleZ]
            });
        }
    }

    function showInfoDialog(key) {
        if (!key || key === "none") return;
        var dialog = byId("info-dialog"), title = byId("info-dialog-title"), desc = byId("info-dialog-desc");
        if (!dialog || !title || !desc) return;
        var text = (global.Descriptions && global.Descriptions[key]) || "Description not found.";
        var lines = text.split("\n\n");
        title.innerText = lines[0];
        desc.innerText = lines[1] || "";
        dialog.classList.remove("hidden", "opacity-0");
    }

    function hideInfoDialog() {
        var dialog = byId("info-dialog"), focus = byId("select-focus");
        if (dialog) dialog.classList.add("hidden");
        if (focus) focus.value = "";
    }

    function handleFocusChange(value) {
        if (!value) return;
        if (value === "XrayTube" || value === "Detector") setGantryOpacity(true);
        else if (value === "Gantry" || value === "TouchPanel") setGantryOpacity(false);
        if (typeof global.setCameraView === "function") global.setCameraView("focus_" + value);
        showInfoDialog(value);
    }

    function teardownUI() {
        while (unsubscribers.length > 0) unsubscribers.pop()();
        isSetup = false;
    }

    var DISTORTION_PRESETS = {
        standard: { k1: 0.20, k2: 0.05, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.00 },
        action_cam: { k1: 0.12, k2: -0.02, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.05 },
        fisheye: { k1: 0.40, k2: 0.15, k3: -0.02, k4: 0.00, fx: 0.90, fy: 0.90, cx: 0.50, cy: 0.50, zoom: 0.95 },
        pincushion: { k1: -0.15, k2: 0.00, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.00 }
    };

    function onDistortionParamInput() {
        var params = {};
        ["k1", "k2", "k3", "k4", "fx", "fy", "cx", "cy", "zoom"].forEach(function (k) {
            var el = byId("slider-distortion-" + k), num = byId("num-distortion-" + k);
            var val = el ? parseFloat(el.value) : 0;
            if (num) num.value = val.toFixed(2);
            params[k] = val;
        });
        if (global.CTVideoStreamService) global.CTVideoStreamService.updateDistortionParameters(params);
        if (typeof global.updateCameraDistortion === "function") global.updateCameraDistortion();
    }

    function onDistortionPresetChange(presetKey) {
        var p = DISTORTION_PRESETS[presetKey];
        if (!p) return;
        Object.keys(p).forEach(function (k) {
            var el = byId("slider-distortion-" + k), num = byId("num-distortion-" + k);
            if (el) el.value = String(p[k]);
            if (num) num.value = Number(p[k]).toFixed(2);
        });
        if (global.CTVideoStreamService) global.CTVideoStreamService.updateDistortionParameters(p);
        if (typeof global.updateCameraDistortion === "function") global.updateCameraDistortion();
    }

    function resetDistortionParamsUI() {
        var select = byId("select-distortion-preset");
        if (select) select.value = "standard";
        onDistortionPresetChange("standard");
    }

    global.CTUIController = {
        setup: setupUI, teardown: teardownUI, renderBatchQueue: renderBatchUI,
        renderMonitor: updateStateMonitor, renderCommandLog: renderCommandLog,
        switchRightTab: switchRightTab, switchDockTab: switchDockTab,
        toggleRightSidebar: toggleRightSidebar, toggleBottomDock: toggleBottomDock,
        setConsoleMockMode: setConsoleMockMode
    };

    Object.assign(global, {
        switchLeftTab: function () {}, switchRightTab: switchRightTab, switchDockTab: switchDockTab,
        toggleLeftSidebar: function () {}, toggleRightSidebar: toggleRightSidebar, toggleBottomDock: toggleBottomDock,
        setConsoleMockMode: setConsoleMockMode, updateStateMonitor: updateStateMonitor, renderBatchUI: renderBatchUI,
        toggleScan: toggleScan, setScanMode: setScanMode, toggleXRay: toggleXRay, setGantryOpacity: setGantryOpacity,
        togglePatient: togglePatient, changePatientGlbModel: changePatientGlbModel,
        updatePatientGlbSelectOptions: updatePatientGlbSelectOptions, spawnCustomGlbFromInput: spawnCustomGlbFromInput,
        onPatientPosSliderChange: onPatientPosSliderChange, onPatientPosInputChange: onPatientPosInputChange,
        syncAllPatientTransformUI: syncAllPatientTransformUI, resetPatientPositionUI: resetPatientPositionUI,
        showInfoDialog: showInfoDialog, hideInfoDialog: hideInfoDialog, handleFocusChange: handleFocusChange,
        onDistortionParamInput: onDistortionParamInput, onDistortionPresetChange: onDistortionPresetChange,
        resetDistortionParamsUI: resetDistortionParamsUI, toggleCameraStream: toggleCameraStream
    });
})(typeof window !== "undefined" ? window : this);
