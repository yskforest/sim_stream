(function attachCommandCatalog(global) {
    "use strict";

    function valid() { return { valid: true, error: null }; }
    function invalid(message) {
        return { valid: false, error: { code: "VALIDATION_ERROR", message: message } };
    }
    function requireType(params, key, type) {
        return typeof params[key] === type ? valid() : invalid("params." + key + " must be a " + type + ".");
    }
    function optionalTypes(keys, type) {
        return function (params) {
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (params[key] !== undefined && typeof params[key] !== type) {
                    return invalid("params." + key + " must be a " + type + " when provided.");
                }
            }
            return valid();
        };
    }
    function value(type) { return function (params) { return requireType(params, "value", type); }; }
    function noParams() { return valid(); }
    function invoke(serviceName, methodName, args) {
        return function (context, params) {
            var service = context[serviceName];
            if (!service || typeof service[methodName] !== "function") {
                return { success: false, error: { code: "INTERNAL_ERROR", message: serviceName + "_UNAVAILABLE" } };
            }
            return service[methodName].apply(service, args ? args(params) : []);
        };
    }

    var numberValue = value("number");
    var booleanValue = value("boolean");
    var patientNumbers = optionalTypes(["x", "y", "z", "rotX", "rotY", "rotZ", "scaleX", "scaleY", "scaleZ"], "number");
    var distortionNumbers = optionalTypes(["k1", "k2", "k3", "k4", "fx", "fy", "cx", "cy", "zoom"], "number");
    var gantryFields = ["scanSequence", "activeBatchIndex", "currentScanMode", "injectorSyncIndex", "countdown", "cancelRequested", "isTranslucent"];

    function gantryField(params) {
        var checked = requireType(params, "key", "string");
        if (!checked.valid) return checked;
        return gantryFields.indexOf(params.key) >= 0
            ? valid()
            : { valid: false, error: { code: "UNSUPPORTED_FIELD", message: "Field is not writable through setField." } };
    }

    function streamParams(params) {
        if (params.codec !== undefined && ["h264", "mjpeg"].indexOf(params.codec) < 0) return invalid("params.codec must be 'h264' or 'mjpeg'.");
        if (params.protocol !== undefined && ["http", "rtsp"].indexOf(params.protocol) < 0) return invalid("params.protocol must be 'http' or 'rtsp'.");
        return optionalTypes(["fps", "width", "height", "quality", "hfov"], "number")(params);
    }

    function distortionParams(params) {
        if (params.enabled !== undefined && typeof params.enabled !== "boolean") return invalid("params.enabled must be a boolean when provided.");
        return distortionNumbers(params);
    }

    function cameraAngleParams(params) {
        return typeof params.value === "number" || typeof params.fov === "number" || typeof params.hfov === "number"
            ? valid()
            : invalid("Field value/fov/hfov must be a number.");
    }

    function cameraTransformParams(params) {
        if (params.position !== undefined && (!params.position || typeof params.position !== "object")) return invalid("params.position must be an object.");
        if (params.lookAt !== undefined && (!params.lookAt || typeof params.lookAt !== "object")) return invalid("params.lookAt must be an object.");
        return valid();
    }

    var definitions = {
        "gantry.setField": { validate: gantryField, run: invoke("GantrySim", "setField", function (p) { return [p.key, p.value]; }) },
        "gantry.setDetectorRows": { validate: numberValue, run: invoke("GantrySim", "setDetectorRows", function (p) { return [p.value]; }) },
        "gantry.setScanning": { validate: booleanValue, run: invoke("GantrySim", "setScanning", function (p) { return [p.value]; }) },
        "gantry.setXrayVisible": { validate: booleanValue, run: invoke("GantrySim", "setXrayVisible", function (p) { return [p.value]; }) },
        "gantry.setRotorSpeed": { validate: numberValue, run: invoke("GantrySim", "setRotorSpeed", function (p) { return [p.value]; }) },
        "gantry.getState": { validate: noParams, run: function (g) { return { success: true, state: g.CTStore.getState().gantry }; } },

        "couch.moveY": { validate: numberValue, run: invoke("CouchSim", "moveToY", function (p) { return [p.value]; }) },
        "couch.moveZ": { validate: numberValue, run: invoke("CouchSim", "moveToZ", function (p) { return [p.value]; }) },
        "couch.getState": { validate: noParams, run: function (g) { return { success: true, state: g.CTStore.getState().couch }; } },

        "injector.setA": { validate: numberValue, run: invoke("InjectorSim", "setContrastA", function (p) { return [p.value]; }) },
        "injector.setB": { validate: numberValue, run: invoke("InjectorSim", "setSalineB", function (p) { return [p.value]; }) },
        "injector.getState": { validate: noParams, run: function (g) { return { success: true, state: g.CTStore.getState().injector }; } },

        "simulator.setPatientVisible": { validate: booleanValue, run: invoke("CTSimulatorService", "setPatientVisible", function (p) { return [p.value]; }) },
        "simulator.setPatientModel": { validate: optionalTypes(["modelId"], "string"), run: invoke("CTSimulatorService", "setPatientModel", function (p) { return [p.modelId]; }) },
        "simulator.setPatientPosition": { validate: patientNumbers, run: invoke("CTSimulatorService", "setPatientPosition", function (p) { return [p]; }) },
        "simulator.loadGlbModel": { validate: function (p) { return requireType(p, "path", "string"); }, run: invoke("CTSimulatorService", "loadGlbModel", function (p) { return [p]; }) },
        "simulator.getState": { validate: noParams, run: invoke("CTSimulatorService", "getState") },

        "camera.startStream": { validate: streamParams, run: invoke("CameraSim", "startStream", function (p) { return [p]; }) },
        "camera.stopStream": { validate: noParams, run: invoke("CameraSim", "stopStream") },
        "camera.getStreamUrl": { validate: noParams, run: invoke("CameraSim", "getStreamUrl") },
        "camera.setDistortion": { validate: distortionParams, run: invoke("CameraSim", "setDistortion", function (p) { return [p]; }) },
        "camera.setTransform": { validate: cameraTransformParams, run: invoke("CameraSim", "setTransform", function (p) { return [p.position, p.lookAt]; }) },
        "camera.setVirtualTransform": { validate: cameraTransformParams, run: invoke("CameraSim", "setVirtualTransform", function (p) { return [p.position, p.lookAt]; }) },
        "camera.setFov": { validate: cameraAngleParams, run: invoke("CameraSim", "setFov", function (p) { return [typeof p.value === "number" ? p.value : p.fov]; }) },
        "camera.setHFov": { validate: cameraAngleParams, run: invoke("CameraSim", "setHFov", function (p) { return [typeof p.value === "number" ? p.value : p.hfov]; }) },
        "camera.getState": { validate: noParams, run: invoke("CameraSim", "getState") }
    };

    function get(command) {
        return command && definitions[command.target + "." + command.action];
    }

    global.CTCommandCatalog = {
        definitions: definitions,
        get: get,
        validate: function validate(command) {
            if (!command || typeof command !== "object") return invalid("Command must be an object.");
            if (command.requestId !== undefined && typeof command.requestId !== "string") return invalid("requestId must be a string when provided.");
            if (typeof command.target !== "string" || typeof command.action !== "string") return invalid("Command must include string target and action.");
            var targetExists = Object.keys(definitions).some(function (key) { return key.indexOf(command.target + ".") === 0; });
            if (!targetExists) return { valid: false, error: { code: "TARGET_NOT_FOUND", message: "Unknown target." } };
            var spec = get(command);
            if (!spec) return { valid: false, error: { code: "UNSUPPORTED_ACTION", message: "Action is not supported for target." } };
            if (command.params !== undefined && (!command.params || typeof command.params !== "object" || Array.isArray(command.params))) {
                return invalid("params must be an object when provided.");
            }
            return spec.validate(command.params || {});
        },
        execute: function execute(context, command) {
            var spec = get(command);
            return spec ? spec.run(context, command.params || {}) : { success: false, error: { code: "UNSUPPORTED_ACTION", message: "Unsupported command." } };
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
