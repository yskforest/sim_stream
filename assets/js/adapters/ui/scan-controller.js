// スキャン・X線制御とガントリ透過表示制御
function toggleScan() {
    var isScan = !AppState.gantry.isScanning;
    CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setScanning", params: { value: isScan } });

    new TWEEN.Tween(AppState.gantry)
        .to({ rotorSpeed: isScan ? 100 : 0 }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function () { AppState.notify(); })
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

        Meshes.materials.accessories.forEach(function (mat) {
            mat.transparent = isTranslucent;
            mat.opacity = opacity;
            mat.depthWrite = !isTranslucent;
            mat.needsUpdate = true;
        });

        if (window.AppState) {
            AppState.update("gantry", "isTranslucent", isTranslucent);
        }
    }
}

if (typeof window !== "undefined") {
    window.setGantryOpacity = setGantryOpacity;
}
