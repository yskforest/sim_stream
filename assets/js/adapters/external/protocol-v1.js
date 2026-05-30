(function attachProtocolV1(global) {
    var TARGET_ACTIONS = {
        gantry: {
            setField: true,
            setDetectorRows: true,
            setScanning: true,
            setXrayVisible: true,
            setRotorSpeed: true,
            getState: true
        },
        couch: {
            moveY: true,
            moveZ: true,
            getState: true
        },
        injector: {
            setA: true,
            setB: true,
            getState: true
        },
        simulator: {
            setPatientVisible: true,
            getState: true
        }
    };

    function ok() {
        return { valid: true, error: null };
    }

    function fail(code, message) {
        return { valid: false, error: { code: code, message: message } };
    }

    function validateEnvelope(command) {
        if (!command || typeof command !== 'object') {
            return fail('VALIDATION_ERROR', 'Command must be an object.');
        }
        if (typeof command.target !== 'string' || typeof command.action !== 'string') {
            return fail('VALIDATION_ERROR', 'Command must include string target and action.');
        }
        if (!Object.prototype.hasOwnProperty.call(TARGET_ACTIONS, command.target)) {
            return fail('TARGET_NOT_FOUND', 'Unknown target.');
        }
        if (!TARGET_ACTIONS[command.target][command.action]) {
            return fail('UNSUPPORTED_ACTION', 'Action is not supported for target.');
        }
        if (command.params !== undefined && typeof command.params !== 'object') {
            return fail('VALIDATION_ERROR', 'params must be an object when provided.');
        }
        return ok();
    }

    global.CTProtocolV1 = {
        validateCommand: validateEnvelope
    };
})(window);
