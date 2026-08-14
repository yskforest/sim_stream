(function attachProtocolV1(global) {
    var TARGET_ACTIONS = {
        gantry: {
            setField: true,
            setDetectorRows: true,
            setScanning: true,
            setXrayVisible: true,
            setRotorSpeed: true,
            getState: true,
        },
        couch: {
            moveY: true,
            moveZ: true,
            getState: true,
        },
        injector: {
            setA: true,
            setB: true,
            getState: true,
        },
        simulator: {
            setPatientVisible: true,
            setPatientModel: true,
            setPatientPosition: true,
            loadGlbModel: true,
            getState: true,
        },
        camera: {
            startStream: true,
            stopStream: true,
            getStreamUrl: true,
            setDistortion: true,
            setTransform: true,
            setVirtualTransform: true,
            setFov: true,
            setHFov: true,
            getState: true,
        },
    };

    function ok() {
        return { valid: true, error: null };
    }

    function fail(code, message) {
        return { valid: false, error: { code: code, message: message } };
    }

    function validateEnvelope(command) {
        if (!command || typeof command !== "object") {
            return fail("VALIDATION_ERROR", "Command must be an object.");
        }
        if (command.requestId !== undefined && typeof command.requestId !== "string") {
            return fail("VALIDATION_ERROR", "requestId must be a string when provided.");
        }
        if (typeof command.target !== "string" || typeof command.action !== "string") {
            return fail("VALIDATION_ERROR", "Command must include string target and action.");
        }
        if (!Object.prototype.hasOwnProperty.call(TARGET_ACTIONS, command.target)) {
            return fail("TARGET_NOT_FOUND", "Unknown target.");
        }
        if (!TARGET_ACTIONS[command.target][command.action]) {
            return fail("UNSUPPORTED_ACTION", "Action is not supported for target.");
        }
        if (command.params !== undefined && typeof command.params !== "object") {
            return fail("VALIDATION_ERROR", "params must be an object when provided.");
        }
        return ok();
    }

    function validateParams(command) {
        var p = command.params || {};
        if (command.target === "couch" && (command.action === "moveY" || command.action === "moveZ")) {
            if (typeof p.value !== "number") return fail("VALIDATION_ERROR", "params.value must be a number.");
        }
        if (command.target === "injector" && (command.action === "setA" || command.action === "setB")) {
            if (typeof p.value !== "number") return fail("VALIDATION_ERROR", "params.value must be a number.");
        }
        if (
            command.target === "gantry" &&
            (command.action === "setDetectorRows" || command.action === "setRotorSpeed")
        ) {
            if (typeof p.value !== "number") return fail("VALIDATION_ERROR", "params.value must be a number.");
        }
        if (command.target === "gantry" && command.action === "setScanning") {
            if (typeof p.value !== "boolean") return fail("VALIDATION_ERROR", "params.value must be a boolean.");
        }
        if (command.target === "gantry" && command.action === "setXrayVisible") {
            if (typeof p.value !== "boolean") return fail("VALIDATION_ERROR", "params.value must be a boolean.");
        }
        if (command.target === "gantry" && command.action === "setField") {
            if (typeof p.key !== "string") return fail("VALIDATION_ERROR", "params.key must be a string.");
        }
        if (command.target === "simulator" && command.action === "setPatientVisible") {
            if (typeof p.value !== "boolean") return fail("VALIDATION_ERROR", "params.value must be a boolean.");
        }
        if (command.target === "simulator" && command.action === "setPatientModel") {
            if (p.modelId !== undefined && typeof p.modelId !== "string") {
                return fail("VALIDATION_ERROR", "params.modelId must be a string when provided.");
            }
        }
        if (command.target === "simulator" && command.action === "setPatientPosition") {
            var numKeys = ["x", "y", "z", "rotX", "rotY", "rotZ", "scaleX", "scaleY", "scaleZ"];
            for (var i = 0; i < numKeys.length; i++) {
                var k = numKeys[i];
                if (p[k] !== undefined && typeof p[k] !== "number") {
                    return fail("VALIDATION_ERROR", "params." + k + " must be a number when provided.");
                }
            }
        }
        if (command.target === "camera" && command.action === "startStream") {
            if (p.codec !== undefined && p.codec !== "h264" && p.codec !== "mjpeg") {
                return fail("VALIDATION_ERROR", "params.codec must be 'h264' or 'mjpeg'.");
            }
            if (p.protocol !== undefined && p.protocol !== "http" && p.protocol !== "rtsp") {
                return fail("VALIDATION_ERROR", "params.protocol must be 'http' or 'rtsp'.");
            }
            if (p.fps !== undefined && typeof p.fps !== "number") {
                return fail("VALIDATION_ERROR", "params.fps must be a number when provided.");
            }
        }
        if (command.target === "camera" && command.action === "setDistortion") {
            if (p.enabled !== undefined && typeof p.enabled !== "boolean") {
                return fail("VALIDATION_ERROR", "params.enabled must be a boolean when provided.");
            }
            var distNumKeys = ["k1", "k2", "k3", "k4", "fx", "fy", "cx", "cy", "zoom"];
            for (var j = 0; j < distNumKeys.length; j++) {
                var dk = distNumKeys[j];
                if (p[dk] !== undefined && typeof p[dk] !== "number") {
                    return fail("VALIDATION_ERROR", "params." + dk + " must be a number when provided.");
                }
            }
        }
        if (command.target === "camera" && (command.action === "setFov" || command.action === "setHFov")) {
            if (typeof p.value !== "number" && typeof p.fov !== "number" && typeof p.hfov !== "number") {
                return fail("VALIDATION_ERROR", "Field value/fov/hfov must be a number.");
            }
        }
        if (command.target === "camera" && (command.action === "setTransform" || command.action === "setVirtualTransform")) {
            if (p.position && typeof p.position !== "object") {
                return fail("VALIDATION_ERROR", "params.position must be an object.");
            }
            if (p.lookAt && typeof p.lookAt !== "object") {
                return fail("VALIDATION_ERROR", "params.lookAt must be an object.");
            }
        }
        return ok();
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function toErrorObject(error) {
        if (!error) return { code: "INTERNAL_ERROR", message: "Unknown error." };
        if (typeof error === "string") return { code: "INTERNAL_ERROR", message: error };
        if (!error.code) return { code: "INTERNAL_ERROR", message: error.message || "Unknown error." };
        return error;
    }

    function buildSuccess(requestId, payload) {
        return {
            requestId: requestId || null,
            success: true,
            timestamp: nowIso(),
            payload: payload || null,
            error: null,
        };
    }

    function buildError(requestId, error) {
        return {
            requestId: requestId || null,
            success: false,
            timestamp: nowIso(),
            payload: null,
            error: toErrorObject(error),
        };
    }

    global.CTProtocolV1 = {
        validateCommand: function validateCommand(command) {
            var env = validateEnvelope(command);
            if (!env.valid) return env;
            return validateParams(command);
        },
        buildSuccess: buildSuccess,
        buildError: buildError,
    };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
