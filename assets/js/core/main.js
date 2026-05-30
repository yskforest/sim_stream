init();
animate();

function init() {
    if (window.CTProfileService && window.CTDefaultProfile) {
        window.CTProfileService.init(window.CTDefaultProfile);
    }
    const container = document.getElementById("canvas-container");
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
    setCameraView("free");
    window.addEventListener("resize", onWindowResize);
    AppState.notify();
}

function applyStateToMeshes(state) {
    // UI上の0-100%を、プロファイル定義の実空間座標へ変換する
    const yRange = CTProfileService.getCouchWorldRange("y");
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
            mesh.position.y = index * partHeight + partHeight / 2;
        });
    }

    const zRange = CTProfileService.getCouchWorldRange("z");
    const couchZ_min = zRange.min;
    const couchZ_max = zRange.max;
    if (Meshes.tabletopGroup) {
        Meshes.tabletopGroup.position.z = couchZ_min + (couchZ_max - couchZ_min) * (state.couch.z / 100);
    }

    if (Meshes.detectorGroup && Meshes.xrayBeam) {
        // 検出器列数に合わせて検出器とビーム厚みを連動させる
        const ratio = state.gantry.detectorRows / CTProfileService.getDetectorRowsMax();
        Meshes.detectorGroup.scale.z = ratio;
        const baseBeamZScale = CTProfileService.getBeamZScaleAtMax();
        Meshes.xrayBeam.scale.z = baseBeamZScale * ratio;
    }

    function updateSyringe(fluidMesh, plungerMesh, percent) {
        // 注入率に応じて液体量とプランジャ位置を同期更新する
        const ratio = Math.max(0.01, 1.0 - percent / 100);
        if (fluidMesh) fluidMesh.scale.y = ratio;
        if (plungerMesh) plungerMesh.position.y = 0.15 - 0.3 * (percent / 100);
    }

    if (Meshes.injector) {
        updateSyringe(Meshes.injector.fluidA, Meshes.injector.plungerA, state.injector.a);
        updateSyringe(Meshes.injector.fluidB, Meshes.injector.plungerB, state.injector.b);
    }
}

function setInjectorSync(index) {
    const current = AppState.gantry.injectorSyncIndex;
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "injectorSyncIndex", value: current === index ? -1 : index },
    });
}

function addScanBatch() {
    if (AppState.gantry.scanSequence.length >= 5) return;
    const newSeq = [...AppState.gantry.scanSequence, { mode: "helical", delay: 0 }];
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "scanSequence", value: newSeq },
    });
}

// バッチを削除する（最低1件は残す）
function removeScanBatch(index) {
    if (AppState.gantry.scanSequence.length <= 1) return;
    const newSeq = [...AppState.gantry.scanSequence];
    newSeq.splice(index, 1);
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "scanSequence", value: newSeq },
    });
}

function updateBatchData(index, key, value) {
    const newSeq = [...AppState.gantry.scanSequence];
    newSeq[index] = { ...newSeq[index], [key]: value };
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "scanSequence", value: newSeq },
    });

    if (key === "mode") {
        showInfoDialog(value);
        if (index === 0) {
            CTCommandBus.execute({
                source: "ui-console",
                target: "gantry",
                action: "setField",
                params: { key: "currentScanMode", value: value },
            });
        }
    }
}

function showInfoDialog(key) {
    if (!key || key === "none") return;

    const dialog = document.getElementById("info-dialog");
    const titleElem = document.getElementById("info-dialog-title");
    const descElem = document.getElementById("info-dialog-desc");

    const text = Descriptions[key] || "Description not found.";
    const lines = text.split("\n\n");

    // 1段落目をタイトル、2段落目を説明として表示する
    titleElem.innerText = lines[0];
    descElem.innerText = lines[1] || "";

    dialog.classList.remove("hidden");
    dialog.classList.remove("opacity-0");
}

function hideInfoDialog() {
    const dialog = document.getElementById("info-dialog");
    dialog.classList.add("hidden");
    document.getElementById("select-focus").value = "";
}

function handleFocusChange(value) {
    if (!value) return;

    if (value === "XrayTube" || value === "Detector") {
        setGantryOpacity(true);
    } else if (value === "Gantry" || value === "TouchPanel") {
        setGantryOpacity(false);
    }

    setCameraView("focus_" + value);
    showInfoDialog(value);
}

function toggleScan() {
    const isScan = !AppState.gantry.isScanning;
    CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setScanning", params: { value: isScan } });

    new TWEEN.Tween(AppState.gantry)
        .to({ rotorSpeed: isScan ? 100 : 0 }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => AppState.notify())
        .start();
}

