(function attachUIController(global) {
    "use strict";

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

        if (Meshes && Meshes.xrayBeam && Meshes.xrayBeam.material) {
            Meshes.xrayBeam.material.opacity = gantry.xrayVisible ? 0.35 : 0.0;
        }
        if (Meshes && Meshes.patientGroup) {
            Meshes.patientGroup.visible = state.patientVisible;
        }

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

    function applyStateToMeshes(state) {
        if (!state) return;
        var meshes = (typeof window !== "undefined" && window.Meshes) ? window.Meshes : (typeof Meshes !== "undefined" ? Meshes : null);
        if (!meshes) return;

        // UI上の0-100%を、プロファイル定義の実空間座標へ変換する
        var yRange = (global.CTProfileService && typeof global.CTProfileService.getCouchWorldRange === "function")
            ? global.CTProfileService.getCouchWorldRange("y")
            : { min: 0.45, max: 0.95 };
        var couchY_min = yRange.min;
        var couchY_max = yRange.max;
        var targetY = couchY_min + (couchY_max - couchY_min) * (state.couch.y / 100);

        if (meshes.tabletopGroup) meshes.tabletopGroup.position.y = targetY;

        if (meshes.bellows && Array.isArray(meshes.bellows)) {
            var baseTop = 0.2;
            var totalBellowsHeight = targetY - baseTop - 0.02;
            var partHeight = totalBellowsHeight / meshes.bellows.length;

            meshes.bellows.forEach(function (mesh, index) {
                mesh.scale.y = partHeight / 0.1;
                mesh.position.y = index * partHeight + partHeight / 2;
            });
        }

        var zRange = (global.CTProfileService && typeof global.CTProfileService.getCouchWorldRange === "function")
            ? global.CTProfileService.getCouchWorldRange("z")
            : { min: 2.6, max: -1.0 };
        var couchZ_min = zRange.min;
        var couchZ_max = zRange.max;
        if (meshes.tabletopGroup) {
            meshes.tabletopGroup.position.z = couchZ_min + (couchZ_max - couchZ_min) * (state.couch.z / 100);
        }

        if (meshes.detectorGroup && meshes.xrayBeam) {
            var maxRows = (global.CTProfileService && typeof global.CTProfileService.getDetectorRowsMax === "function")
                ? global.CTProfileService.getDetectorRowsMax()
                : 320;
            var ratio = state.gantry.detectorRows / maxRows;
            meshes.detectorGroup.scale.z = ratio;
            var baseBeamZScale = (global.CTProfileService && typeof global.CTProfileService.getBeamZScaleAtMax === "function")
                ? global.CTProfileService.getBeamZScaleAtMax()
                : 0.16;
            meshes.xrayBeam.scale.z = baseBeamZScale * ratio;
        }

        function updateSyringe(fluidMesh, plungerMesh, percent) {
            var r = Math.max(0.01, 1.0 - percent / 100);
            if (fluidMesh) fluidMesh.scale.y = r;
            if (plungerMesh) plungerMesh.position.y = 0.15 - 0.3 * (percent / 100);
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

        if (gantry.isScanning) {
            updateText("status-badge", "SCANNING");
            updateClass("status-badge", "px-2 py-0.5 rounded text-[10px] font-bold bg-green-900/60 text-green-400 border border-green-500/50 animate-pulse");
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
        if (!container) return;
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

        Array.from(container.children || []).forEach(function(card, idx) {
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
        // Managed by initModernNavigation()
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

        if (codecSelect) codecSelect.value = get("camera.videoStream.codec", "h264");
        if (protoSelect) protoSelect.value = get("camera.videoStream.protocol", "rtsp");
        if (fpsSelect) fpsSelect.value = String(get("camera.videoStream.fps", 30));
        if (qualSelect) qualSelect.value = String(get("camera.videoStream.quality", 0.8));
        if (widthInput) widthInput.value = String(get("camera.resolution.width", 1280));
        if (heightInput) heightInput.value = String(get("camera.resolution.height", 720));
        if (hfovInput) hfovInput.value = String(get("camera.fov.horizontal", 70));

        var distEnabled = get("camera.distortion.enabled", false);
        var distToggle = byId("input-distortion-enable");
        if (distToggle) distToggle.checked = distEnabled;

        var k1 = get("camera.distortion.k1", 0.20);
        var k2 = get("camera.distortion.k2", 0.05);
        var k3 = get("camera.distortion.k3", 0.00);
        var k4 = get("camera.distortion.k4", 0.00);
        var fx = get("camera.distortion.fx", 1.00);
        var fy = get("camera.distortion.fy", 1.00);
        var cx = get("camera.distortion.cx", 0.50);
        var cy = get("camera.distortion.cy", 0.50);
        var zoom = get("camera.distortion.zoom", 1.00);

        updateValue("slider-distortion-k1", k1);
        updateValue("slider-distortion-k2", k2);
        updateValue("slider-distortion-k3", k3);
        updateValue("slider-distortion-k4", k4);
        updateValue("slider-distortion-fx", fx);
        updateValue("slider-distortion-fy", fy);
        updateValue("slider-distortion-cx", cx);
        updateValue("slider-distortion-cy", cy);
        updateValue("slider-distortion-zoom", zoom);

        updateText("val-distortion-k1", Number(k1).toFixed(2));
        updateText("val-distortion-k2", Number(k2).toFixed(2));
        updateText("val-distortion-k3", Number(k3).toFixed(2));
        updateText("val-distortion-k4", Number(k4).toFixed(2));
        updateText("val-distortion-fx", Number(fx).toFixed(2));
        updateText("val-distortion-fy", Number(fy).toFixed(2));
        updateText("val-distortion-cx", Number(cx).toFixed(2));
        updateText("val-distortion-cy", Number(cy).toFixed(2));
        updateText("val-distortion-zoom", Number(zoom).toFixed(2));

        if (global.AppState && global.AppState.distortion) {
            global.AppState.distortion.enabled = distEnabled;
            global.AppState.distortion.k1 = k1;
            global.AppState.distortion.k2 = k2;
            global.AppState.distortion.k3 = k3;
            global.AppState.distortion.k4 = k4;
            global.AppState.distortion.fx = fx;
            global.AppState.distortion.fy = fy;
            global.AppState.distortion.cx = cx;
            global.AppState.distortion.cy = cy;
            global.AppState.distortion.zoom = zoom;
        }

        var qualModeSelect = byId("select-graphics-quality");
        if (qualModeSelect) qualModeSelect.value = get("graphics.quality", "high");
    }

    function setupUI() {
        if (isSetup) return;

        UI.sliderCouchY = byId("slider-couch-y");
        UI.sliderCouchZ = byId("slider-couch-z");
        UI.sliderRotorSpeed = byId("slider-rotor-speed");
        UI.sliderInjectA = byId("slider-inject-a");
        UI.sliderInjectB = byId("slider-inject-b");
        UI.selectDetectorRows = byId("select-detector-rows");
        UI.commandLogList = byId("command-log-list");
        UI.btnClearCommandLog = byId("btn-clear-command-log");

        applyProfileUIConfig();
        applyConfigToUIInputs();
        initModernNavigation();

        function addListener(target, eventName, handler) {
            if (!target) return;
            target.addEventListener(eventName, handler);
            unsubscribers.push(function () {
                target.removeEventListener(eventName, handler);
            });
        }

        addListener(UI.sliderCouchY, "input", function (e) {
            executeConsoleCommand("couch", "moveY", parseFloat(e.target.value));
        });
        addListener(UI.sliderCouchZ, "input", function (e) {
            executeConsoleCommand("couch", "moveZ", parseFloat(e.target.value));
        });
        addListener(UI.sliderRotorSpeed, "input", function (e) {
            executeConsoleCommand("gantry", "setRotorSpeed", parseFloat(e.target.value));
        });
        addListener(UI.sliderInjectA, "input", function (e) {
            executeConsoleCommand("injector", "setA", parseFloat(e.target.value));
        });
        addListener(UI.sliderInjectB, "input", function (e) {
            executeConsoleCommand("injector", "setB", parseFloat(e.target.value));
        });
        addListener(UI.selectDetectorRows, "change", function (e) {
            executeConsoleCommand("gantry", "setField", {
                key: "detectorRows",
                value: parseInt(e.target.value, 10),
            });
        });

        if (UI.btnClearCommandLog) {
            addListener(UI.btnClearCommandLog, "click", function () {
                if (global.CTCommandLogService) global.CTCommandLogService.clear();
                renderCommandLog();
            });
        }

        var streamCodec = byId("select-stream-codec");
        var streamProto = byId("select-stream-proto");
        var streamFps = byId("select-stream-fps");
        var streamQual = byId("select-stream-quality");
        var streamW = byId("input-stream-width");
        var streamH = byId("input-stream-height");
        var streamHfov = byId("input-stream-hfov");

        function updateStreamConfig() {
            if (global.CameraSim) {
                global.CameraSim.updateStreamConfig({
                    codec: streamCodec ? streamCodec.value : "h264",
                    protocol: streamProto ? streamProto.value : "rtsp",
                    fps: streamFps ? parseInt(streamFps.value, 10) : 30,
                    quality: streamQual ? parseFloat(streamQual.value) : 0.8,
                    resolution: {
                        width: streamW ? parseInt(streamW.value, 10) : 1280,
                        height: streamH ? parseInt(streamH.value, 10) : 720,
                    },
                    hfov: streamHfov ? parseFloat(streamHfov.value) : 70,
                });
            }
        }

        addListener(streamCodec, "change", updateStreamConfig);
        addListener(streamProto, "change", updateStreamConfig);
        addListener(streamFps, "change", updateStreamConfig);
        addListener(streamQual, "change", updateStreamConfig);
        addListener(streamW, "change", updateStreamConfig);
        addListener(streamH, "change", updateStreamConfig);
        addListener(streamHfov, "change", updateStreamConfig);

        var distEnableToggle = byId("input-distortion-enable");
        if (distEnableToggle) {
            addListener(distEnableToggle, "change", function (e) {
                toggleFisheye(e.target.checked);
            });
        }

        var distPresetSelect = byId("select-distortion-preset");
        if (distPresetSelect) {
            addListener(distPresetSelect, "change", function (e) {
                if (e.target.value !== "custom") {
                    global.onDistortionPresetChange(e.target.value);
                }
            });
        }

        var distSliders = ["k1", "k2", "k3", "k4", "fx", "fy", "cx", "cy", "zoom"];
        distSliders.forEach(function (key) {
            var slider = byId("slider-distortion-" + key);
            if (slider) {
                addListener(slider, "input", global.onDistortionParamInput);
            }
        });

        var unsubscribeState = AppState.subscribe(function (state) {
            syncInteractiveState(state);
            updateStateMonitor();
            renderBatchUI();
        });
        unsubscribers.push(unsubscribeState);

        if (global.CTCommandLogService && typeof global.CTCommandLogService.subscribe === "function") {
            var unsubscribeLog = global.CTCommandLogService.subscribe(function () {
                renderCommandLog();
                updateLastCommandMonitor();
            });
            unsubscribers.push(unsubscribeLog);
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

    // --- Scan & X-Ray & Opacity Controls (formerly scan-controller.js) ---
    function toggleScan() {
        var isScan = !AppState.gantry.isScanning;
        CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setScanning", params: { value: isScan } });

        if (typeof TWEEN !== "undefined") {
            new TWEEN.Tween(AppState.gantry)
                .to({ rotorSpeed: isScan ? 100 : 0 }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(function () { AppState.notify(); })
                .start();
        }
    }

    function setScanMode(mode) {
        CTCommandBus.execute({
            source: "ui-console",
            target: "gantry",
            action: "setField",
            params: { key: "scanMode", value: mode },
        });
    }

    function toggleXRay() {
        var isVisible = !AppState.gantry.xrayVisible;
        CTCommandBus.execute({
            source: "ui-console",
            target: "gantry",
            action: "setXrayVisible",
            params: { value: isVisible },
        });

        if (isVisible) setGantryOpacity(true);
    }

    function setGantryOpacity(isTranslucent) {
        if (Meshes.materials) {
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

            if (window.AppState) {
                AppState.update("gantry", "isTranslucent", isTranslucent);
            }
        }
    }

    // --- Patient Model & 9-DOF Transform Controls (formerly patient-controller.js) ---
    function togglePatient() {
        CTCommandBus.execute({
            source: "ui-console",
            target: "simulator",
            action: "setPatientVisible",
            params: { value: !AppState.patientVisible },
        });
    }

    async function changePatientGlbModel(modelId) {
        AppState.patientModelId = modelId;
        if (window.CTModelRegistry && window.Meshes && window.Meshes.patientGroup) {
            while (Meshes.patientGroup.children.length > 0) {
                Meshes.patientGroup.remove(Meshes.patientGroup.children[0]);
            }
            var instance = await CTModelRegistry.spawnModelInstance(modelId, {
                instanceId: "patient_primary",
                attachTo: "couch",
                visible: AppState.patientVisible
            });
            var obj = instance.sceneObject;
            Meshes.patientGroup.add(obj);
            Meshes.patientGroup.visible = AppState.patientVisible;

            if (instance && instance.transform && window.AppState) {
                var pos = instance.transform.position || [0, -0.1, 0.45];
                var rot = instance.transform.rotation || [-90, 0, 0];
                window.AppState.patientOffset = {
                    x: pos[0], y: pos[1], z: pos[2],
                    rotX: rot[0], rotY: rot[1], rotZ: rot[2]
                };
                syncAllPatientTransformUI();
            }
        }
    }

    function updatePatientGlbSelectOptions() {
        if (typeof document === "undefined") return;
        var selectEl = byId("select-patient-glb");
        if (!selectEl) return;

        var models = (window.CTModelsConfig && typeof window.CTModelsConfig.getAllModels === "function")
            ? window.CTModelsConfig.getAllModels()
            : [];

        selectEl.innerHTML = "";
        models.forEach(function (m) {
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.name || (m.id + " (" + (m.path || "").split("/").pop() + ")");
            if (window.AppState && window.AppState.patientModelId === m.id) {
                opt.selected = true;
            }
            selectEl.appendChild(opt);
        });
    }

    async function spawnCustomGlbFromInput() {
        var inputEl = byId("input-add-glb-path");
        if (!inputEl || !inputEl.value.trim()) return;
        var path = inputEl.value.trim();
        var modelId = path.split("/").pop().replace(".glb", "") || "custom_glb";

        if (window.CTModelsConfig) {
            window.CTModelsConfig.registerModel({
                id: modelId,
                name: "Custom GLB: " + modelId,
                path: path,
                category: "patient",
                attachTo: "couch"
            });
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
                position: [po.x, po.y, po.z],
                rotation: [po.rotX, po.rotY, po.rotZ],
                scale: [po.scaleX, po.scaleY, po.scaleZ]
            });
        }
    }

    function onPatientPosSliderChange(key) {
        var el = byId("slider-patient-pos-" + key);
        if (el) _updatePatientTransform(key, el.value);
    }

    function onPatientPosInputChange(key) {
        var el = byId("input-patient-pos-" + key);
        if (el) _updatePatientTransform(key, el.value);
    }

    function syncAllPatientTransformUI() {
        if (!window.AppState || !window.AppState.patientOffset) return;
        var po = window.AppState.patientOffset;
        var keys = ["x", "y", "z", "rotX", "rotY", "rotZ", "scaleX", "scaleY", "scaleZ"];
        keys.forEach(function (k) {
            var input = byId("input-patient-pos-" + k);
            var slider = byId("slider-patient-pos-" + k);
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
                position: [po.x, po.y, po.z],
                rotation: [po.rotX, po.rotY, po.rotZ],
                scale: [po.scaleX, po.scaleY, po.scaleZ]
            });
        }
    }

    // --- Info Dialog Controls (formerly dialog-controller.js) ---
    function showInfoDialog(key) {
        if (!key || key === "none") return;
        var dialog = byId("info-dialog");
        var titleElem = byId("info-dialog-title");
        var descElem = byId("info-dialog-desc");
        if (!dialog || !titleElem || !descElem) return;

        var text = (global.Descriptions && global.Descriptions[key]) || "Description not found.";
        var lines = text.split("\n\n");
        titleElem.innerText = lines[0];
        descElem.innerText = lines[1] || "";

        dialog.classList.remove("hidden");
        dialog.classList.remove("opacity-0");
    }

    function hideInfoDialog() {
        var dialog = byId("info-dialog");
        if (dialog) dialog.classList.add("hidden");
        var focusSelect = byId("select-focus");
        if (focusSelect) focusSelect.value = "";
    }

    function handleFocusChange(value) {
        if (!value) return;
        if (value === "XrayTube" || value === "Detector") {
            setGantryOpacity(true);
        } else if (value === "Gantry" || value === "TouchPanel") {
            setGantryOpacity(false);
        }
        if (typeof global.setCameraView === "function") {
            global.setCameraView("focus_" + value);
        }
        showInfoDialog(value);
    }

    function teardownUI() {
        while (unsubscribers.length > 0) {
            var off = unsubscribers.pop();
            if (typeof off === "function") off();
        }
        isSetup = false;
    }

    var DISTORTION_PRESETS = {
        standard: { k1: 0.20, k2: 0.05, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.00 },
        action_cam: { k1: 0.12, k2: -0.02, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.05 },
        ultra_wide: { k1: 0.45, k2: 0.18, k3: 0.05, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 0.90 },
        pincushion: { k1: -0.15, k2: 0.00, k3: 0.00, k4: 0.00, fx: 1.00, fy: 1.00, cx: 0.50, cy: 0.50, zoom: 1.00 }
    };

    function onDistortionParamInput() {
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
    }

    function onDistortionPresetChange(presetKey) {
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
    }

    function resetDistortionParamsUI() {
        var presetSelect = byId("select-distortion-preset");
        if (presetSelect) presetSelect.value = "standard";
        onDistortionPresetChange("standard");
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
    global.toggleScan = toggleScan;
    global.setScanMode = setScanMode;
    global.toggleXRay = toggleXRay;
    global.setGantryOpacity = setGantryOpacity;
    global.togglePatient = togglePatient;
    global.changePatientGlbModel = changePatientGlbModel;
    global.updatePatientGlbSelectOptions = updatePatientGlbSelectOptions;
    global.spawnCustomGlbFromInput = spawnCustomGlbFromInput;
    global.onPatientPosSliderChange = onPatientPosSliderChange;
    global.onPatientPosInputChange = onPatientPosInputChange;
    global.syncAllPatientTransformUI = syncAllPatientTransformUI;
    global.resetPatientPositionUI = resetPatientPositionUI;
    global.showInfoDialog = showInfoDialog;
    global.hideInfoDialog = hideInfoDialog;
    global.handleFocusChange = handleFocusChange;
    global.onDistortionParamInput = onDistortionParamInput;
    global.onDistortionPresetChange = onDistortionPresetChange;
    global.resetDistortionParamsUI = resetDistortionParamsUI;
})(typeof window !== "undefined" ? window : this);
