init();
animate();

function init() {
            if (window.CTProfileService && window.CTDefaultProfile) {
                window.CTProfileService.init(window.CTDefaultProfile);
            }
            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x111115);
            scene.fog = new THREE.FogExp2(0x111115, 0.03);

            camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2 - 0.01;

            // --- Lighting ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
            dirLight.position.set(5, 10, 5);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            scene.add(dirLight);

            const pointLight = new THREE.PointLight(0xddf0ff, 0.6, 5);
            pointLight.position.set(0, 1.2, 0);
            scene.add(pointLight);

            // --- Environment Build ---
            buildRoom();
            buildCTScanner();
            buildInjector();
            buildControlRoom();
            buildServerRack();

            // --- UI Setup ---
            CTUIController.setup();
            setCameraView('free');
            window.addEventListener('resize', onWindowResize);
            AppState.notify();
        }

        

        

        

        

        

        

        function applyStateToMeshes(state) {
            const yRange = CTProfileService.getCouchWorldRange('y');
            const couchY_min = yRange.min;
            const couchY_max = yRange.max;
            const targetY = couchY_min + (couchY_max - couchY_min) * (state.couch.y / 100);

            if (Meshes.tabletopGroup) Meshes.tabletopGroup.position.y = targetY;

            if (Meshes.bellows) {
                const baseTop = 0.2;
                const totalBellowsHeight = targetY - baseTop - 0.02;
                const partHeight = totalBellowsHeight / Meshes.bellows.length;

                Meshes.bellows.forEach((mesh, index) => {
                    mesh.scale.y = partHeight / 0.1;
                    mesh.position.y = (index * partHeight) + (partHeight / 2);
                });
            }

            const zRange = CTProfileService.getCouchWorldRange('z');
            const couchZ_min = zRange.min;
            const couchZ_max = zRange.max;
            if (Meshes.tabletopGroup) {
                Meshes.tabletopGroup.position.z = couchZ_min + (couchZ_max - couchZ_min) * (state.couch.z / 100);
            }

            if (Meshes.detectorGroup && Meshes.xrayBeam) {
                const ratio = state.gantry.detectorRows / CTProfileService.getDetectorRowsMax();
                Meshes.detectorGroup.scale.z = ratio;
                const baseBeamZScale = CTProfileService.getBeamZScaleAtMax();
                Meshes.xrayBeam.scale.z = baseBeamZScale * ratio;
            }

            function updateSyringe(fluidMesh, plungerMesh, percent) {
                const ratio = Math.max(0.01, 1.0 - (percent / 100));
                if (fluidMesh) fluidMesh.scale.y = ratio;
                if (plungerMesh) plungerMesh.position.y = 0.15 - (0.3 * (percent / 100));
            }

            if (Meshes.injector) {
                updateSyringe(Meshes.injector.fluidA, Meshes.injector.plungerA, state.injector.a);
                updateSyringe(Meshes.injector.fluidB, Meshes.injector.plungerB, state.injector.b);
            }
        }

        function setInjectorSync(index) {
            const current = AppState.gantry.injectorSyncIndex;
            CTCommandBus.execute({ source: 'ui-console', target: 'gantry', action: 'setField', params: { key: 'injectorSyncIndex', value: current === index ? -1 : index } });
        }

        // 郢晁・繝｣郢昶・繝ｻ髴托ｽｽ陷会｣ｰ
        function addScanBatch() {
            if (AppState.gantry.scanSequence.length >= 5) return;
            const newSeq = [...AppState.gantry.scanSequence, {mode: 'helical', delay: 0}];
            CTCommandBus.execute({ source: 'ui-console', target: 'gantry', action: 'setField', params: { key: 'scanSequence', value: newSeq } });
        }

        // 郢晁・繝｣郢昶・繝ｻ陷台ｼ∝求
        function removeScanBatch(index) {
            if (AppState.gantry.scanSequence.length <= 1) return;
            const newSeq = [...AppState.gantry.scanSequence];
            newSeq.splice(index, 1);
            CTCommandBus.execute({ source: 'ui-console', target: 'gantry', action: 'setField', params: { key: 'scanSequence', value: newSeq } });
        }

        // 郢晁・繝｣郢昶・繝ｻ郢昴・繝ｻ郢ｧ・ｿ陞溽判蟲ｩ (郢晢ｽ｢郢晢ｽｼ郢晏ｳｨ・Дelay)
        function updateBatchData(index, key, value) {
            const newSeq = [...AppState.gantry.scanSequence];
            newSeq[index] = { ...newSeq[index], [key]: value };
            CTCommandBus.execute({ source: 'ui-console', target: 'gantry', action: 'setField', params: { key: 'scanSequence', value: newSeq } });
            
            if (key === 'mode') {
                showInfoDialog(value);
                if (index === 0) {
                    CTCommandBus.execute({ source: 'ui-console', target: 'gantry', action: 'setField', params: { key: 'currentScanMode', value: value } });
                }
            }
        }

        // 郢晁ｼ斐°郢晢ｽｼ郢ｧ・ｫ郢ｧ・ｹ繝ｻ繝ｻ縺帷ｹｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢晢ｽ｢郢晢ｽｼ郢晉甥繝ｻ鬨ｾ螢ｹ繝ｻ郢敖郢ｧ・､郢ｧ・｢郢晢ｽｭ郢ｧ・ｰ髯ｦ・ｨ驕会ｽｺ鬮｢・｢隰ｨ・ｰ
        function showInfoDialog(key) {
            if (!key || key === 'none') return;

            const dialog = document.getElementById('info-dialog');
            const titleElem = document.getElementById('info-dialog-title');
            const descElem = document.getElementById('info-dialog-desc');

            const text = Descriptions[key] || 'Description not found.';
            const lines = text.split('\n\n');
            
            titleElem.innerText = lines[0]; // 1髯ｦ讙主ｲｼ郢ｧ蛛ｵ縺｡郢ｧ・､郢晏現ﾎ晉ｸｺ・ｫ
            descElem.innerText = lines[1] || ''; // 2髯ｦ讙主ｲｼ闔会ｽ･鬮ｯ髦ｪ・帝坡・ｬ隴丞叙譫夂ｸｺ・ｫ

            dialog.classList.remove('hidden');
            dialog.classList.remove('opacity-0');
        }

        function hideInfoDialog() {
            const dialog = document.getElementById('info-dialog');
            dialog.classList.add('hidden');
            // 郢ｧ・ｻ郢晢ｽｬ郢ｧ・ｯ郢晏現繝ｻ郢昴・縺醍ｹｧ・ｹ邵ｺ・ｮ鬩包ｽｸ隰壽ｨ呈・隲ｷ荵晢ｽ帝囓・｣鬮ｯ・､ (Focus邵ｺ・ｮ邵ｺ・ｿ)
            document.getElementById('select-focus').value = "";
        }

        function handleFocusChange(value) {
            if (!value) return;

            // X驍ｱ螟ゑｽｮ・｡騾・・繝ｻ郢昴・縺・ｹ昴・縺醍ｹｧ・ｿ邵ｺ・ｮ隴弱ｅ繝ｻ闕ｳ・ｭ髴・ｽｫ郢ｧ螳夲ｽｦ荵昶雷郢ｧ荵昶螺郢ｧ竏壹℃郢晢ｽｳ郢晏現ﾎ懃ｹｧ雋樊ｿ鬨ｾ荵励・陋ｹ繝ｻ
            if (value === 'XrayTube' || value === 'Detector') {
                setGantryOpacity(true);
            } else if (value === 'Gantry' || value === 'TouchPanel') {
                setGantryOpacity(false); 
            }

            setCameraView('focus_' + value);
            showInfoDialog(value);
        }

        function toggleScan() {
            const isScan = !AppState.gantry.isScanning;
            CTCommandBus.execute({ source: 'ui-console', target: 'gantry', action: 'setScanning', params: { value: isScan } });

            new TWEEN.Tween(AppState.gantry)
                .to({ rotorSpeed: isScan ? 100 : 0 }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => AppState.notify())
                .start();
        }

        function setScanMode(mode) {
            CTCommandBus.execute({ source: 'ui-console', target: 'gantry', action: 'setField', params: { key: 'scanMode', value: mode } });
        }

        function setCameraView(viewType) {
            // 郢晁ｼ斐°郢晢ｽｼ郢ｧ・ｫ郢ｧ・ｹ闔会ｽ･陞滓じ繝ｻ郢ｧ・ｫ郢晢ｽ｡郢晢ｽｩ郢晁侭ﾎ礼ｹ晢ｽｼ邵ｺ・ｫ陋ｻ繝ｻ・願ｭ厄ｽｿ郢ｧ荳岩夢邵ｺ貅ｷ・ｰ・ｴ陷ｷ蛹ｻ繝ｻ郢敖郢ｧ・､郢ｧ・｢郢晢ｽｭ郢ｧ・ｰ郢ｧ蟶晏恚邵ｺ繝ｻ
            if (!viewType.startsWith('focus_')) {
                hideInfoDialog();
            }

            new TWEEN.Tween(camera.position)
                .to(getCameraTarget(viewType).pos, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();

            new TWEEN.Tween(controls.target)
                .to(getCameraTarget(viewType).lookAt, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();
        }

        function getCameraTarget(type) {
            // 驍ｨ・ｱ陷ｷ蛹ｻ繝ｵ郢ｧ・ｩ郢晢ｽｼ郢ｧ・ｫ郢ｧ・ｹ騾包ｽｨ邵ｺ・ｮ郢ｧ・ｫ郢晢ｽ｡郢晢ｽｩ陷・ｽｦ騾・・
            if (type.startsWith('focus_')) {
                const label = type.replace('focus_', '');
                
                // 1. 郢ｧ・ｵ郢晢ｽｼ郢晁・繝ｻ郢晢ｽｩ郢昴・縺題怙繝ｻ繝ｻ隶諛・ｽｴ・｢
                if (Meshes.serverBlades && Meshes.serverBlades[label]) {
                    return { pos: Meshes.serverBlades[label].cameraPos, lookAt: Meshes.serverBlades[label].target };
                }
                
                // 2. 邵ｺ譏ｴ繝ｻ闔画じ繝ｻ郢ｧ・ｳ郢晢ｽｳ郢晄亢繝ｻ郢晞亂ﾎｦ郢晏現繝ｻ隶諛・ｽｴ・｢
                const focusTargets = {
                    // 闖ｫ・ｮ雎・ｽ｣: 隴幢ｽｺ邵ｺ・ｮ闖ｴ蜥ｲ・ｽ・ｮ郢ｧ雋槭・闖ｴ骰句飭邵ｺ・ｫ +2 邵ｺ・ｻ邵ｺ・ｩ邵ｺ螢ｹ・臥ｸｺ蜉ｱ笳・ｸｺ貅假ｽ∫ｹｧ・ｫ郢晢ｽ｡郢晢ｽｩ郢ｧ繧仰・｣陷阪・
                    'Injector': { cameraPos: new THREE.Vector3(-2.8, 1.6, 2.8), target: new THREE.Vector3(-1.5, 1.3, 1.8) },
                    'Gantry': { cameraPos: new THREE.Vector3(0, 2.0, 4.0), target: new THREE.Vector3(0, 1.2, 0) },
                    'Couch': { cameraPos: new THREE.Vector3(2.5, 1.8, 3.5), target: new THREE.Vector3(0, 0.8, 2.0) },
                    'TouchPanel': { cameraPos: new THREE.Vector3(1.2, 1.6, 1.0), target: new THREE.Vector3(0.8, 1.55, 0.4) },
                    'XrayTube': { cameraPos: new THREE.Vector3(0, 2.0, 1.2), target: new THREE.Vector3(0, 1.72, 0) },
                    'Detector': { cameraPos: new THREE.Vector3(0, 0.5, 1.5), target: new THREE.Vector3(0, 0.68, 0) },
                    'ConsoleDisplay': { cameraPos: new THREE.Vector3(5.0, 1.6, 0.5), target: new THREE.Vector3(6.1, 1.4, -0.2) },
                    'OperationSwitcher': { cameraPos: new THREE.Vector3(5.2, 1.1, 0.2), target: new THREE.Vector3(6.0, 0.78, 0.0) }
                };

                if (focusTargets[label]) {
                    return { pos: focusTargets[label].cameraPos, lookAt: focusTargets[label].target };
                }
            }

            switch (type) {
                case 'operator':
                    return { pos: new THREE.Vector3(7.0, 1.5, 0), lookAt: new THREE.Vector3(0, 1.2, 0) };
                case 'patient':
                    return { pos: new THREE.Vector3(0, 1.3, 4.0), lookAt: new THREE.Vector3(0, 1.2, 0) };
                case 'injector':
                    return { pos: new THREE.Vector3(-3.0, 1.6, 2.5), lookAt: new THREE.Vector3(-1.8, 1.3, 1.8) };
                case 'gantryTop':
                    return { pos: new THREE.Vector3(0, 2.02, 0.45), lookAt: new THREE.Vector3(0, 1.0, 1.5) };
                case 'gantrySide':
                    return { pos: new THREE.Vector3(-0.82, 1.2, 0.45), lookAt: new THREE.Vector3(0, 1.0, 1.5) };
                case 'free':
                default:
                    return { pos: new THREE.Vector3(4, 3, 5), lookAt: new THREE.Vector3(0, 0.5, 0) };
            }
        }

        function togglePatient() {
            CTCommandBus.execute({ source: 'ui-console', target: 'simulator', action: 'setPatientVisible', params: { value: !AppState.patientVisible } });
        }

        function toggleXRay() {
            const isVisible = !AppState.gantry.xrayVisible;
            CTCommandBus.execute({ source: 'ui-console', target: 'gantry', action: 'setXrayVisible', params: { value: isVisible } });

            if (isVisible) setGantryOpacity(true);
        }

        function setGantryOpacity(isTranslucent) {
            if (Meshes.materials) {
                const opacity = isTranslucent ? 0.2 : 1.0;

                Meshes.materials.gantry.transparent = isTranslucent;
                Meshes.materials.gantry.opacity = opacity;
                Meshes.materials.gantry.depthWrite = !isTranslucent;
                Meshes.materials.gantry.needsUpdate = true;

                Meshes.materials.base.transparent = isTranslucent;
                Meshes.materials.base.opacity = opacity;
                Meshes.materials.base.depthWrite = !isTranslucent;
                Meshes.materials.base.needsUpdate = true;

                Meshes.materials.tunnel.transparent = isTranslucent;
                Meshes.materials.tunnel.opacity = isTranslucent ? 0.35 : 1.0;
                Meshes.materials.tunnel.transmission = isTranslucent ? 0.9 : 0.0;
                Meshes.materials.tunnel.depthWrite = !isTranslucent;
                Meshes.materials.tunnel.needsUpdate = true;

                Meshes.materials.accessories.forEach(mat => {
                    mat.transparent = isTranslucent;
                    mat.opacity = opacity;
                    mat.depthWrite = !isTranslucent;
                    mat.needsUpdate = true;
                });
            }

            const btnOpq = document.getElementById('btn-gantry-opaque');
            const btnTrn = document.getElementById('btn-gantry-trans');

            if (isTranslucent) {
                btnTrn.className = "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                btnOpq.className = "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
            } else {
                btnOpq.className = "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                btnTrn.className = "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
            }
        }

        // 郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢ｧ・ｻ郢晢ｽｫ陷ｿ・ｯ髢ｭ・ｽ邵ｺ・ｪ Wait 鬮｢・｢隰ｨ・ｰ
        function wait(ms) {
            return new Promise(resolve => {
                const interval = 100;
                let elapsed = 0;
                const timer = setInterval(() => {
                    elapsed += interval;
                    if (AppState.gantry.cancelRequested || elapsed >= ms) {
                        clearInterval(timer);
                        resolve();
                    }
                }, interval);
            });
        }

        function tweenPromise(target, to, duration, easing = TWEEN.Easing.Quadratic.InOut) {
            return new Promise(resolve => {
                const tween = new TWEEN.Tween(target)
                    .to(to, duration)
                    .easing(easing)
                    .onUpdate(() => {
                        AppState.notify();
                        if (AppState.gantry.cancelRequested) {
                            tween.stop();
                            resolve(); // 郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢ｧ・ｻ郢晢ｽｫ隴弱ｅ繝ｻ陷奇ｽｳ陟趣ｽｧ邵ｺ・ｫ髫暦ｽ｣雎趣ｽｺ邵ｺ蜉ｱ窶ｻ隹ｺ・｡邵ｺ・ｸ繝ｻ蛹ｻ縺顔ｹ晢ｽｩ郢晢ｽｼ陷・ｽｦ騾・・逡代・繝ｻ
                        }
                    })
                    .onComplete(resolve)
                    .start();
            });
        }

        let isSequenceRunning = false;

        // 郢ｧ・ｷ郢晢ｽｼ郢ｧ・ｱ郢晢ｽｳ郢ｧ・ｹ邵ｺ・ｮ闕ｳ・ｭ隴・ｽｭ髫補扱・ｱ繝ｻ
        function stopAutoSequence() {
            if (!isSequenceRunning) return;
            CTSequenceService.setCancelRequested(true);
        }

        async function runAutoSequence() {
            if (isSequenceRunning) return;
            isSequenceRunning = true;
            CTSequenceService.setCancelRequested(false);

            // 霑･・ｶ隲ｷ荵昴・郢晢ｽｪ郢ｧ・ｻ郢昴・繝ｨ
            CTSequenceService.resetInitialHardwareState();
            if (AppState.gantry.xrayVisible) toggleXRay();
            if (AppState.gantry.isScanning) toggleScan();

            // 1. 陝・剌蠎顔ｸｺ・ｮ闕ｳ鬆代・
            await tweenPromise(AppState.couch, { y: 80 }, 2000);

            const seq = AppState.gantry.scanSequence;

            // 郢晁・繝｣郢昶・繝ｻ騾・・ﾎ晉ｹ晢ｽｼ郢昴・
            for (let i = 0; i < seq.length; i++) {
                if (AppState.gantry.cancelRequested) break;

                const batch = seq[i];
                const mode = batch.mode;
                const delay = batch.delay || 0;
                const isSyncTarget = (AppState.gantry.injectorSyncIndex === i);
                
                // 霑ｴ・ｾ陜ｨ・ｨ陞ｳ貅ｯ・｡蠕｡・ｸ・ｭ邵ｺ・ｮ郢晁・繝｣郢昶・縺・ｹ晢ｽｳ郢昴・繝｣郢ｧ・ｯ郢ｧ・ｹ郢ｧ蜻亥ｳｩ隴・ｽｰ
                CTSequenceService.setActiveBatchIndex(i);
                CTSequenceService.setCurrentScanMode(mode);

                // --- Delay陷・ｽｦ騾・・(郢ｧ・ｫ郢ｧ・ｦ郢晢ｽｳ郢晏現繝郢ｧ・ｦ郢晢ｽｳ) ---
                if (delay > 0) {
                    for(let d = delay; d > 0; d--) {
                        if (AppState.gantry.cancelRequested) break;
                        CTSequenceService.setCountdown(d);
                        await wait(1000);
                    }
                    CTSequenceService.setCountdown(0);
                }

                if (AppState.gantry.cancelRequested) break;

                // 陷ｷ譴ｧ謔・坎・ｭ陞ｳ螢ｹ・・ｹｧ蠕娯ｻ邵ｺ繝ｻ・檎ｸｺ・ｰ邵ｲ竏壹○郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ鬮｢蜿･・ｧ荵昶・陷ｷ譴ｧ蜃ｾ邵ｺ・ｫ鬨ｾ・ｰ陟厄ｽｱ陷托ｽ､雎包ｽｨ陷茨ｽ･
                if (isSyncTarget) {
                    tweenPromise(AppState.injector, { a: 100 }, 4000);
                }

                const isScano = mode === 'scano' || mode === 'dual_scano';
                const isVolume = mode === 'volume' || mode === 'dynamic' || mode === 'real_prep';
                const isHelicalLike = mode === 'helical' || mode === '3d_landmark';

                if (isScano) {
                    // --- 郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晏ｼｱ縺堤ｹ晢ｽｩ郢晢｣ｰ (陜玲ｫ・ｽｻ・｢陋帶㊧・ｭ・｢ 繝ｻ繝ｻ鬨ｾ・｣驍ｯ螟ゑｽｧ・ｻ陷阪・ ---
                    new TWEEN.Tween(Meshes.rotor.rotation).to({ z: 0 }, 1000).start();
                    await wait(1000);
                    if (AppState.gantry.cancelRequested) break;
                    
                    await tweenPromise(AppState.couch, { z: 80 }, 1500); 
                    if (AppState.gantry.cancelRequested) break;

                    toggleXRay();
                    await tweenPromise(AppState.couch, { z: 20 }, 4000, TWEEN.Easing.Linear.None);
                    if (AppState.gantry.xrayVisible) toggleXRay();

                } else {
                    // 陜玲ｫ・ｽｻ・｢郢ｧ蜑・ｽｼ・ｴ邵ｺ繝ｻ縺帷ｹｧ・ｭ郢晢ｽ｣郢晢ｽｳ
                    if (!AppState.gantry.isScanning) {
                        toggleScan();
                        await wait(2000);
                    }
                    if (AppState.gantry.cancelRequested) break;

                    if (isHelicalLike) {
                        // --- 郢晏･ﾎ懃ｹｧ・ｫ郢晢ｽｫ / 3D Landmark ---
                        await tweenPromise(AppState.couch, { z: 80 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        toggleXRay();
                        await tweenPromise(AppState.couch, { z: 20 }, 5000, TWEEN.Easing.Linear.None);
                        if (AppState.gantry.xrayVisible) toggleXRay();

                    } else if (isVolume) {
                        // --- 郢晄㈱ﾎ懃ｹ晢ｽ･郢晢ｽｼ郢晢｣ｰ驍会ｽｻ (邵ｺ譏ｴ繝ｻ陜｣・ｴ邵ｺ・ｧ陋帶㊧・ｭ・｢) ---
                        // 闖ｫ・ｮ雎・ｽ｣: Z=70% (闔・ｺ闖ｴ讌｢繝ｻ鬩幢ｽｨ) 邵ｺ・ｫ驕假ｽｻ陷崎ｼ披・郢ｧ繝ｻ
                        await tweenPromise(AppState.couch, { z: 70 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        toggleXRay();
                        await wait(4000);
                        if (AppState.gantry.xrayVisible) toggleXRay();

                    } else if (mode === 'axial') {
                        // --- 郢ｧ・｢郢ｧ・ｭ郢ｧ・ｷ郢晢ｽ｣郢晢ｽｫ (郢ｧ・ｹ郢昴・繝｣郢昴・ ---
                        await tweenPromise(AppState.couch, { z: 80 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        const steps = 4;
                        const startZ = 80;
                        const endZ = 20;
                        const stepDist = (startZ - endZ) / steps;

                        for (let step = 0; step < steps; step++) {
                            if (AppState.gantry.cancelRequested) break;
                            toggleXRay();
                            await wait(1000); 
                            if (AppState.gantry.xrayVisible) toggleXRay();

                            if (step < steps - 1 && !AppState.gantry.cancelRequested) {
                                const nextZ = startZ - (stepDist * (step + 1));
                                await tweenPromise(AppState.couch, { z: nextZ }, 800, TWEEN.Easing.Quadratic.InOut);
                                await wait(200);
                            }
                        }
                    }
                }
                
                await wait(1000);
            }

            // --- 郢ｧ・ｯ郢晢ｽｪ郢晢ｽｼ郢晢ｽｳ郢ｧ・｢郢昴・繝ｻ邵ｺ・ｨ鬨ｾﾂ陷・ｽｺ陷・ｽｦ騾・・---
            
            // Ensure beam is turned off before sequence shutdown.
            if (AppState.gantry.xrayVisible) {
                toggleXRay();
            }

            CTSequenceService.setActiveBatchIndex(-1);
            CTSequenceService.setCountdown(0);

            // 郢晢ｽｭ郢晢ｽｼ郢ｧ・ｿ郢晢ｽｼ邵ｺ謔溷ｱ鍋ｸｺ・｣邵ｺ・ｦ邵ｺ繝ｻ・檎ｸｺ・ｰ陋帶㊧・ｭ・｢
            if (AppState.gantry.isScanning) {
                toggleScan();
                await wait(2000);
            }

            // 陝・剌蠎企ｨｾﾂ陷・ｽｺ
            await tweenPromise(AppState.couch, { z: 0 }, 2000);
            await tweenPromise(AppState.couch, { y: 0 }, 2000);

            // 霑･・ｶ隲ｷ荵昴・陟包ｽｩ陷医・
            CTSequenceService.setCurrentScanMode(AppState.gantry.scanSequence[0].mode);
            CTSequenceService.setCancelRequested(false);

            isSequenceRunning = false;
            renderBatchUI(); // 郢晄㈱縺｡郢晢ｽｳ邵ｺ・ｮ髯ｦ・ｨ驕会ｽｺ郢ｧ蟶敖螢ｼ・ｸ・ｸ邵ｺ・ｫ隰鯉ｽｻ邵ｺ繝ｻ
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate(time) {
            requestAnimationFrame(animate);
            TWEEN.update(time);
            const delta = clock.getDelta();

            if (Meshes.rotor && AppState.gantry.rotorSpeed > 0) {
                const radPerSec = (AppState.gantry.rotorSpeed * Math.PI * 2) / 60;
                Meshes.rotor.rotation.z += radPerSec * delta;
                AppState.gantry.angle = Meshes.rotor.rotation.z % (Math.PI * 2);
            }

            if (mixer) {
                mixer.update(delta);
            }

            // 郢ｧ・ｵ郢晢ｽｼ郢晁・繝ｻ邵ｺ・ｮ郢ｧ・｢郢ｧ・ｯ郢ｧ・ｻ郢ｧ・ｹ郢晢ｽｩ郢晢ｽｳ郢晏干・堤ｹ晢ｽｩ郢晢ｽｳ郢敖郢晢｣ｰ邵ｺ・ｫ霓､・ｹ雋翫・・・ｸｺ蟶呻ｽ玖ｲ肴ｳ後・
            if (Meshes.serverLeds) {
                Meshes.serverLeds.forEach(mat => {
                    if (Math.random() > 0.85) {
                        mat.opacity = Math.random();
                    }
                });
            }

            controls.update();
            renderer.render(scene, camera);
        }




