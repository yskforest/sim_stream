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
        if (command.requestId !== undefined && typeof command.requestId !== 'string') {
            return fail('VALIDATION_ERROR', 'requestId must be a string when provided.');
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

    function validateParams(command) {
        var p = command.params || {};
        if (command.target === 'couch' && (command.action === 'moveY' || command.action === 'moveZ')) {
            if (typeof p.value !== 'number') return fail('VALIDATION_ERROR', 'params.value must be a number.');
        }
        if (command.target === 'injector' && (command.action === 'setA' || command.action === 'setB')) {
            if (typeof p.value !== 'number') return fail('VALIDATION_ERROR', 'params.value must be a number.');
        }
        if (command.target === 'gantry' && (command.action === 'setDetectorRows' || command.action === 'setRotorSpeed')) {
            if (typeof p.value !== 'number') return fail('VALIDATION_ERROR', 'params.value must be a number.');
        }
        if (command.target === 'gantry' && command.action === 'setScanning') {
            if (typeof p.value !== 'boolean') return fail('VALIDATION_ERROR', 'params.value must be a boolean.');
        }
        if (command.target === 'gantry' && command.action === 'setXrayVisible') {
            if (typeof p.value !== 'boolean') return fail('VALIDATION_ERROR', 'params.value must be a boolean.');
        }
        if (command.target === 'gantry' && command.action === 'setField') {
            if (typeof p.key !== 'string') return fail('VALIDATION_ERROR', 'params.key must be a string.');
        }
        if (command.target === 'simulator' && command.action === 'setPatientVisible') {
            if (typeof p.value !== 'boolean') return fail('VALIDATION_ERROR', 'params.value must be a boolean.');
        }
        return ok();
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function toErrorObject(error) {
        if (!error) return { code: 'INTERNAL_ERROR', message: 'Unknown error.' };
        if (typeof error === 'string') return { code: 'INTERNAL_ERROR', message: error };
        if (!error.code) return { code: 'INTERNAL_ERROR', message: error.message || 'Unknown error.' };
        return error;
    }

    function buildSuccess(requestId, payload) {
        return {
            requestId: requestId || null,
            success: true,
            timestamp: nowIso(),
            payload: payload || null,
            error: null
        };
    }

    function buildError(requestId, error) {
        return {
            requestId: requestId || null,
            success: false,
            timestamp: nowIso(),
            payload: null,
            error: toErrorObject(error)
        };
    }

    global.CTProtocolV1 = {
        validateCommand: function validateCommand(command) {
            var env = validateEnvelope(command);
            if (!env.valid) return env;
            return validateParams(command);
        },
        buildSuccess: buildSuccess,
        buildError: buildError
    };
})(window);
