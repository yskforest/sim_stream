(function attachCommandBus(global) {
    function fail(error) {
        return { success: false, error: error };
    }

    function withLog(command, result) {
        if (global.CTCommandLogService && typeof global.CTCommandLogService.add === 'function') {
            global.CTCommandLogService.add({
                source: command && command.source ? command.source : 'internal',
                command: command,
                result: result
            });
        }
        return result;
    }

    var bus = {
        execute: function execute(command) {
            if (!command || typeof command !== 'object') return withLog(command, fail('INVALID_COMMAND'));
            var target = command.target;
            var action = command.action;
            var params = command.params || {};

            if (target === 'couch') {
                if (!global.CouchSim) return withLog(command, fail('COUCH_SIM_UNAVAILABLE'));
                if (action === 'moveY') return withLog(command, global.CouchSim.moveToY(params.value));
                if (action === 'moveZ') return withLog(command, global.CouchSim.moveToZ(params.value));
                if (action === 'getState') return withLog(command, { success: true, state: (global.CTStore && global.CTStore.getState()) ? global.CTStore.getState().couch : null });
                return withLog(command, fail('UNKNOWN_COUCH_ACTION'));
            }

            if (target === 'injector') {
                if (!global.InjectorSim) return withLog(command, fail('INJECTOR_SIM_UNAVAILABLE'));
                if (action === 'setA') return withLog(command, global.InjectorSim.setContrastA(params.value));
                if (action === 'setB') return withLog(command, global.InjectorSim.setSalineB(params.value));
                if (action === 'getState') return withLog(command, { success: true, state: (global.CTStore && global.CTStore.getState()) ? global.CTStore.getState().injector : null });
                return withLog(command, fail('UNKNOWN_INJECTOR_ACTION'));
            }

            if (target === 'gantry') {
                if (!global.GantrySim) return withLog(command, fail('GANTRY_SIM_UNAVAILABLE'));
                if (action === 'setField') return withLog(command, global.CTStore.dispatch({ type: 'set', scope: 'gantry', key: params.key, value: params.value }));
                if (action === 'setDetectorRows') {
                    var allowedRows = (global.CTProfileService && global.CTProfileService.getDetectorRowsOptions)
                        ? global.CTProfileService.getDetectorRowsOptions()
                        : [320];
                    if (allowedRows.indexOf(params.value) === -1) {
                        return withLog(command, fail('INVALID_DETECTOR_ROWS'));
                    }
                    return withLog(command, global.GantrySim.setDetectorRows(params.value));
                }
                if (action === 'setScanning') return withLog(command, global.GantrySim.setScanning(params.value));
                if (action === 'setXrayVisible') return withLog(command, global.GantrySim.setXrayVisible(params.value));
                if (action === 'setRotorSpeed') return withLog(command, global.GantrySim.setRotorSpeed(params.value));
                if (action === 'getState') return withLog(command, { success: true, state: (global.CTStore && global.CTStore.getState()) ? global.CTStore.getState().gantry : null });
                return withLog(command, fail('UNKNOWN_GANTRY_ACTION'));
            }

            if (target === 'simulator') {
                if (action === 'setPatientVisible') {
                    if (!global.CTStore) return withLog(command, fail('STORE_UNAVAILABLE'));
                    var state = global.CTStore.getState();
                    state.patientVisible = !!params.value;
                    state.notify();
                    return withLog(command, { success: true, state: state });
                }
                if (action === 'getState') {
                    return withLog(command, { success: true, state: global.CTStore ? global.CTStore.getState() : null });
                }
                return withLog(command, fail('UNKNOWN_SIMULATOR_ACTION'));
            }

            return withLog(command, fail('UNKNOWN_TARGET'));
        }
    };

    global.CTCommandBus = bus;
})(window);
