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
    function define(validate, run, params, description) {
        return { validate: validate, run: run, docs: { params: params, description: description } };
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
        "gantry.setField": define(gantryField, invoke("GantrySim", "setField", function (p) { return [p.key, p.value]; }), "key: string, value: any", "許可された内部進行状態を更新"),
        "gantry.setDetectorRows": define(numberValue, invoke("GantrySim", "setDetectorRows", function (p) { return [p.value]; }), "value: number", "検出器列数を設定"),
        "gantry.setScanning": define(booleanValue, invoke("GantrySim", "setScanning", function (p) { return [p.value]; }), "value: boolean", "スキャン動作を開始・停止"),
        "gantry.setXrayVisible": define(booleanValue, invoke("GantrySim", "setXrayVisible", function (p) { return [p.value]; }), "value: boolean", "X線ビームの表示を切替"),
        "gantry.setRotorSpeed": define(numberValue, invoke("GantrySim", "setRotorSpeed", function (p) { return [p.value]; }), "value: number", "回転速度（rpm）を設定"),
        "gantry.getState": define(noParams, function (g) { return { success: true, state: g.CTStore.getState().gantry }; }, "なし", "ガントリ状態を取得"),

        "couch.moveY": define(numberValue, invoke("CouchSim", "moveToY", function (p) { return [p.value]; }), "value: number", "寝台の上下位置を変更"),
        "couch.moveZ": define(numberValue, invoke("CouchSim", "moveToZ", function (p) { return [p.value]; }), "value: number", "寝台の前後位置を変更"),
        "couch.getState": define(noParams, function (g) { return { success: true, state: g.CTStore.getState().couch }; }, "なし", "寝台状態を取得"),

        "injector.setA": define(numberValue, invoke("InjectorSim", "setContrastA", function (p) { return [p.value]; }), "value: number", "A剤（造影剤）注入量を設定"),
        "injector.setB": define(numberValue, invoke("InjectorSim", "setSalineB", function (p) { return [p.value]; }), "value: number", "B剤（生理食塩水）注入量を設定"),
        "injector.getState": define(noParams, function (g) { return { success: true, state: g.CTStore.getState().injector }; }, "なし", "インジェクタ状態を取得"),

        "simulator.setPatientVisible": define(booleanValue, invoke("CTSimulatorService", "setPatientVisible", function (p) { return [p.value]; }), "value: boolean", "患者モデルの表示を切替"),
        "simulator.setPatientModel": define(optionalTypes(["modelId"], "string"), invoke("CTSimulatorService", "setPatientModel", function (p) { return [p.modelId]; }), "modelId?: string", "患者モデルを選択"),
        "simulator.setPatientPosition": define(patientNumbers, invoke("CTSimulatorService", "setPatientPosition", function (p) { return [p]; }), "x/y/z?, rotX/rotY/rotZ?, scaleX/scaleY/scaleZ?: number", "患者モデルの9-DOFを変更"),
        "simulator.loadGlbModel": define(function (p) { return requireType(p, "path", "string"); }, invoke("CTSimulatorService", "loadGlbModel", function (p) { return [p]; }), "path: string, id/attachTo?: string, position/rotation/scale?: Array", "GLBモデルを動的に読込"),
        "simulator.getState": define(noParams, invoke("CTSimulatorService", "getState"), "なし", "シミュレータ全体状態を取得"),

        "camera.startStream": define(streamParams, invoke("CameraSim", "startStream", function (p) { return [p]; }), "codec/protocol?: string, fps/width/height/quality/hfov?: number", "映像配信を開始"),
        "camera.stopStream": define(noParams, invoke("CameraSim", "stopStream"), "なし", "映像配信を停止"),
        "camera.getStreamUrl": define(noParams, invoke("CameraSim", "getStreamUrl"), "なし", "配信URLを取得"),
        "camera.setDistortion": define(distortionParams, invoke("CameraSim", "setDistortion", function (p) { return [p]; }), "enabled?: boolean, k1/k2/k3/k4/fx/fy/cx/cy/zoom?: number", "魚眼歪曲パラメータを更新"),
        "camera.setTransform": define(cameraTransformParams, invoke("CameraSim", "setTransform", function (p) { return [p.position, p.lookAt]; }), "position/lookAt?: {x,y,z}", "メインカメラの位置と注視点を設定"),
        "camera.setVirtualTransform": define(cameraTransformParams, invoke("CameraSim", "setVirtualTransform", function (p) { return [p.position, p.lookAt]; }), "position/lookAt?: {x,y,z}", "仮想カメラの位置と注視点を設定"),
        "camera.setFov": define(cameraAngleParams, invoke("CameraSim", "setFov", function (p) { return [typeof p.value === "number" ? p.value : p.fov]; }), "value または fov: number", "垂直画角を設定"),
        "camera.setHFov": define(cameraAngleParams, invoke("CameraSim", "setHFov", function (p) { return [typeof p.value === "number" ? p.value : p.hfov]; }), "value または hfov: number", "水平画角を設定"),
        "camera.getState": define(noParams, invoke("CameraSim", "getState"), "なし", "カメラ・配信・歪曲状態を取得")
    };

    function get(command) {
        return command && definitions[command.target + "." + command.action];
    }

    export const CTCommandCatalog = {
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
