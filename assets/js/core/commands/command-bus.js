(function attachCommandBus(global) {
    "use strict";

    function withLog(command, result) {
        if (global.CTCommandLogService && typeof global.CTCommandLogService.add === "function") {
            global.CTCommandLogService.add({
                source: command && command.source ? command.source : "internal",
                command: command,
                result: result
            });
        }
        return result;
    }

    global.CTCommandBus = {
        execute: function execute(command) {
            if (!global.CTCommandCatalog) {
                return withLog(command, { success: false, error: { code: "INTERNAL_ERROR", message: "COMMAND_CATALOG_UNAVAILABLE" } });
            }
            var validation = global.CTCommandCatalog.validate(command);
            if (!validation.valid) return withLog(command, { success: false, error: validation.error });
            try {
                return withLog(command, global.CTCommandCatalog.execute(global, command));
            } catch (error) {
                return withLog(command, {
                    success: false,
                    error: { code: "INTERNAL_ERROR", message: error && error.message ? error.message : "Command execution failed." }
                });
            }
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
