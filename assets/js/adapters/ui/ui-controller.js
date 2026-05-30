(function attachUIController(global) {
function setupUI() {
            UI.sliderCouchY = document.getElementById('slider-couch-y');
            UI.sliderCouchZ = document.getElementById('slider-couch-z');
            UI.sliderRotorSpeed = document.getElementById('slider-rotor-speed');
            UI.sliderInjectA = document.getElementById('slider-inject-a');
            UI.sliderInjectB = document.getElementById('slider-inject-b');
            UI.btnScanToggle = document.getElementById('btn-scan-toggle');
            UI.btnXrayToggle = document.getElementById('btn-xray-toggle');
            UI.selectDetectorRows = document.getElementById('select-detector-rows');
            UI.btnPatientToggle = document.getElementById('btn-patient-toggle');

            UI.sliderCouchY.addEventListener('input', e => CTCommandBus.execute({ target: 'couch', action: 'moveY', params: { value: parseFloat(e.target.value) } }));
            UI.sliderCouchZ.addEventListener('input', e => CTCommandBus.execute({ target: 'couch', action: 'moveZ', params: { value: parseFloat(e.target.value) } }));
            UI.sliderInjectA.addEventListener('input', e => CTCommandBus.execute({ target: 'injector', action: 'setA', params: { value: parseFloat(e.target.value) } }));
            UI.sliderInjectB.addEventListener('input', e => CTCommandBus.execute({ target: 'injector', action: 'setB', params: { value: parseFloat(e.target.value) } }));
            UI.selectDetectorRows.addEventListener('change', e => CTCommandBus.execute({ target: 'gantry', action: 'setDetectorRows', params: { value: parseInt(e.target.value) } }));

            // 蛻晏屓謠冗判
            renderBatchUI();

            AppState.subscribe(state => {
                document.getElementById('couch-y-val').innerText = state.couch.y.toFixed(0) + '%';
                document.getElementById('couch-z-val').innerText = state.couch.z.toFixed(0) + '%';
                document.getElementById('rotor-speed-val').innerText = state.gantry.rotorSpeed.toFixed(0) + ' rpm';
                document.getElementById('inject-a-val').innerText = state.injector.a.toFixed(0) + '%';
                document.getElementById('inject-b-val').innerText = state.injector.b.toFixed(0) + '%';

                UI.sliderCouchY.value = state.couch.y;
                UI.sliderCouchZ.value = state.couch.z;
                UI.sliderRotorSpeed.value = state.gantry.rotorSpeed;
                UI.sliderInjectA.value = state.injector.a;
                UI.sliderInjectB.value = state.injector.b;
                UI.selectDetectorRows.value = state.gantry.detectorRows;

                if (state.gantry.isScanning) {
                    UI.btnScanToggle.innerText = "Stop Scan";
                    UI.btnScanToggle.classList.replace('bg-green-600', 'bg-red-600');
                    UI.btnScanToggle.classList.replace('hover:bg-green-500', 'hover:bg-red-500');
                } else {
                    UI.btnScanToggle.innerText = "Start Scan";
                    UI.btnScanToggle.classList.replace('bg-red-600', 'bg-green-600');
                    UI.btnScanToggle.classList.replace('hover:bg-red-500', 'hover:bg-green-500');
                }

                if (state.gantry.xrayVisible) {
                    UI.btnXrayToggle.innerText = "Hide X-Ray Beam";
                    UI.btnXrayToggle.className = "w-full bg-yellow-500 hover:bg-yellow-400 text-xs py-1.5 rounded transition font-bold text-black";
                } else {
                    UI.btnXrayToggle.innerText = "Show X-Ray Beam";
                    UI.btnXrayToggle.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
                }

                if (Meshes.xrayBeam) {
                    Meshes.xrayBeam.material.opacity = state.gantry.xrayVisible ? 0.35 : 0.0;
                }

                if (Meshes.patientGroup) {
                    Meshes.patientGroup.visible = state.patientVisible;
                }
                if (state.patientVisible) {
                    UI.btnPatientToggle.innerText = "Hide Patient";
                    UI.btnPatientToggle.className = "w-full bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                } else {
                    UI.btnPatientToggle.innerText = "Show Patient";
                    UI.btnPatientToggle.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition text-gray-400";
                }

                applyStateToMeshes(state);
            });
        }

function updateStateMonitor() {
            // Gantry
            const rpm = Math.round(AppState.gantry.rotorSpeed);
            document.getElementById('monitor-rpm').innerText = rpm + ' rpm';
            document.getElementById('monitor-rpm-bar').style.width = (rpm / 100 * 100) + '%';
            document.getElementById('monitor-mode').innerText = AppState.gantry.currentScanMode.replace(/_/g, ' ').toUpperCase();
            document.getElementById('monitor-rows').innerText = AppState.gantry.detectorRows;

            // Badge Status
            const badge = document.getElementById('status-badge');
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

            // Couch
            document.getElementById('monitor-couch-y').innerText = Math.round(AppState.couch.y) + '%';
            document.getElementById('monitor-couch-z').innerText = Math.round(AppState.couch.z) + '%';

            // Injector
            const injA = Math.round(AppState.injector.a);
            const injB = Math.round(AppState.injector.b);
            const remainA = 100 - injA;
            const remainB = 100 - injB;

            document.getElementById('monitor-inj-a').innerText = remainA + '%';
            document.getElementById('monitor-inj-b').innerText = remainB + '%';
            document.getElementById('monitor-inj-a-bar').style.width = remainA + '%';
            document.getElementById('monitor-inj-b-bar').style.width = remainB + '%';
        }

        // 譁ｰ隕剰ｿｽ蜉: 繝舌ャ繝ゞI縺ｮ繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ髢｢謨ｰ
        function renderBatchUI() {
            const container = document.getElementById('batch-container');
            const seq = AppState.gantry.scanSequence;
            const activeIdx = AppState.gantry.activeBatchIndex;
            const syncIdx = AppState.gantry.injectorSyncIndex;
            const countdown = AppState.gantry.countdown;
            
            container.innerHTML = '';
            
            seq.forEach((batch, index) => {
                const isActive = index === activeIdx;
                const isRunning = AppState.gantry.isScanning || activeIdx >= 0;
                const mode = batch.mode;
                const delay = batch.delay;
                const isSyncTarget = index === syncIdx;

                // 繧ｫ繝ｼ繝峨・逕滓・
                const card = document.createElement('div');
                let cardClasses = `relative rounded-lg p-2.5 w-36 flex flex-col items-center transition-all duration-300 `;
                if (isActive) {
                    cardClasses += `bg-blue-900/80 border-2 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-110 z-10`;
                } else {
                    cardClasses += `bg-gray-800 border border-gray-600`;
                }
                card.className = cardClasses;

                // 繧ｪ繝ｼ繝舌・繝ｬ繧､繧ｫ繧ｦ繝ｳ繝医ム繧ｦ繝ｳ
                if (isActive && countdown > 0) {
                    const overlay = document.createElement('div');
                    overlay.className = 'absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center z-20 backdrop-blur-[2px]';
                    overlay.innerHTML = `<span class="text-[10px] text-yellow-400 font-bold mb-1 tracking-widest">DELAY</span><span class="text-4xl font-mono text-white font-bold leading-none">${countdown}</span>`;
                    card.appendChild(overlay);
                }
                
                // 繝倥ャ繝繝ｼ (繝ｩ繝吶Ν縺ｨ蜑企勁繝懊ち繝ｳ)
                const header = document.createElement('div');
                header.className = 'text-[10px] text-gray-400 mb-1.5 w-full flex justify-between items-center';
                
                const label = document.createElement('span');
                label.innerText = `Batch ${index + 1}`;
                if (isActive) label.className = 'text-yellow-400 font-bold';
                
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '&times;';
                delBtn.className = 'hover:text-red-400 text-base leading-none transition-colors';
                delBtn.disabled = isRunning || seq.length <= 1; 
                if (delBtn.disabled) delBtn.className += ' opacity-30 cursor-not-allowed';
                delBtn.onclick = () => removeScanBatch(index);
                
                header.appendChild(label);
                header.appendChild(delBtn);
                
                // 繝｢繝ｼ繝蛾∈謚槭・繝ｫ繝繧ｦ繝ｳ
                const select = document.createElement('select');
                select.className = 'w-full bg-gray-900 text-white text-[11px] p-1.5 rounded border border-gray-700 outline-none hover:border-blue-500 transition-colors cursor-pointer';
                select.disabled = isRunning;
                if (select.disabled) select.className += ' opacity-70 cursor-not-allowed';
                select.onchange = (e) => updateBatchData(index, 'mode', e.target.value);
                
                const options = [
                    {val: 'scano', text: 'Scano'},
                    {val: 'dual_scano', text: 'Dual Scano'},
                    {val: '3d_landmark', text: '3D Landmark'},
                    {val: 'helical', text: 'Helical'},
                    {val: 'axial', text: 'Axial'},
                    {val: 'volume', text: 'Volume'},
                    {val: 'dynamic', text: 'Dynamic'},
                    {val: 'real_prep', text: 'Real Prep'}
                ];
                
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.val;
                    option.innerText = opt.text;
                    if (opt.val === mode) option.selected = true;
                    select.appendChild(option);
                });
                
                // Delay蜈･蜉・
                const delayWrapper = document.createElement('div');
                delayWrapper.className = 'w-full flex items-center justify-between mt-2 text-[10px] text-gray-400';
                delayWrapper.innerHTML = '<span>Delay (s)</span>';
                
                const delayInput = document.createElement('input');
                delayInput.type = 'number';
                delayInput.min = '0';
                delayInput.max = '60';
                delayInput.value = delay;
                delayInput.className = 'w-10 bg-gray-900 text-white p-1 rounded border border-gray-700 outline-none text-center';
                delayInput.disabled = isRunning;
                delayInput.onchange = (e) => updateBatchData(index, 'delay', parseInt(e.target.value) || 0);
                
                delayWrapper.appendChild(delayInput);

                // 繧､繝ｳ繧ｸ繧ｧ繧ｯ繧ｿ蜷梧悄險ｭ螳壹・繧ｿ繝ｳ
                const syncBtn = document.createElement('button');
                syncBtn.innerText = isSyncTarget ? 'INJ SYNC: ON' : 'INJ SYNC: OFF';
                syncBtn.className = `w-full mt-2 py-1 rounded text-[9px] font-bold transition-colors ${isSyncTarget ? 'bg-purple-600/80 text-white border border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-gray-900 text-gray-500 border border-gray-700 hover:bg-gray-700'}`;
                syncBtn.disabled = isRunning;
                if (syncBtn.disabled) {
                    syncBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    syncBtn.classList.remove('hover:bg-gray-700');
                }
                syncBtn.onclick = () => setInjectorSync(index);

                card.appendChild(header);
                card.appendChild(select);
                card.appendChild(delayWrapper);
                card.appendChild(syncBtn);
                
                // 谺｡縺ｮ繧ｫ繝ｼ繝峨∈縺､縺ｪ縺千泙蜊ｰ繧｢繧､繧ｳ繝ｳ
                if (index < seq.length - 1) {
                    const arrowWrap = document.createElement('div');
                    arrowWrap.className = 'flex items-center justify-center text-gray-500';
                    arrowWrap.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>';
                    container.appendChild(card);
                    container.appendChild(arrowWrap);
                } else {
                    container.appendChild(card);
                }
            });

            const isRunning = AppState.gantry.isScanning || activeIdx >= 0;

            // 霑ｽ蜉繝懊ち繝ｳ縺ｮ迥ｶ諷区峩譁ｰ
            const addBtn = document.getElementById('btn-add-batch');
            addBtn.disabled = seq.length >= 5 || isRunning;
            if(addBtn.disabled) {
                addBtn.classList.add('opacity-30', 'cursor-not-allowed');
                addBtn.classList.remove('hover:bg-gray-700', 'hover:text-white');
            } else {
                addBtn.classList.remove('opacity-30', 'cursor-not-allowed');
                addBtn.classList.add('hover:bg-gray-700', 'hover:text-white');
            }
            
            // RUN繝懊ち繝ｳ縺ｮ迥ｶ諷区峩譁ｰ
            const runBtn = document.getElementById('btn-run-sequence');
            if (isRunning) {
                runBtn.disabled = false;
                runBtn.onclick = stopAutoSequence; // 螳溯｡御ｸｭ縺ｯ繧ｹ繝医ャ繝励・繧ｿ繝ｳ縺ｫ縺吶ｋ
                
                if (AppState.gantry.cancelRequested) {
                    runBtn.className = 'h-16 px-6 bg-gray-700 text-gray-400 text-xs font-bold rounded-lg border border-gray-600 flex items-center gap-2 transition-all cursor-not-allowed';
                    runBtn.innerHTML = '<div class="w-4 h-4 rounded-full border-2 border-t-red-400 animate-spin"></div> <span class="tracking-widest">STOPPING...</span>';
                    runBtn.disabled = true;
                } else if (countdown > 0) {
                    runBtn.className = 'h-16 px-6 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 tracking-wider';
                    runBtn.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-t-yellow-400 animate-spin"></div> <span class="tracking-widest">DELAY ${countdown}s (STOP)</span>`;
                } else {
                    runBtn.className = 'h-16 px-6 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 tracking-wider';
                    runBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg> STOP SEQUENCE';
                }
            } else {
                runBtn.disabled = false;
                runBtn.onclick = runAutoSequence;
                runBtn.className = 'h-16 px-6 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2 tracking-wider';
                runBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg> RUN SEQUENCE';
            }
        }

        // 驕ｸ謚槭＠縺溘ヰ繝・メ縺縺代う繝ｳ繧ｸ繧ｧ繧ｯ繧ｿ蜷梧悄繧丹N縺ｫ縺吶ｋ (莉悶・OFF)

    global.CTUIController = {
        setup: setupUI
    };

    global.updateStateMonitor = updateStateMonitor;
    global.renderBatchUI = renderBatchUI;
})(window);
