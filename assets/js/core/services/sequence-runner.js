// スキャンシーケンス自動実行エンジン
var isSequenceRunning = false;

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

    var seq = AppState.gantry.scanSequence;

    for (var i = 0; i < seq.length; i++) {
        if (AppState.gantry.cancelRequested) break;

        var batch = seq[i];
        var mode = batch.mode;
        var delay = batch.delay || 0;
        var isSyncTarget = AppState.gantry.injectorSyncIndex === i;

        CTSequenceService.setActiveBatchIndex(i);
        CTSequenceService.setCurrentScanMode(mode);

        if (delay > 0) {
            for (var d = delay; d > 0; d--) {
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

        var isScano = mode === "scano" || mode === "dual_scano";
        var isVolume = mode === "volume" || mode === "dynamic" || mode === "real_prep";
        var isHelicalLike = mode === "helical" || mode === "3d_landmark";

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

                var steps = 4;
                var startZ = 80;
                var endZ = 20;
                var stepDist = (startZ - endZ) / steps;

                for (var step = 0; step < steps; step++) {
                    if (AppState.gantry.cancelRequested) break;
                    toggleXRay();
                    await wait(1000);
                    if (AppState.gantry.xrayVisible) toggleXRay();

                    if (step < steps - 1 && !AppState.gantry.cancelRequested) {
                        var nextZ = startZ - stepDist * (step + 1);
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
