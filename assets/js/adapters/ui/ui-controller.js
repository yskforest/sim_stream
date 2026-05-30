(function attachUIController(global) {
    var isSetup = false;
    var unsubscribers = [];
    var mobileMedia = null;

    function byId(id) {
        return document.getElementById(id);
    }

    function bindRangeProfile(input, cap) {
        if (!input || !cap) return;
        if (typeof cap.min === 'number') input.min = String(cap.min);
        if (typeof cap.max === 'number') input.max = String(cap.max);
        if (typeof cap.defaultValue === 'number') input.value = String(cap.defaultValue);
    }

    function applyProfileUIConfig() {
        if (!global.CTProfileService) return;

        bindRangeProfile(UI.sliderCouchY, CTProfileService.getAxisCapability('couch', 'y'));
        bindRangeProfile(UI.sliderCouchZ, CTProfileService.getAxisCapability('couch', 'z'));
        bindRangeProfile(UI.sliderInjectA, CTProfileService.getAxisCapability('injector', 'a'));
        bindRangeProfile(UI.sliderInjectB, CTProfileService.getAxisCapability('injector', 'b'));

        var rows = CTProfileService.getDetectorRowsOptions();
        if (!UI.selectDetectorRows) return;

        UI.selectDetectorRows.innerHTML = '';
        rows.forEach(function (v) {
            var option = document.createElement('option');
            option.value = String(v);
            option.textContent = v === 320 ? '320 Rows (Aquilion ONE class)' : (v + ' Rows');
            if (AppState.gantry.detectorRows === v) option.selected = true;
            UI.selectDetectorRows.appendChild(option);
        });
    }

    function executeCommand(source, target, action, valueOrParams) {
        var params = (typeof valueOrParams === 'object' && valueOrParams !== null)
            ? valueOrParams
            : { value: valueOrParams };

        return CTCommandBus.execute({
            source: source,
            target: target,
            action: action,
            params: params
        });
    }

    function executeConsoleCommand(target, action, valueOrParams) {
        return executeCommand('ui-console', target, action, valueOrParams);
    }

    function syncInteractiveState(state) {
        byId('couch-y-val').innerText = state.couch.y.toFixed(0) + '%';
        byId('couch-z-val').innerText = state.couch.z.toFixed(0) + '%';
        byId('rotor-speed-val').innerText = state.gantry.rotorSpeed.toFixed(0) + ' rpm';
        byId('inject-a-val').innerText = state.injector.a.toFixed(0) + '%';
        byId('inject-b-val').innerText = state.injector.b.toFixed(0) + '%';

        UI.sliderCouchY.value = state.couch.y;
        UI.sliderCouchZ.value = state.couch.z;
        UI.sliderRotorSpeed.value = state.gantry.rotorSpeed;
        UI.sliderInjectA.value = state.injector.a;
        UI.sliderInjectB.value = state.injector.b;
        UI.selectDetectorRows.value = state.gantry.detectorRows;

        var isRunning = state.gantry.isScanning || state.gantry.activeBatchIndex >= 0;
        UI.selectDetectorRows.disabled = isRunning;

        if (state.gantry.isScanning) {
            UI.btnScanToggle.innerText = 'Stop Scan';
            UI.btnScanToggle.classList.replace('bg-green-600', 'bg-red-600');
            UI.btnScanToggle.classList.replace('hover:bg-green-500', 'hover:bg-red-500');
        } else {
            UI.btnScanToggle.innerText = 'Start Scan';
            UI.btnScanToggle.classList.replace('bg-red-600', 'bg-green-600');
            UI.btnScanToggle.classList.replace('hover:bg-red-500', 'hover:bg-green-500');
        }

        if (state.gantry.xrayVisible) {
            UI.btnXrayToggle.innerText = 'Hide X-Ray Beam';
            UI.btnXrayToggle.className = 'w-full bg-yellow-500 hover:bg-yellow-400 text-xs py-1.5 rounded transition font-bold text-black';
        } else {
            UI.btnXrayToggle.innerText = 'Show X-Ray Beam';
            UI.btnXrayToggle.className = 'w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition';
        }

        if (Meshes.xrayBeam) {
            Meshes.xrayBeam.material.opacity = state.gantry.xrayVisible ? 0.35 : 0.0;
        }

        if (Meshes.patientGroup) {
            Meshes.patientGroup.visible = state.patientVisible;
        }

        if (state.patientVisible) {
            UI.btnPatientToggle.innerText = 'Hide Patient';
            UI.btnPatientToggle.className = 'w-full bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold';
        } else {
            UI.btnPatientToggle.innerText = 'Show Patient';
            UI.btnPatientToggle.className = 'w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition text-gray-400';
        }

        applyStateToMeshes(state);
    }

    function updateLastCommandMonitor() {
        if (!global.CTCommandLogService) return;
        var logs = global.CTCommandLogService.list();
        var last = logs.length > 0 ? logs[logs.length - 1] : null;
        var src = byId('monitor-last-source');
        var res = byId('monitor-last-result');
        var err = byId('monitor-last-error');
        if (!src || !res || !err) return;

        if (!last) {
            src.innerText = '-';
            res.innerText = '-';
            err.innerText = '-';
            return;
        }

        src.innerText = last.source || '-';
        var ok = last.result && last.result.success === true;
        res.innerText = ok ? 'success' : 'fail';
        err.innerText = ok ? '-' : (last.result && last.result.error ? last.result.error : 'UNKNOWN_ERROR');
    }

    function updateStateMonitor() {
        var rpm = Math.round(AppState.gantry.rotorSpeed);
        byId('monitor-rpm').innerText = rpm + ' rpm';
        byId('monitor-rpm-bar').style.width = (rpm / 100 * 100) + '%';
        byId('monitor-mode').innerText = AppState.gantry.currentScanMode.replace(/_/g, ' ').toUpperCase();
        byId('monitor-rows').innerText = AppState.gantry.detectorRows;

        var badge = byId('status-badge');
        if (AppState.gantry.isScanning) {
            badge.innerText = 'SCANNING';
            badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse';
        } else if (rpm > 0) {
            badge.innerText = 'SPINNING';
            badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
        } else {
            badge.innerText = 'STANDBY';
            badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600 transition-colors duration-300';
        }

        byId('monitor-couch-y').innerText = Math.round(AppState.couch.y) + '%';
        byId('monitor-couch-z').innerText = Math.round(AppState.couch.z) + '%';

        var injA = Math.round(AppState.injector.a);
        var injB = Math.round(AppState.injector.b);
        var remainA = 100 - injA;
        var remainB = 100 - injB;

        byId('monitor-inj-a').innerText = remainA + '%';
        byId('monitor-inj-b').innerText = remainB + '%';
        byId('monitor-inj-a-bar').style.width = remainA + '%';
        byId('monitor-inj-b-bar').style.width = remainB + '%';

        updateLastCommandMonitor();
    }

    function renderCommandLog() {
        if (!global.CTCommandLogService || !UI.commandLogList) return;
        var entries = global.CTCommandLogService.list();
        var latest = entries.slice(-40);

        UI.commandLogList.innerHTML = '';
        latest.forEach(function (entry) {
            var row = document.createElement('div');
            var ok = entry.result && entry.result.success === true;
            var action = entry.command ? (entry.command.target + '.' + entry.command.action) : 'n/a';
            var stamp = entry.timestamp ? entry.timestamp.split('T')[1].replace('Z', '') : '--:--:--';
            var err = ok ? '' : (' ' + (entry.result && entry.result.error ? entry.result.error : 'ERROR'));
            row.className = ok ? 'text-green-300' : 'text-red-300';
            row.innerText = '[' + stamp + '] ' + (entry.source || '-') + ' ' + action + ' -> ' + (ok ? 'OK' : 'FAIL') + err;
            UI.commandLogList.appendChild(row);
        });

        UI.commandLogList.scrollTop = UI.commandLogList.scrollHeight;
    }

    function renderBatchUI() {
        var container = byId('batch-container');
        var seq = AppState.gantry.scanSequence;
        var activeIdx = AppState.gantry.activeBatchIndex;
        var syncIdx = AppState.gantry.injectorSyncIndex;
        var countdown = AppState.gantry.countdown;

        container.innerHTML = '';

        seq.forEach(function (batch, index) {
            var isActive = index === activeIdx;
            var isRunning = AppState.gantry.isScanning || activeIdx >= 0;
            var mode = batch.mode;
            var delay = batch.delay;
            var isSyncTarget = index === syncIdx;

            var card = document.createElement('div');
            var cardClasses = 'relative rounded-lg p-2.5 w-36 flex flex-col items-center transition-all duration-300 ';
            cardClasses += isActive
                ? 'bg-blue-900/80 border-2 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-105 z-10'
                : 'bg-gray-800 border border-gray-600';
            card.className = cardClasses;

            if (isActive && countdown > 0) {
                var overlay = document.createElement('div');
                overlay.className = 'absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center z-20 backdrop-blur-[2px]';
                overlay.innerHTML = '<span class="text-[10px] text-yellow-400 font-bold mb-1 tracking-widest">DELAY</span><span class="text-2xl font-mono text-white font-bold leading-none">' + countdown + '</span>';
                card.appendChild(overlay);
            }

            var header = document.createElement('div');
            header.className = 'text-[10px] text-gray-400 mb-1.5 w-full flex justify-between items-center';

            var label = document.createElement('span');
            label.innerText = 'Batch ' + (index + 1);
            if (isActive) label.className = 'text-yellow-400 font-bold';

            var delBtn = document.createElement('button');
            delBtn.innerHTML = '&times;';
            delBtn.className = 'hover:text-red-400 text-base leading-none transition-colors';
            delBtn.disabled = isRunning || seq.length <= 1;
            if (delBtn.disabled) delBtn.className += ' opacity-30 cursor-not-allowed';
            delBtn.onclick = function () { removeScanBatch(index); };

            header.appendChild(label);
            header.appendChild(delBtn);

            var select = document.createElement('select');
            select.className = 'w-full bg-gray-900 text-white text-[11px] p-1.5 rounded border border-gray-700 outline-none hover:border-blue-500 transition-colors cursor-pointer';
            select.disabled = isRunning;
            if (select.disabled) select.className += ' opacity-70 cursor-not-allowed';
            select.onchange = function (e) { updateBatchData(index, 'mode', e.target.value); };

            [
                { val: 'scano', text: 'Scano' },
                { val: 'dual_scano', text: 'Dual Scano' },
                { val: '3d_landmark', text: '3D Landmark' },
                { val: 'helical', text: 'Helical' },
                { val: 'axial', text: 'Axial' },
                { val: 'volume', text: 'Volume' },
                { val: 'dynamic', text: 'Dynamic' },
                { val: 'real_prep', text: 'Real Prep' }
            ].forEach(function (opt) {
                var option = document.createElement('option');
                option.value = opt.val;
                option.innerText = opt.text;
                if (opt.val === mode) option.selected = true;
                select.appendChild(option);
            });

            var delayWrapper = document.createElement('div');
            delayWrapper.className = 'w-full flex items-center justify-between mt-2 text-[10px] text-gray-400';
            delayWrapper.innerHTML = '<span>Delay (s)</span>';

            var delayInput = document.createElement('input');
            delayInput.type = 'number';
            delayInput.min = '0';
            delayInput.max = '60';
            delayInput.value = delay;
            delayInput.className = 'w-10 bg-gray-900 text-white p-1 rounded border border-gray-700 outline-none text-center';
            delayInput.disabled = isRunning;
            delayInput.onchange = function (e) { updateBatchData(index, 'delay', parseInt(e.target.value, 10) || 0); };
            delayWrapper.appendChild(delayInput);

            var syncBtn = document.createElement('button');
            syncBtn.innerText = isSyncTarget ? 'INJ SYNC: ON' : 'INJ SYNC: OFF';
            syncBtn.className = isSyncTarget
                ? 'w-full mt-2 py-1 rounded text-[9px] font-bold transition-colors bg-purple-600/80 text-white border border-purple-400'
                : 'w-full mt-2 py-1 rounded text-[9px] font-bold transition-colors bg-gray-900 text-gray-500 border border-gray-700 hover:bg-gray-700';
            syncBtn.disabled = isRunning;
            if (syncBtn.disabled) {
                syncBtn.classList.add('opacity-50', 'cursor-not-allowed');
                syncBtn.classList.remove('hover:bg-gray-700');
            }
            syncBtn.onclick = function () { setInjectorSync(index); };

            card.appendChild(header);
            card.appendChild(select);
            card.appendChild(delayWrapper);
            card.appendChild(syncBtn);
            container.appendChild(card);
        });

        var isRunning = AppState.gantry.isScanning || activeIdx >= 0;

        var addBtn = byId('btn-add-batch');
        addBtn.disabled = seq.length >= 5 || isRunning;
        addBtn.classList.toggle('opacity-30', addBtn.disabled);
        addBtn.classList.toggle('cursor-not-allowed', addBtn.disabled);

        var runBtn = byId('btn-run-sequence');
        if (isRunning) {
            runBtn.disabled = false;
            runBtn.onclick = stopAutoSequence;
            runBtn.className = 'flex-[2] bg-red-600 hover:bg-red-500 border border-red-500 rounded py-1.5 text-xs font-bold';
            runBtn.innerText = AppState.gantry.cancelRequested ? 'STOPPING...' : 'STOP SEQUENCE';
            if (AppState.gantry.cancelRequested) {
                runBtn.disabled = true;
                runBtn.classList.add('opacity-60', 'cursor-not-allowed');
            }
        } else {
            runBtn.disabled = false;
            runBtn.onclick = runAutoSequence;
            runBtn.className = 'flex-[2] bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded py-1.5 text-xs font-bold';
            runBtn.innerText = 'RUN SEQUENCE';
        }
    }

    function setPanelVisibilityForViewport() {
        var mobile = mobileMedia && mobileMedia.matches;
        var panels = document.querySelectorAll('.ui-panel');
        if (!mobile) {
            panels.forEach(function (p) {
                if (!p.classList.contains('is-hidden')) p.style.display = 'block';
            });
            return;
        }
        panels.forEach(function (p) {
            if (p.classList.contains('is-hidden')) {
                p.style.display = 'none';
                return;
            }
            p.style.display = 'block';
        });
    }

    function bindPanelControls() {
        mobileMedia = window.matchMedia('(max-width: 1279px)');

        document.querySelectorAll('.toolbar-btn[data-panel-target]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-panel-target');
                var target = byId(id);
                if (!target) return;
                target.classList.toggle('is-hidden');
                setPanelVisibilityForViewport();
            });
        });

        document.querySelectorAll('.ui-panel').forEach(function (panel) {
            var collapseBtn = panel.querySelector('[data-panel-action="collapse"]');
            var hideBtn = panel.querySelector('[data-panel-action="hide"]');

            if (collapseBtn) {
                collapseBtn.addEventListener('click', function () {
                    panel.classList.toggle('is-collapsed');
                });
            }
            if (hideBtn) {
                hideBtn.addEventListener('click', function () {
                    panel.classList.add('is-hidden');
                    setPanelVisibilityForViewport();
                });
            }
        });

        if (mobileMedia && typeof mobileMedia.addEventListener === 'function') {
            mobileMedia.addEventListener('change', setPanelVisibilityForViewport);
        }
        setPanelVisibilityForViewport();
    }

    function setupUI() {
        if (isSetup) return;

        UI.sliderCouchY = byId('slider-couch-y');
        UI.sliderCouchZ = byId('slider-couch-z');
        UI.sliderRotorSpeed = byId('slider-rotor-speed');
        UI.sliderInjectA = byId('slider-inject-a');
        UI.sliderInjectB = byId('slider-inject-b');
        UI.btnScanToggle = byId('btn-scan-toggle');
        UI.btnXrayToggle = byId('btn-xray-toggle');
        UI.selectDetectorRows = byId('select-detector-rows');
        UI.btnPatientToggle = byId('btn-patient-toggle');
        UI.commandLogList = byId('command-log-list');
        UI.btnClearCommandLog = byId('btn-clear-command-log');

        applyProfileUIConfig();
        bindPanelControls();

        UI.sliderCouchY.addEventListener('input', function (e) { executeConsoleCommand('couch', 'moveY', parseFloat(e.target.value)); });
        UI.sliderCouchZ.addEventListener('input', function (e) { executeConsoleCommand('couch', 'moveZ', parseFloat(e.target.value)); });
        UI.sliderInjectA.addEventListener('input', function (e) { executeConsoleCommand('injector', 'setA', parseFloat(e.target.value)); });
        UI.sliderInjectB.addEventListener('input', function (e) { executeConsoleCommand('injector', 'setB', parseFloat(e.target.value)); });
        UI.selectDetectorRows.addEventListener('change', function (e) { executeConsoleCommand('gantry', 'setDetectorRows', parseInt(e.target.value, 10)); });

        if (UI.btnClearCommandLog && global.CTCommandLogService) {
            UI.btnClearCommandLog.addEventListener('click', function () {
                global.CTCommandLogService.clear();
                renderCommandLog();
                updateLastCommandMonitor();
            });
        }

        renderBatchUI();
        renderCommandLog();
        unsubscribers.push(AppState.subscribe(syncInteractiveState));

        if (global.CTCommandLogService && typeof global.CTCommandLogService.subscribe === 'function') {
            unsubscribers.push(global.CTCommandLogService.subscribe(function () {
                renderCommandLog();
                updateLastCommandMonitor();
            }));
        }

        isSetup = true;
    }

    function teardownUI() {
        while (unsubscribers.length > 0) {
            var off = unsubscribers.pop();
            if (typeof off === 'function') off();
        }
        isSetup = false;
    }

    global.CTUIController = {
        setup: setupUI,
        teardown: teardownUI,
        renderBatchQueue: renderBatchUI,
        renderMonitor: updateStateMonitor,
        renderCommandLog: renderCommandLog
    };

    global.updateStateMonitor = updateStateMonitor;
    global.renderBatchUI = renderBatchUI;
})(window);
