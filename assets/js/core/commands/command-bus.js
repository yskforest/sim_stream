import { CTCommandCatalog } from "./command-catalog.js";
import { CTCommandLogService } from "../services/command-log-service.js";

"use strict";

    function withLog(command, result) {
        if (CTCommandLogService && typeof CTCommandLogService.add === "function") {
            CTCommandLogService.add({
                source: command && command.source ? command.source : "internal",
                command: command,
                result: result
            });
        }
        return result;
    }

    export const CTCommandBus = {
        execute: function execute(command) {
            var validation = CTCommandCatalog.validate(command);
            if (!validation.valid) return withLog(command, { success: false, error: validation.error });
            try {
                return withLog(command, CTCommandCatalog.execute(globalThis, command));
            } catch (error) {
                return withLog(command, {
                    success: false,
                    error: { code: "INTERNAL_ERROR", message: error && error.message ? error.message : "Command execution failed." }
                });
            }
        }
    };
