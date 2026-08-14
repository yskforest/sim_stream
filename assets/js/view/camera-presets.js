function setCameraView(viewType) {
    if (!viewType.startsWith("focus_")) {
        hideInfoDialog();
    }

    var isFree = (viewType === "free");
    var isFPS = (viewType === "fps");

    var ctrl = window.controls || (typeof controls !== "undefined" ? controls : null);
    if (ctrl) {
        ctrl.enabled = isFree;
        ctrl.enableRotate = isFree;
        ctrl.enableZoom = isFree;
        ctrl.enablePan = isFree;
    }

    if (window.CTFPSControls) {
        if (isFPS) {
            window.CTFPSControls.enable();
        } else {
            window.CTFPSControls.disable();
        }
    }

    var sel = document.getElementById("select-camera-view");
    if (sel && sel.value !== viewType) {
        sel.value = viewType;
    }

    // FPS モードへの切替時は自由歩行操作へ移行
    if (isFPS) return;

    var target = getCameraTarget(viewType);
    if (!target) return;

    var cam = window.camera || (typeof camera !== "undefined" ? camera : null);
    if (!cam) return;

    if (typeof TWEEN !== "undefined") {
        new TWEEN.Tween(cam.position).to(target.pos, 1000).easing(TWEEN.Easing.Cubic.Out)
            .onUpdate(function() { if (window.requestRenderFrame) window.requestRenderFrame(5); })
            .start();
        if (ctrl) {
            new TWEEN.Tween(ctrl.target)
                .to(target.lookAt, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(function() {
                    if (ctrl) ctrl.update();
                    if (window.requestRenderFrame) window.requestRenderFrame(5);
                })
                .start();
        }
    } else {
        cam.position.copy(target.pos);
        if (ctrl) {
            ctrl.target.copy(target.lookAt);
            ctrl.update();
        }
        if (window.requestRenderFrame) window.requestRenderFrame(15);
    }
}

function getCameraTarget(type) {
    if (type.startsWith("focus_")) {
        var label = type.replace("focus_", "");

        if (Meshes.serverBlades && Meshes.serverBlades[label]) {
            return { pos: Meshes.serverBlades[label].cameraPos, lookAt: Meshes.serverBlades[label].target };
        }

        var focusTargets = {
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
