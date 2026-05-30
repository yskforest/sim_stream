(function attachSequenceService(global) {
    function run(target, action, params) {
        if (!global.CTCommandBus) {
            return { success: false, error: 'COMMAND_BUS_UNAVAILABLE' };
        }
        return global.CTCommandBus.execute({ target: target, action: action, params: params || {} });
    }

    var service = {
        setCancelRequested: function setCancelRequested(value) {
            return run('gantry', 'setField', { key: 'cancelRequested', value: !!value });
        },
        setActiveBatchIndex: function setActiveBatchIndex(value) {
            return run('gantry', 'setField', { key: 'activeBatchIndex', value: value });
        },
        setCurrentScanMode: function setCurrentScanMode(value) {
            return run('gantry', 'setField', { key: 'currentScanMode', value: value });
        },
        setCountdown: function setCountdown(value) {
            return run('gantry', 'setField', { key: 'countdown', value: value });
        },
        resetInitialHardwareState: function resetInitialHardwareState() {
            run('couch', 'moveY', { value: 0 });
            run('couch', 'moveZ', { value: 0 });
            run('injector', 'setA', { value: 0 });
        },
        finalizeState: function finalizeState(defaultMode) {
            service.setActiveBatchIndex(-1);
            service.setCountdown(0);
            service.setCurrentScanMode(defaultMode);
            service.setCancelRequested(false);
        }
    };

    global.CTSequenceService = service;
})(window);