function setScanMode(mode) {
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "scanMode", value: mode },
    });
}

function setCameraView(viewType) {
    if (!viewType.startsWith("focus_")) {
        hideInfoDialog();
    }

    // カメラ位置と注視点を同時補間して、視点遷移を滑らかにする
    new TWEEN.Tween(camera.position).to(getCameraTarget(viewType).pos, 1000).easing(TWEEN.Easing.Cubic.Out).start();

    new TWEEN.Tween(controls.target).to(getCameraTarget(viewType).lookAt, 1000).easing(TWEEN.Easing.Cubic.Out).start();
}

function getCameraTarget(type) {
    if (type.startsWith("focus_")) {
        const label = type.replace("focus_", "");

        if (Meshes.serverBlades && Meshes.serverBlades[label]) {
            return { pos: Meshes.serverBlades[label].cameraPos, lookAt: Meshes.serverBlades[label].target };
        }

        const focusTargets = {
            Injector: { cameraPos: new THREE.Vector3(-2.8, 1.6, 2.8), target: new THREE.Vector3(-1.5, 1.3, 1.8) },
            Gantry: { cameraPos: new THREE.Vector3(0, 2.0, 4.0), target: new THREE.Vector3(0, 1.2, 0) },
            Couch: { cameraPos: new THREE.Vector3(2.5, 1.8, 3.5), target: new THREE.Vector3(0, 0.8, 2.0) },
            TouchPanel: { cameraPos: new THREE.Vector3(1.2, 1.6, 1.0), target: new THREE.Vector3(0.8, 1.55, 0.4) },
            XrayTube: { cameraPos: new THREE.Vector3(0, 2.0, 1.2), target: new THREE.Vector3(0, 1.72, 0) },
            Detector: { cameraPos: new THREE.Vector3(0, 0.5, 1.5), target: new THREE.Vector3(0, 0.68, 0) },
            ConsoleDisplay: { cameraPos: new THREE.Vector3(5.0, 1.6, 0.5), target: new THREE.Vector3(6.1, 1.4, -0.2) },
            OperationSwitcher: {
                cameraPos: new THREE.Vector3(5.2, 1.1, 0.2),
                target: new THREE.Vector3(6.0, 0.78, 0.0),
            },
        };

        if (focusTargets[label]) {
            return { pos: focusTargets[label].cameraPos, lookAt: focusTargets[label].target };
        }
    }

    // 未定義の視点指定は free へフォールバックする
    switch (type) {
        case "operator":
            return { pos: new THREE.Vector3(7.0, 1.5, 0), lookAt: new THREE.Vector3(0, 1.2, 0) };
        case "patient":
            return { pos: new THREE.Vector3(0, 1.3, 4.0), lookAt: new THREE.Vector3(0, 1.2, 0) };
        case "injector":
            return { pos: new THREE.Vector3(-3.0, 1.6, 2.5), lookAt: new THREE.Vector3(-1.8, 1.3, 1.8) };
        case "gantryTop":
            return { pos: new THREE.Vector3(0, 2.02, 0.45), lookAt: new THREE.Vector3(0, 1.0, 1.5) };
        case "gantrySide":
            return { pos: new THREE.Vector3(-0.82, 1.2, 0.45), lookAt: new THREE.Vector3(0, 1.0, 1.5) };
        case "free":
        default:
            return { pos: new THREE.Vector3(4, 3, 5), lookAt: new THREE.Vector3(0, 0.5, 0) };
    }
}

function togglePatient() {
    CTCommandBus.execute({
        source: "ui-console",
        target: "simulator",
        action: "setPatientVisible",
        params: { value: !AppState.patientVisible },
    });
}

function toggleXRay() {
    const isVisible = !AppState.gantry.xrayVisible;
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

        Meshes.materials.accessories.forEach((mat) => {
            mat.transparent = isTranslucent;
            mat.opacity = opacity;
            mat.depthWrite = !isTranslucent;
            mat.needsUpdate = true;
        });
    }

    const btnOpq = document.getElementById("btn-gantry-opaque");
    const btnTrn = document.getElementById("btn-gantry-trans");

    if (isTranslucent) {
        btnTrn.className =
            "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
        btnOpq.className =
            "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
    } else {
        btnOpq.className =
            "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
        btnTrn.className =
            "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
    }
}

