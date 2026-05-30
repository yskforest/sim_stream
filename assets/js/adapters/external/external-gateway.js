(function attachExternalGateway(global) {
    function envelopeError(error) {
        return {
            success: false,
            error: error || { code: 'INTERNAL_ERROR', message: 'Unknown error.' }
        };
    }

    function execute(command) {
        if (global.CTProtocolV1 && typeof global.CTProtocolV1.validateCommand === 'function') {
            var checked = global.CTProtocolV1.validateCommand(command);
            if (!checked.valid) {
                return envelopeError(checked.error);
            }
        }
        if (!global.CTCommandBus) {
            return envelopeError({ code: 'INTERNAL_ERROR', message: 'COMMAND_BUS_UNAVAILABLE' });
        }
        var result = global.CTCommandBus.execute(command);
        if (!result || result.success === false) {
            return envelopeError(result && result.error ? result.error : { code: 'INTERNAL_ERROR', message: 'Command execution failed.' });
        }
        return result;
    }

    // Public API for console app integration.
    global.CTExternalGateway = {
        send: function send(command) {
            return execute(command);
        },
        getState: function getState() {
            return execute({ target: 'simulator', action: 'getState' });
        }
    };
})(window);
