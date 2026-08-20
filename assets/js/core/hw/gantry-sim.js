(function attachGantrySim(global) {
    function setField(key, value) {
        if (!global.CTStore) return { success: false, error: "STORE_UNAVAILABLE" };
        return global.CTStore.dispatch({ type: "set", scope: "gantry", key: key, value: value });
    }

    var gantrySim = {
        setDetectorRows: function setDetectorRows(rows) {
            var options = global.CTProfileService && global.CTProfileService.getDetectorRowsOptions();
            if (options && options.indexOf(rows) < 0) {
                return { success: false, error: { code: "INVALID_DETECTOR_ROWS", message: "Detector rows are not supported by the active profile." } };
            }
            return setField("detectorRows", rows);
        },
        setXrayVisible: function setXrayVisible(visible) {
            return setField("xrayVisible", !!visible);
        },
        setScanning: function setScanning(scanning) {
            if (!global.CTStore || !global.CTStore.patch) return { success: false, error: "STORE_UNAVAILABLE" };
            return global.CTStore.patch("gantry", { isScanning: !!scanning, rotorSpeed: scanning ? 100 : 0 });
        },
        setRotorSpeed: function setRotorSpeed(rpm) {
            var capability = global.CTProfileService && global.CTProfileService.getAxisCapability("gantry", "rotorSpeed");
            if (capability && (rpm < capability.min || rpm > capability.max)) {
                return { success: false, error: { code: "VALIDATION_ERROR", message: "Rotor speed is outside the active profile range." } };
            }
            return setField("rotorSpeed", rpm);
        },
        setField: setField,
    };

    global.GantrySim = gantrySim;
})(window);
