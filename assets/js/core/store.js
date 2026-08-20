// Single owner for state mutation, subscriptions, and detached public snapshots.
(function attachStore(global) {
    var boundState = null;
    var listeners = [];

    function invalid(message) {
        return { success: false, error: message };
    }

    function notify() {
        listeners.slice().forEach(function (listener) { listener(boundState); });
    }

    function publicSnapshot() {
        if (!boundState) return null;
        return JSON.parse(JSON.stringify(boundState, function (key, value) {
            if (key === "listeners" || typeof value === "function") return undefined;
            return value;
        }));
    }

    var store = {
        bindState: function bindState(state) {
            boundState = state;
        },
        getState: function getState() {
            return boundState;
        },
        getSnapshot: publicSnapshot,
        subscribe: function subscribe(listener) {
            if (typeof listener !== "function") return function noop() {};
            listeners.push(listener);
            return function unsubscribe() {
                listeners = listeners.filter(function (candidate) { return candidate !== listener; });
            };
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
                if (!boundState[scope] || typeof boundState[scope] !== "object") return invalid("INVALID_STATE_SCOPE");
                boundState[scope][key] = value;
                notify();
                return { success: true, state: boundState };
            }

            return invalid("UNSUPPORTED_COMMAND");
        },
        setRoot: function setRoot(key, value) {
            if (!boundState || !key) return invalid("STATE_NOT_BOUND");
            boundState[key] = value;
            notify();
            return { success: true, state: boundState };
        },
        patch: function patch(scope, changes, options) {
            if (!boundState || !scope || !changes || typeof changes !== "object") {
                return invalid("INVALID_PATCH_COMMAND");
            }
            if (!boundState[scope] || typeof boundState[scope] !== "object") boundState[scope] = {};
            Object.assign(boundState[scope], changes);
            if (!options || !options.silent) notify();
            return { success: true, state: boundState };
        },
        notify: notify,
    };

    global.CTStore = store;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
