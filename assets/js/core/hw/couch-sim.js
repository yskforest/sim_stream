(function attachCouchSim(global) {
    function setField(key, value) {
        if (!global.CTStore) return { success: false, error: "STORE_UNAVAILABLE" };
        return global.CTStore.dispatch({ type: "set", scope: "couch", key: key, value: value });
    }

    var couchSim = {
        moveToY: function moveToY(percent) {
            return setField("y", percent);
        },
        moveToZ: function moveToZ(percent) {
            return setField("z", percent);
        },
    };

    global.CouchSim = couchSim;
})(window);
