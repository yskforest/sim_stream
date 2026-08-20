(function attachSimulatorService(global) {
    "use strict";

    function state() {
        return global.CTStore && global.CTStore.getState ? global.CTStore.getState() : null;
    }

    function ok(currentState) {
        return { success: true, state: currentState };
    }

    function fail(code, message) {
        return { success: false, error: { code: code, message: message } };
    }

    function setRoot(key, value) {
        if (!global.CTStore || !global.CTStore.setRoot) return fail("INTERNAL_ERROR", "STORE_UNAVAILABLE");
        return global.CTStore.setRoot(key, value);
    }

    function mountPatientModel(modelId) {
        var registry = global.CTModelRegistry;
        var group = global.Meshes && global.Meshes.patientGroup;
        if (!registry || !group) return;

        while (group.children.length > 0) group.remove(group.children[0]);
        registry.removeInstance("patient_primary");
        Promise.resolve(registry.spawnModelInstance(modelId, {
            instanceId: "patient_primary",
            attachTo: "couch",
            visible: state() ? state().patientVisible : true
        })).then(function (instance) {
            if (!instance) return;
            var current = state();
            if (!current) return;
            var position = instance.transform.position || [0, -0.1, 0.45];
            var rotation = instance.transform.rotation || [-90, 0, 0];
            var scale = instance.transform.scale || [1, 1, 1];
            setRoot("patientOffset", {
                x: position[0], y: position[1], z: position[2],
                rotX: rotation[0], rotY: rotation[1], rotZ: rotation[2],
                scaleX: scale[0], scaleY: scale[1], scaleZ: scale[2]
            });
        }).catch(function (error) {
            console.warn("Failed to change patient model:", error);
        });
    }

    var service = {
        setPatientVisible: function setPatientVisible(value) {
            return setRoot("patientVisible", !!value);
        },
        setPatientModel: function setPatientModel(modelId) {
            var fallback = global.CTModelsConfig && global.CTModelsConfig.getDefaultPatientId
                ? global.CTModelsConfig.getDefaultPatientId()
                : null;
            var selectedId = modelId || fallback;
            var result = setRoot("patientModelId", selectedId);
            if (result.success) mountPatientModel(selectedId);
            return result;
        },
        setPatientPosition: function setPatientPosition(params) {
            var current = state();
            if (!current) return fail("INTERNAL_ERROR", "STATE_NOT_BOUND");
            var previous = current.patientOffset || {};
            var defaults = { x: 0, y: -0.1, z: 0.45, rotX: -90, rotY: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };
            var next = Object.assign({}, defaults, previous);
            Object.keys(defaults).forEach(function (key) {
                if (typeof params[key] === "number") next[key] = params[key];
            });
            var result = setRoot("patientOffset", next);
            if (global.CTModelRegistry) {
                global.CTModelRegistry.updateInstanceTransform("patient_primary", {
                    position: [next.x, next.y, next.z],
                    rotation: [next.rotX, next.rotY, next.rotZ],
                    scale: [next.scaleX, next.scaleY, next.scaleZ]
                });
            }
            return result;
        },
        loadGlbModel: function loadGlbModel(params) {
            if (!global.CTModelRegistry || !params.path) {
                return fail("VALIDATION_ERROR", "params.path is required.");
            }
            global.CTModelRegistry.spawnModelInstance(params.id || "custom_glb", {
                path: params.path,
                attachTo: params.attachTo || "couch",
                position: params.position,
                rotation: params.rotation,
                scale: params.scale
            });
            return { success: true };
        },
        getState: function getState() {
            return ok(state());
        }
    };

    global.CTSimulatorService = service;
})(typeof window !== "undefined" ? window : globalThis);
