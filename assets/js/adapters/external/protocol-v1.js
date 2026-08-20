import { CTCommandCatalog } from "../../core/commands/command-catalog.js";

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

    export const CTProtocolV1 = {
        validateCommand: function validateCommand(command) {
            return CTCommandCatalog.validate(command);
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
