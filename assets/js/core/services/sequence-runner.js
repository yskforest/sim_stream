// CT 3D Simulator - Sequence Runner & Batch Management Service (Slim & Modular)
(function attachSequenceRunner(global) {
    "use strict";

    var wait = function (ms) { return new Promise(function (res) { setTimeout(res, ms); }); };

    function tweenPromise(target, to, duration, easing) {
        return new Promise(function (resolve) {
            if (typeof TWEEN === "undefined") {
                Object.assign(target, to);
                if (global.AppState) global.AppState.notify();
                resolve();
                return;
            }
            new TWEEN.Tween(target)
                .to(to, duration)
                .easing(easing || TWEEN.Easing.Quadratic.InOut)
                .onUpdate(function () { if (global.AppState) global.AppState.notify(); })
                .onComplete(resolve)
                .start();
        });
    }

    var isSequenceRunning = false;
    var cmd = function (target, action, params) {
        if (global.CTCommandBus) global.CTCommandBus.execute({ source: "ui-console", target: target, action: action, params: params });
    };

    var runner = {
        isRunning: function () { return isSequenceRunning; },

        setInjectorSync: function (idx) {
            var state = global.AppState;
            if (!state || !state.gantry) return;
            cmd("gantry", "setField", { key: "injectorSyncIndex", value: state.gantry.injectorSyncIndex === idx ? -1 : idx });
        },

        addScanBatch: function () {
            var state = global.AppState;
            if (!state || !state.gantry || state.gantry.scanSequence.length >= 6 || isSequenceRunning) return;
            cmd("gantry", "setField", { key: "scanSequence", value: state.gantry.scanSequence.concat([{ mode: "helical", delay: 0 }]) });
        },

        removeScanBatch: function (idx) {
            var state = global.AppState;
            if (!state || !state.gantry || state.gantry.scanSequence.length <= 1 || isSequenceRunning) return;
            var seq = state.gantry.scanSequence.slice();
            seq.splice(idx, 1);
            cmd("gantry", "setField", { key: "scanSequence", value: seq });
        },

        updateBatchData: function (idx, key, val) {
            var state = global.AppState;
            if (!state || !state.gantry || !state.gantry.scanSequence[idx]) return;
            var seq = state.gantry.scanSequence.slice();
            seq[idx] = Object.assign({}, seq[idx], { [key]: val });
            cmd("gantry", "setField", { key: "scanSequence", value: seq });
            if (key === "mode") {
                if (typeof global.showInfoDialog === "function") global.showInfoDialog(val);
                if (idx === 0) cmd("gantry", "setField", { key: "currentScanMode", value: val });
            }
        },

        stopAutoSequence: function () {
            if (isSequenceRunning) cmd("gantry", "setField", { key: "cancelRequested", value: true });
        },

        runAutoSequence: async function () {
            var state = global.AppState;
            if (!state || !state.gantry || isSequenceRunning) return;

            isSequenceRunning = true;
            cmd("gantry", "setField", { key: "cancelRequested", value: false });
            cmd("couch", "moveY", { value: 0 });
            cmd("couch", "moveZ", { value: 0 });
            cmd("injector", "setA", { value: 0 });

            if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
            if (state.gantry.isScanning && typeof global.toggleScan === "function") global.toggleScan();

            await tweenPromise(state.couch, { y: 80 }, 2000);
            var seq = state.gantry.scanSequence;

            for (var i = 0; i < seq.length; i++) {
                if (state.gantry.cancelRequested) break;
                var batch = seq[i], mode = batch.mode, delay = batch.delay || 0;
                cmd("gantry", "setField", { key: "activeBatchIndex", value: i });
                cmd("gantry", "setField", { key: "currentScanMode", value: mode });

                for (var d = delay; d > 0; d--) {
                    if (state.gantry.cancelRequested) break;
                    cmd("gantry", "setField", { key: "countdown", value: d });
                    await wait(1000);
                }
                cmd("gantry", "setField", { key: "countdown", value: 0 });
                if (state.gantry.cancelRequested) break;

                if (state.gantry.injectorSyncIndex === i) tweenPromise(state.injector, { a: 100 }, 4000);

                var isScano = mode === "scano" || mode === "dual_scano";
                var isVol = mode === "volume" || mode === "dynamic" || mode === "real_prep";

                if (isScano) {
                    if (global.Meshes && global.Meshes.rotor) new TWEEN.Tween(global.Meshes.rotor.rotation).to({ z: 0 }, 1000).start();
                    await wait(1000);
                    if (state.gantry.cancelRequested) break;
                    await tweenPromise(state.couch, { z: 80 }, 1500);
                    if (state.gantry.cancelRequested) break;
                    if (typeof global.toggleXRay === "function") global.toggleXRay();
                    await tweenPromise(state.couch, { z: 20 }, 4000, typeof TWEEN !== "undefined" ? TWEEN.Easing.Linear.None : null);
                    if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
                } else {
                    if (!state.gantry.isScanning && typeof global.toggleScan === "function") {
                        global.toggleScan();
                        await wait(2000);
                    }
                    if (state.gantry.cancelRequested) break;

                    if (isVol) {
                        await tweenPromise(state.couch, { z: 70 }, 1500);
                        if (state.gantry.cancelRequested) break;
                        if (typeof global.toggleXRay === "function") global.toggleXRay();
                        await wait(4000);
                        if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
                    } else if (mode === "axial") {
                        await tweenPromise(state.couch, { z: 80 }, 1500);
                        for (var s = 0; s < 4; s++) {
                            if (state.gantry.cancelRequested) break;
                            if (typeof global.toggleXRay === "function") global.toggleXRay();
                            await wait(1000);
                            if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
                            if (s < 3 && !state.gantry.cancelRequested) {
                                await tweenPromise(state.couch, { z: 80 - 15 * (s + 1) }, 800);
                                await wait(200);
                            }
                        }
                    } else { // helical & 3d_landmark
                        await tweenPromise(state.couch, { z: 80 }, 1500);
                        if (state.gantry.cancelRequested) break;
                        if (typeof global.toggleXRay === "function") global.toggleXRay();
                        await tweenPromise(state.couch, { z: 20 }, 5000, typeof TWEEN !== "undefined" ? TWEEN.Easing.Linear.None : null);
                        if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
                    }
                }
                await wait(1000);
            }

            if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
            cmd("gantry", "setField", { key: "activeBatchIndex", value: -1 });
            cmd("gantry", "setField", { key: "countdown", value: 0 });

            if (state.gantry.isScanning && typeof global.toggleScan === "function") {
                global.toggleScan();
                await wait(2000);
            }

            await tweenPromise(state.couch, { z: 0 }, 2000);
            await tweenPromise(state.couch, { y: 0 }, 2000);

            var firstMode = (state.gantry.scanSequence[0] && state.gantry.scanSequence[0].mode) || "scano";
            cmd("gantry", "setField", { key: "currentScanMode", value: firstMode });
            cmd("gantry", "setField", { key: "cancelRequested", value: false });

            isSequenceRunning = false;
            if (typeof global.renderBatchUI === "function") global.renderBatchUI();
        }
    };

    global.CTSequenceRunner = runner;
    Object.assign(global, {
        addScanBatch: runner.addScanBatch, removeScanBatch: runner.removeScanBatch,
        updateBatchData: runner.updateBatchData, setInjectorSync: runner.setInjectorSync,
        runAutoSequence: runner.runAutoSequence, stopAutoSequence: runner.stopAutoSequence,
        tweenPromise: tweenPromise, wait: wait
    });
})(typeof window !== "undefined" ? window : this);