function wait(ms) {
    return new Promise((resolve) => {
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
    return new Promise((resolve) => {
        const tween = new TWEEN.Tween(target)
            .to(to, duration)
            .easing(easing)
            .onUpdate(() => {
                AppState.notify();
                if (AppState.gantry.cancelRequested) {
                    tween.stop();
                    // 停止要求時はトゥイーンを中断して即時完了させる
                    resolve();
                }
            })
            .onComplete(resolve)
            .start();
    });
}

let isSequenceRunning = false;

function stopAutoSequence() {
    if (!isSequenceRunning) return;
    CTSequenceService.setCancelRequested(true);
}

async function runAutoSequence() {
    if (isSequenceRunning) return;
    isSequenceRunning = true;
    CTSequenceService.setCancelRequested(false);

    CTSequenceService.resetInitialHardwareState();
    if (AppState.gantry.xrayVisible) toggleXRay();
    if (AppState.gantry.isScanning) toggleScan();

    await tweenPromise(AppState.couch, { y: 80 }, 2000);

    const seq = AppState.gantry.scanSequence;

    for (let i = 0; i < seq.length; i++) {
        if (AppState.gantry.cancelRequested) break;

        const batch = seq[i];
        const mode = batch.mode;
        const delay = batch.delay || 0;
        const isSyncTarget = AppState.gantry.injectorSyncIndex === i;

        CTSequenceService.setActiveBatchIndex(i);
        CTSequenceService.setCurrentScanMode(mode);

        if (delay > 0) {
            for (let d = delay; d > 0; d--) {
                if (AppState.gantry.cancelRequested) break;
                CTSequenceService.setCountdown(d);
                await wait(1000);
            }
            CTSequenceService.setCountdown(0);
        }

        if (AppState.gantry.cancelRequested) break;

        if (isSyncTarget) {
            tweenPromise(AppState.injector, { a: 100 }, 4000);
        }

        const isScano = mode === "scano" || mode === "dual_scano";
        const isVolume = mode === "volume" || mode === "dynamic" || mode === "real_prep";
        const isHelicalLike = mode === "helical" || mode === "3d_landmark";

        if (isScano) {
            // Topogram系: 回転を止めた状態で寝台を移動しながら照射
            new TWEEN.Tween(Meshes.rotor.rotation).to({ z: 0 }, 1000).start();
            await wait(1000);
            if (AppState.gantry.cancelRequested) break;

            await tweenPromise(AppState.couch, { z: 80 }, 1500);
            if (AppState.gantry.cancelRequested) break;

            toggleXRay();
            await tweenPromise(AppState.couch, { z: 20 }, 4000, TWEEN.Easing.Linear.None);
            if (AppState.gantry.xrayVisible) toggleXRay();
        } else {
            if (!AppState.gantry.isScanning) {
                toggleScan();
                await wait(2000);
            }
            if (AppState.gantry.cancelRequested) break;

            if (isHelicalLike) {
                // Helical系: 回転＋寝台送りで連続照射
                await tweenPromise(AppState.couch, { z: 80 }, 1500);
                if (AppState.gantry.cancelRequested) break;

                toggleXRay();
                await tweenPromise(AppState.couch, { z: 20 }, 5000, TWEEN.Easing.Linear.None);
                if (AppState.gantry.xrayVisible) toggleXRay();
            } else if (isVolume) {
                // Volume系: 固定位置に近い状態で一定時間照射
                await tweenPromise(AppState.couch, { z: 70 }, 1500);
                if (AppState.gantry.cancelRequested) break;

                toggleXRay();
                await wait(4000);
                if (AppState.gantry.xrayVisible) toggleXRay();
            } else if (mode === "axial") {
                // Axial系: ステップ移動と短時間照射を繰り返す
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
                        const nextZ = startZ - stepDist * (step + 1);
                        await tweenPromise(AppState.couch, { z: nextZ }, 800, TWEEN.Easing.Quadratic.InOut);
                        await wait(200);
                    }
                }
            }
        }

        await wait(1000);
    }

    // Ensure beam is turned off before sequence shutdown.
    if (AppState.gantry.xrayVisible) {
        toggleXRay();
    }

    CTSequenceService.setActiveBatchIndex(-1);
    CTSequenceService.setCountdown(0);

    if (AppState.gantry.isScanning) {
        toggleScan();
        await wait(2000);
    }

    await tweenPromise(AppState.couch, { z: 0 }, 2000);
    await tweenPromise(AppState.couch, { y: 0 }, 2000);

    CTSequenceService.setCurrentScanMode(AppState.gantry.scanSequence[0].mode);
    CTSequenceService.setCancelRequested(false);

    isSequenceRunning = false;
    // 実行後にバッチUIの状態を再描画する
    renderBatchUI();
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

    if (Meshes.serverLeds) {
        Meshes.serverLeds.forEach((mat) => {
            if (Math.random() > 0.85) {
                mat.opacity = Math.random();
            }
        });
    }

    controls.update();
    renderer.render(scene, camera);
}
