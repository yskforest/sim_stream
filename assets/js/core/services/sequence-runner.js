(function attachSequenceRunner(global) {
    "use strict";

    var isRunning = false;
    var wait = function (ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); };
    var command = function (target, action, params) {
        return global.CTCommandBus.execute({ source: "sequence", target: target, action: action, params: params || {} });
    };
    var currentState = function () { return global.CTStore && global.CTStore.getState(); };
    var cancelled = function () { var state = currentState(); return !state || state.gantry.cancelRequested; };

    function move(scope, key, value, duration, easing) {
        var state = currentState();
        if (!state || !state[scope]) return Promise.resolve();
        var cursor = { value: state[scope][key] };
        if (typeof TWEEN === "undefined") {
            global.CTStore.patch(scope, { [key]: value });
            return Promise.resolve();
        }
        return new Promise(function (resolve) {
            new TWEEN.Tween(cursor)
                .to({ value: value }, duration)
                .easing(easing || TWEEN.Easing.Quadratic.InOut)
                .onUpdate(function () { global.CTStore.patch(scope, { [key]: cursor.value }); })
                .onComplete(resolve)
                .start();
        });
    }

    function xray(visible) {
        command("gantry", "setXrayVisible", { value: visible });
    }

    async function perform(steps) {
        for (var i = 0; i < steps.length && !cancelled(); i++) {
            var step = steps[i];
            if (step.type === "wait") await wait(step.ms);
            if (step.type === "move") await move(step.scope, step.key, step.value, step.ms, step.easing);
            if (step.type === "xray") xray(step.value);
        }
    }

    var scanPlans = {
        scano: [
            { type: "wait", ms: 1000 },
            { type: "move", scope: "couch", key: "z", value: 80, ms: 1500 },
            { type: "xray", value: true },
            { type: "move", scope: "couch", key: "z", value: 20, ms: 4000, easing: function (k) { return k; } },
            { type: "xray", value: false }
        ],
        volume: [
            { type: "move", scope: "couch", key: "z", value: 70, ms: 1500 },
            { type: "xray", value: true },
            { type: "wait", ms: 4000 },
            { type: "xray", value: false }
        ],
        helical: [
            { type: "move", scope: "couch", key: "z", value: 80, ms: 1500 },
            { type: "xray", value: true },
            { type: "move", scope: "couch", key: "z", value: 20, ms: 5000, easing: function (k) { return k; } },
            { type: "xray", value: false }
        ]
    };

    async function runAxial() {
        await move("couch", "z", 80, 1500);
        for (var slice = 0; slice < 4 && !cancelled(); slice++) {
            xray(true); await wait(1000); xray(false);
            if (slice < 3 && !cancelled()) {
                await move("couch", "z", 80 - 15 * (slice + 1), 800);
                await wait(200);
            }
        }
    }

    async function runBatch(mode) {
        var isScano = mode === "scano" || mode === "dual_scano";
        if (!isScano && !currentState().gantry.isScanning) {
            command("gantry", "setScanning", { value: true });
            await wait(2000);
        }
        if (mode === "axial") return runAxial();
        if (isScano) return perform(scanPlans.scano);
        if (["volume", "dynamic", "real_prep"].indexOf(mode) >= 0) return perform(scanPlans.volume);
        return perform(scanPlans.helical);
    }

    var runner = {
        isRunning: function () { return isRunning; },
        setInjectorSync: function (index) {
            var state = currentState();
            if (!state || !state.gantry) return;
            command("gantry", "setField", { key: "injectorSyncIndex", value: state.gantry.injectorSyncIndex === index ? -1 : index });
        },
        addScanBatch: function () {
            var state = currentState();
            if (!state || state.gantry.scanSequence.length >= 6 || isRunning) return;
            command("gantry", "setField", { key: "scanSequence", value: state.gantry.scanSequence.concat([{ mode: "helical", delay: 0 }]) });
        },
        removeScanBatch: function (index) {
            var state = currentState();
            if (!state || state.gantry.scanSequence.length <= 1 || isRunning) return;
            command("gantry", "setField", { key: "scanSequence", value: state.gantry.scanSequence.filter(function (_, i) { return i !== index; }) });
        },
        updateBatchData: function (index, key, value) {
            var state = currentState();
            if (!state || !state.gantry.scanSequence[index]) return;
            var sequence = state.gantry.scanSequence.slice();
            sequence[index] = Object.assign({}, sequence[index], { [key]: value });
            command("gantry", "setField", { key: "scanSequence", value: sequence });
            if (key === "mode" && index === 0) command("gantry", "setField", { key: "currentScanMode", value: value });
        },
        stopAutoSequence: function () {
            if (isRunning) command("gantry", "setField", { key: "cancelRequested", value: true });
        },
        runAutoSequence: async function () {
            var state = currentState();
            if (!state || isRunning) return;
            isRunning = true;
            command("gantry", "setField", { key: "cancelRequested", value: false });
            command("gantry", "setXrayVisible", { value: false });
            command("gantry", "setScanning", { value: false });
            await move("couch", "y", 80, 2000);

            var sequence = state.gantry.scanSequence.slice();
            for (var i = 0; i < sequence.length && !cancelled(); i++) {
                var batch = sequence[i];
                command("gantry", "setField", { key: "activeBatchIndex", value: i });
                command("gantry", "setField", { key: "currentScanMode", value: batch.mode });
                for (var delay = batch.delay || 0; delay > 0 && !cancelled(); delay--) {
                    command("gantry", "setField", { key: "countdown", value: delay });
                    await wait(1000);
                }
                command("gantry", "setField", { key: "countdown", value: 0 });
                if (state.gantry.injectorSyncIndex === i) move("injector", "a", 100, 4000);
                await runBatch(batch.mode);
                await wait(1000);
            }

            xray(false);
            command("gantry", "setScanning", { value: false });
            command("gantry", "setField", { key: "activeBatchIndex", value: -1 });
            command("gantry", "setField", { key: "countdown", value: 0 });
            await move("couch", "z", 0, 2000);
            await move("couch", "y", 0, 2000);
            var firstMode = (state.gantry.scanSequence[0] && state.gantry.scanSequence[0].mode) || "scano";
            command("gantry", "setField", { key: "currentScanMode", value: firstMode });
            command("gantry", "setField", { key: "cancelRequested", value: false });
            isRunning = false;
        }
    };

    global.CTSequenceRunner = runner;
    Object.assign(global, {
        addScanBatch: runner.addScanBatch,
        removeScanBatch: runner.removeScanBatch,
        updateBatchData: runner.updateBatchData,
        setInjectorSync: runner.setInjectorSync,
        runAutoSequence: runner.runAutoSequence,
        stopAutoSequence: runner.stopAutoSequence
    });
})(typeof window !== "undefined" ? window : globalThis);
