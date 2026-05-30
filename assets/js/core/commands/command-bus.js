(function attachCommandBus(global) {
    function fail(error) {
        return { success: false, error: error };
    }

    var bus = {
        execute: function execute(command) {
            if (!command || typeof command !== 'object') return fail('INVALID_COMMAND');
            var target = command.target;
            var action = command.action;
            var params = command.params || {};

            if (target === 'couch') {
                if (!global.CouchSim) return fail('COUCH_SIM_UNAVAILABLE');
                if (action === 'moveY') return global.CouchSim.moveToY(params.value);
                if (action === 'moveZ') return global.CouchSim.moveToZ(params.value);
                if (action === 'getState') return { success: true, state: (global.CTStore && global.CTStore.getState()) ? global.CTStore.getState().couch : null };
                return fail('UNKNOWN_COUCH_ACTION');
            }

            if (target === 'injector') {
                if (!global.InjectorSim) return fail('INJECTOR_SIM_UNAVAILABLE');
                if (action === 'setA') return global.InjectorSim.setContrastA(params.value);
                if (action === 'setB') return global.InjectorSim.setSalineB(params.value);
                if (action === 'getState') return { success: true, state: (global.CTStore && global.CTStore.getState()) ? global.CTStore.getState().injector : null };
                return fail('UNKNOWN_INJECTOR_ACTION');
            }

            if (target === 'gantry') {
                if (!global.GantrySim) return fail('GANTRY_SIM_UNAVAILABLE');
                if (action === 'setField') return global.CTStore.dispatch({ type: 'set', scope: 'gantry', key: params.key, value: params.value });
                if (action === 'setDetectorRows') return global.GantrySim.setDetectorRows(params.value);
                if (action === 'setScanning') return global.GantrySim.setScanning(params.value);
                if (action === 'setXrayVisible') return global.GantrySim.setXrayVisible(params.value);
                if (action === 'setRotorSpeed') return global.GantrySim.setRotorSpeed(params.value);
                if (action === 'getState') return { success: true, state: (global.CTStore && global.CTStore.getState()) ? global.CTStore.getState().gantry : null };
                return fail('UNKNOWN_GANTRY_ACTION');
            }

            if (target === 'simulator') {
                if (action === 'setPatientVisible') {
                    if (!global.CTStore) return fail('STORE_UNAVAILABLE');
                    var state = global.CTStore.getState();
                    state.patientVisible = !!params.value;
                    state.notify();
                    return { success: true, state: state };
                }
                if (action === 'getState') {
                    return { success: true, state: global.CTStore ? global.CTStore.getState() : null };
                }
                return fail('UNKNOWN_SIMULATOR_ACTION');
            }

            return fail('UNKNOWN_TARGET');
        }
    };

    global.CTCommandBus = bus;
})(window);
