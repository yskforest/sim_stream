(function attachGantrySim(global) {
    function setField(key, value) {
        if (!global.CTStore) return { success: false, error: "STORE_UNAVAILABLE" };
        return global.CTStore.dispatch({ type: "set", scope: "gantry", key: key, value: value });
    }

    var gantrySim = {
        setDetectorRows: function setDetectorRows(rows) {
            return setField("detectorRows", rows);
        },
        setXrayVisible: function setXrayVisible(visible) {
            return setField("xrayVisible", !!visible);
        },
        setScanning: function setScanning(scanning) {
            return setField("isScanning", !!scanning);
        },
        setRotorSpeed: function setRotorSpeed(rpm) {
            return setField("rotorSpeed", rpm);
        },
        setField: setField,
    };

    global.GantrySim = gantrySim;
})(window);
