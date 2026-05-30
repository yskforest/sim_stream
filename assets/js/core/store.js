// Phase 1: thin store wrapper to decouple callers from direct AppState access.
(function attachStore(global) {
    var boundState = null;

    function invalid(message) {
        return { success: false, error: message };
    }

    var store = {
        bindState: function bindState(state) {
            boundState = state;
        },
        getState: function getState() {
            return boundState;
        },
        subscribe: function subscribe(listener) {
            if (!boundState || typeof boundState.subscribe !== "function") {
                return function noop() {};
            }
            return boundState.subscribe(listener);
        },
        dispatch: function dispatch(command) {
            if (!boundState) return invalid("STATE_NOT_BOUND");
            if (!command || typeof command !== "object") return invalid("INVALID_COMMAND");

            // Minimal command contract for phase-1 migration.
            if (command.type === "set") {
                var scope = command.scope;
                var key = command.key;
                var value = command.value;
                if (!scope || !key) return invalid("INVALID_SET_COMMAND");
                boundState.update(scope, key, value);
                return { success: true, state: boundState };
            }

            return invalid("UNSUPPORTED_COMMAND");
        },
    };

    global.CTStore = store;
})(window);
