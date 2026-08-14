// CT 3D Simulator - Sequence Runner & Batch Management Service
(function attachSequenceRunner(global) {
    "use strict";

    function wait(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function tweenPromise(target, to, duration, easing) {
        return new Promise(function (resolve) {
            if (typeof TWEEN === "undefined") {
                for (var k in to) {
                    if (Object.prototype.hasOwnProperty.call(to, k)) {
                        target[k] = to[k];
                    }
                }
                if (global.AppState && typeof global.AppState.notify === "function") {
                    global.AppState.notify();
                }
                resolve();
                return;
            }

            new TWEEN.Tween(target)
                .to(to, duration)
                .easing(easing || TWEEN.Easing.Quadratic.InOut)
                .onUpdate(function () {
                    if (global.AppState && typeof global.AppState.notify === "function") {
                        global.AppState.notify();
                    }
                })
                .onComplete(resolve)
                .start();
        });
    }

    var isSequenceRunning = false;

    var runner = {
        isRunning: function () {
            return isSequenceRunning;
        },

        // --- Batch Queue Management ---
        setInjectorSync: function (index) {
            var state = global.AppState;
            if (!state || !state.gantry) return;
            var current = state.gantry.injectorSyncIndex;
            var newVal = current === index ? -1 : index;
            if (global.CTCommandBus) {
                global.CTCommandBus.execute({
                    source: "ui-console",
                    target: "gantry",
                    action: "setField",
                    params: { key: "injectorSyncIndex", value: newVal },
                });
            }
        },

        addScanBatch: function () {
            var state = global.AppState;
            if (!state || !state.gantry) return;
            if (state.gantry.scanSequence.length >= 6 || isSequenceRunning) return;

            var newSeq = state.gantry.scanSequence.concat([{ mode: "helical", delay: 0 }]);
            if (global.CTCommandBus) {
                global.CTCommandBus.execute({
                    source: "ui-console",
                    target: "gantry",
                    action: "setField",
                    params: { key: "scanSequence", value: newSeq },
                });
            }
        },

        removeScanBatch: function (index) {
            var state = global.AppState;
            if (!state || !state.gantry) return;
            if (state.gantry.scanSequence.length <= 1 || isSequenceRunning) return;

            var newSeq = state.gantry.scanSequence.slice();
            newSeq.splice(index, 1);
            if (global.CTCommandBus) {
                global.CTCommandBus.execute({
                    source: "ui-console",
                    target: "gantry",
                    action: "setField",
                    params: { key: "scanSequence", value: newSeq },
                });
            }
        },

        updateBatchData: function (index, key, value) {
            var state = global.AppState;
            if (!state || !state.gantry) return;

            var newSeq = state.gantry.scanSequence.slice();
            if (!newSeq[index]) return;

            var updated = Object.assign({}, newSeq[index]);
            updated[key] = value;
            newSeq[index] = updated;

            if (global.CTCommandBus) {
                global.CTCommandBus.execute({
                    source: "ui-console",
                    target: "gantry",
                    action: "setField",
                    params: { key: "scanSequence", value: newSeq },
                });

                if (key === "mode") {
                    if (typeof global.showInfoDialog === "function") {
                        global.showInfoDialog(value);
                    }
                    if (index === 0) {
                        global.CTCommandBus.execute({
                            source: "ui-console",
                            target: "gantry",
                            action: "setField",
                            params: { key: "currentScanMode", value: value },
                        });
                    }
                }
            }
        },

        // --- Sequence Execution ---
        stopAutoSequence: function () {
            if (!isSequenceRunning) return;
            if (global.CTCommandBus) {
                global.CTCommandBus.execute({
                    source: "ui-console",
                    target: "gantry",
                    action: "setField",
                    params: { key: "cancelRequested", value: true },
                });
            }
        },

        runAutoSequence: async function () {
            var state = global.AppState;
            if (!state || !state.gantry || isSequenceRunning) return;

            isSequenceRunning = true;
            if (global.CTCommandBus) {
                global.CTCommandBus.execute({
                    source: "ui-console",
                    target: "gantry",
                    action: "setField",
                    params: { key: "cancelRequested", value: false },
                });
                global.CTCommandBus.execute({ source: "ui-console", target: "couch", action: "moveY", params: { value: 0 } });
                global.CTCommandBus.execute({ source: "ui-console", target: "couch", action: "moveZ", params: { value: 0 } });
                global.CTCommandBus.execute({ source: "ui-console", target: "injector", action: "setA", params: { value: 0 } });
            }

            if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
            if (state.gantry.isScanning && typeof global.toggleScan === "function") global.toggleScan();

            await tweenPromise(state.couch, { y: 80 }, 2000);

            var seq = state.gantry.scanSequence;

            for (var i = 0; i < seq.length; i++) {
                if (state.gantry.cancelRequested) break;

                var batch = seq[i];
                var mode = batch.mode;
                var delay = batch.delay || 0;
                var isSyncTarget = state.gantry.injectorSyncIndex === i;

                if (global.CTCommandBus) {
                    global.CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "activeBatchIndex", value: i } });
                    global.CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "currentScanMode", value: mode } });
                }

                if (delay > 0) {
                    for (var d = delay; d > 0; d--) {
                        if (state.gantry.cancelRequested) break;
                        if (global.CTCommandBus) {
                            global.CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "countdown", value: d } });
                        }
                        await wait(1000);
                    }
                    if (global.CTCommandBus) {
                        global.CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "countdown", value: 0 } });
                    }
                }

                if (state.gantry.cancelRequested) break;

                if (isSyncTarget) {
                    tweenPromise(state.injector, { a: 100 }, 4000);
                }

                var isScano = mode === "scano" || mode === "dual_scano";
                var isVolume = mode === "volume" || mode === "dynamic" || mode === "real_prep";
                var isHelicalLike = mode === "helical" || mode === "3d_landmark";

                if (isScano) {
                    if (global.Meshes && global.Meshes.rotor) {
                        new TWEEN.Tween(global.Meshes.rotor.rotation).to({ z: 0 }, 1000).start();
                    }
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

                    if (isHelicalLike) {
                        await tweenPromise(state.couch, { z: 80 }, 1500);
                        if (state.gantry.cancelRequested) break;

                        if (typeof global.toggleXRay === "function") global.toggleXRay();
                        await tweenPromise(state.couch, { z: 20 }, 5000, typeof TWEEN !== "undefined" ? TWEEN.Easing.Linear.None : null);
                        if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
                    } else if (isVolume) {
                        await tweenPromise(state.couch, { z: 70 }, 1500);
                        if (state.gantry.cancelRequested) break;

                        if (typeof global.toggleXRay === "function") global.toggleXRay();
                        await wait(4000);
                        if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();
                    } else if (mode === "axial") {
                        await tweenPromise(state.couch, { z: 80 }, 1500);
                        if (state.gantry.cancelRequested) break;

                        var steps = 4;
                        var startZ = 80;
                        var endZ = 20;
                        var stepDist = (startZ - endZ) / steps;

                        for (var step = 0; step < steps; step++) {
                            if (state.gantry.cancelRequested) break;
                            if (typeof global.toggleXRay === "function") global.toggleXRay();
                            await wait(1000);
                            if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") global.toggleXRay();

                            if (step < steps - 1 && !state.gantry.cancelRequested) {
                                var nextZ = startZ - stepDist * (step + 1);
                                await tweenPromise(state.couch, { z: nextZ }, 800);
                                await wait(200);
                            }
                        }
                    }
                }

                await wait(1000);
            }

            if (state.gantry.xrayVisible && typeof global.toggleXRay === "function") {
                global.toggleXRay();
            }

            if (global.CTCommandBus) {
                global.CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "activeBatchIndex", value: -1 } });
                global.CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "countdown", value: 0 } });
            }

            if (state.gantry.isScanning && typeof global.toggleScan === "function") {
                global.toggleScan();
                await wait(2000);
            }

            await tweenPromise(state.couch, { z: 0 }, 2000);
            await tweenPromise(state.couch, { y: 0 }, 2000);

            if (global.CTCommandBus) {
                var firstMode = (state.gantry.scanSequence[0] && state.gantry.scanSequence[0].mode) || "scano";
                global.CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "currentScanMode", value: firstMode } });
                global.CTCommandBus.execute({ source: "ui-console", target: "gantry", action: "setField", params: { key: "cancelRequested", value: false } });
            }

            isSequenceRunning = false;
            if (typeof global.renderBatchUI === "function") {
                global.renderBatchUI();
            }
        },
    };

    // Backward compatible globals for UI button inline onclicks
    global.CTSequenceRunner = runner;
    global.addScanBatch = runner.addScanBatch;
    global.removeScanBatch = runner.removeScanBatch;
    global.updateBatchData = runner.updateBatchData;
    global.setInjectorSync = runner.setInjectorSync;
    global.runAutoSequence = runner.runAutoSequence;
    global.stopAutoSequence = runner.stopAutoSequence;
    global.tweenPromise = tweenPromise;
    global.wait = wait;
})(typeof window !== "undefined" ? window : this);
