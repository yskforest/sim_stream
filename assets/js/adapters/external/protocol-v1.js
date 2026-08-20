(function attachProtocolV1(global) {
    "use strict";

    function nowIso() {
        return new Date().toISOString();
    }

    function toErrorObject(error) {
        if (!error) return { code: "INTERNAL_ERROR", message: "Unknown error." };
        if (typeof error === "string") return { code: "INTERNAL_ERROR", message: error };
        if (!error.code) return { code: "INTERNAL_ERROR", message: error.message || "Unknown error." };
        return error;
    }

    global.CTProtocolV1 = {
        validateCommand: function validateCommand(command) {
            if (!global.CTCommandCatalog) {
                return { valid: false, error: { code: "INTERNAL_ERROR", message: "COMMAND_CATALOG_UNAVAILABLE" } };
            }
            return global.CTCommandCatalog.validate(command);
        },
        buildSuccess: function buildSuccess(requestId, payload) {
            return {
                requestId: requestId || null,
                success: true,
                timestamp: nowIso(),
                payload: payload === undefined ? null : payload,
                error: null
            };
        },
        buildError: function buildError(requestId, error) {
            return {
                requestId: requestId || null,
                success: false,
                timestamp: nowIso(),
                payload: null,
                error: toErrorObject(error)
            };
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
