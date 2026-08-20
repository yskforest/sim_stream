    var MAX_ENTRIES = 500;
    var entries = [];
    var listeners = [];

    function emit(entry) {
        listeners.forEach(function (listener) {
            try {
                listener(entry);
            } catch (e) {
                // Keep logger non-blocking for main flow.
            }
        });
    }

    function push(entry) {
        entries.push(entry);
        if (entries.length > MAX_ENTRIES) {
            entries.shift();
        }
        emit(entry);
    }

    export const CTCommandLogService = {
        add: function add(entry) {
            push({
                timestamp: new Date().toISOString(),
                source: entry && entry.source ? entry.source : "unknown",
                command: entry && entry.command ? entry.command : null,
                result: entry && entry.result ? entry.result : null,
            });
        },
        list: function list() {
            return entries.slice();
        },
        clear: function clear() {
            entries = [];
        },
        subscribe: function subscribe(listener) {
            if (typeof listener !== "function") {
                return function noop() {};
            }
            listeners.push(listener);
            return function unsubscribe() {
                listeners = listeners.filter(function (cb) {
                    return cb !== listener;
                });
            };
        },
        exportJson: function exportJson() {
            return JSON.stringify(entries, null, 2);
        },
    };
