(function attachExternalGateway(global) {
    function buildError(requestId, error) {
        if (global.CTProtocolV1 && typeof global.CTProtocolV1.buildError === "function") {
            return global.CTProtocolV1.buildError(requestId, error);
        }
        return {
            requestId: requestId || null,
            success: false,
            payload: null,
            error: error || { code: "INTERNAL_ERROR", message: "Unknown error." },
        };
    }

    function buildSuccess(requestId, payload) {
        if (global.CTProtocolV1 && typeof global.CTProtocolV1.buildSuccess === "function") {
            return global.CTProtocolV1.buildSuccess(requestId, payload);
        }
        return { requestId: requestId || null, success: true, payload: payload || null, error: null };
    }

    function detach(payload) {
        if (payload === undefined || payload === null) return payload;
        return JSON.parse(JSON.stringify(payload, function (key, value) {
            return typeof value === "function" ? undefined : value;
        }));
    }

    function execute(command) {
        var normalized = Object.assign({}, command || {});
        if (!normalized.source) normalized.source = "external";
        var requestId = normalized && normalized.requestId ? normalized.requestId : null;
        if (global.CTProtocolV1 && typeof global.CTProtocolV1.validateCommand === "function") {
            var checked = global.CTProtocolV1.validateCommand(normalized);
            if (!checked.valid) {
                return buildError(requestId, checked.error);
            }
        }
        if (!global.CTCommandBus) {
            return buildError(requestId, { code: "INTERNAL_ERROR", message: "COMMAND_BUS_UNAVAILABLE" });
        }
        var result = global.CTCommandBus.execute(normalized);
        if (!result || result.success === false) {
            return buildError(
                requestId,
                result && result.error
                    ? result.error
                    : { code: "INTERNAL_ERROR", message: "Command execution failed." },
            );
        }
        return buildSuccess(requestId, detach(result.state !== undefined ? result.state : result));
    }

    // Public API for console app integration.
    global.CTExternalGateway = {
        send: function send(command) {
            return execute(command);
        },
        getState: function getState() {
            var response = execute({ requestId: "state-" + Date.now(), target: "simulator", action: "getState" });
            if (response.success && global.CTStore && global.CTStore.getSnapshot) {
                response.payload = global.CTStore.getSnapshot();
            }
            return response;
        },
        subscribe: function subscribe(onStateChange) {
            if (typeof onStateChange !== "function") {
                return function noop() {};
            }
            if (!global.CTStore || typeof global.CTStore.subscribe !== "function") {
                return function noop() {};
            }
            return global.CTStore.subscribe(function (state) {
                var snapshot = global.CTStore.getSnapshot ? global.CTStore.getSnapshot() : state;
                onStateChange(buildSuccess(null, snapshot));
            });
        },
        diagnostics: {
            getRecentCommands: function getRecentCommands() {
                if (!global.CTCommandLogService) return [];
                return global.CTCommandLogService.list();
            },
            clearCommandLog: function clearCommandLog() {
                if (global.CTCommandLogService) global.CTCommandLogService.clear();
            },
        },
    };
})(typeof window !== "undefined" ? window : this);
