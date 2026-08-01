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
    }

    var btnOpq = document.getElementById("btn-gantry-opaque");
    var btnTrn = document.getElementById("btn-gantry-trans");

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

if (typeof window !== "undefined") {
    window.setGantryOpacity = setGantryOpacity;
}
