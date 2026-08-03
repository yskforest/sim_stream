(function attachCommandBus(global) {
    function fail(error) {
        return { success: false, error: error };
    }

    function withLog(command, result) {
        if (global.CTCommandLogService && typeof global.CTCommandLogService.add === "function") {
            global.CTCommandLogService.add({
                source: command && command.source ? command.source : "internal",
                command: command,
                result: result,
            });
        }
        return result;
    }

    function getG() {
        return global || (typeof window !== "undefined" ? window : null) || (typeof globalThis !== "undefined" ? globalThis : null);
    }

    var bus = {
        execute: function execute(command) {
            if (!command || typeof command !== "object") return withLog(command, fail("INVALID_COMMAND"));
            var g = getG();
            var target = command.target;
            var action = command.action;
            var params = command.params || {};

            if (target === "couch") {
                if (!g.CouchSim) return withLog(command, fail("COUCH_SIM_UNAVAILABLE"));
                if (action === "moveY") return withLog(command, g.CouchSim.moveToY(params.value));
                if (action === "moveZ") return withLog(command, g.CouchSim.moveToZ(params.value));
                if (action === "getState")
                    return withLog(command, {
                        success: true,
                        state: g.CTStore && g.CTStore.getState ? g.CTStore.getState().couch : null,
                    });
                return withLog(command, fail("UNKNOWN_COUCH_ACTION"));
            }

            if (target === "injector") {
                if (!g.InjectorSim) return withLog(command, fail("INJECTOR_SIM_UNAVAILABLE"));
                if (action === "setA") return withLog(command, g.InjectorSim.setContrastA(params.value));
                if (action === "setB") return withLog(command, g.InjectorSim.setSalineB(params.value));
                if (action === "getState")
                    return withLog(command, {
                        success: true,
                        state: g.CTStore && g.CTStore.getState ? g.CTStore.getState().injector : null,
                    });
                return withLog(command, fail("UNKNOWN_INJECTOR_ACTION"));
            }

            if (target === "gantry") {
                if (!g.GantrySim) return withLog(command, fail("GANTRY_SIM_UNAVAILABLE"));
                if (action === "setScanning") return withLog(command, g.GantrySim.setScanning(params.value));
                if (action === "setRotorSpeed") return withLog(command, g.GantrySim.setRotorSpeed(params.value));
                if (action === "setXrayVisible") return withLog(command, g.GantrySim.setXrayVisible(params.value));
                if (action === "setField") return withLog(command, g.GantrySim.setField(params.key, params.value));
                if (action === "getState")
                    return withLog(command, {
                        success: true,
                        state: g.CTStore && g.CTStore.getState ? g.CTStore.getState().gantry : null,
                    });
                return withLog(command, fail("UNKNOWN_GANTRY_ACTION"));
            }

            if (target === "simulator") {
                var state = (g.CTStore && typeof g.CTStore.getState === "function" ? g.CTStore.getState() : null) || g.AppState || (g.window ? g.window.AppState : null);
                if (!state) return withLog(command, fail("STATE_NOT_BOUND"));
                if (action === "setPatientVisible") {
                    state.patientVisible = !!params.value;
                    if (typeof state.notify === "function") state.notify();
                    return withLog(command, { success: true, state: state });
                }
                if (action === "setPatientModel") {
                    var defaultId = (g.CTModelsConfig && typeof g.CTModelsConfig.getDefaultPatientId === "function")
                        ? g.CTModelsConfig.getDefaultPatientId()
                        : null;
                    state.patientModelId = params.modelId || defaultId;
                    if (typeof g.changePatientGlbModel === "function") {
                        g.changePatientGlbModel(state.patientModelId);
                    }
                    if (typeof state.notify === "function") state.notify();
                    return withLog(command, { success: true, state: state });
                }
                if (action === "setPatientPosition") {
                    if (!state.patientOffset) state.patientOffset = { x: 0, y: -0.1, z: 0.45, rotX: -90, rotY: 0, rotZ: 0 };
                    if (typeof params.x === "number") state.patientOffset.x = params.x;
                    if (typeof params.y === "number") state.patientOffset.y = params.y;
                    if (typeof params.z === "number") state.patientOffset.z = params.z;
                    if (typeof params.rotX === "number") state.patientOffset.rotX = params.rotX;
                    if (typeof params.rotY === "number") state.patientOffset.rotY = params.rotY;
                    if (typeof params.rotZ === "number") state.patientOffset.rotZ = params.rotZ;

                    if (g.CTModelRegistry) {
                        g.CTModelRegistry.updateInstanceTransform("patient_primary", {
                            position: [state.patientOffset.x, state.patientOffset.y, state.patientOffset.z],
                            rotation: [
                                typeof state.patientOffset.rotX === "number" ? state.patientOffset.rotX : -90,
                                typeof state.patientOffset.rotY === "number" ? state.patientOffset.rotY : 0,
                                typeof state.patientOffset.rotZ === "number" ? state.patientOffset.rotZ : 0
                            ]
                        });
                    }
                    if (typeof state.notify === "function") state.notify();
                    return withLog(command, { success: true, state: state });
                }
                if (action === "loadGlbModel") {
                    if (g.CTModelRegistry && params.path) {
                        g.CTModelRegistry.spawnModelInstance(params.id || "custom_glb", {
                            path: params.path,
                            attachTo: params.attachTo || "couch",
                            position: params.position,
                            rotation: params.rotation,
                            scale: params.scale
                        });
                        return withLog(command, { success: true });
                    }
                    return withLog(command, fail("INVALID_MODEL_PARAMS"));
                }
                if (action === "getState") {
                    return withLog(command, {
                        success: true,
                        state: g.CTStore ? g.CTStore.getState() : null,
                    });
                }
                return withLog(command, fail("UNKNOWN_SIMULATOR_ACTION"));
            }

            if (target === "camera") {
                if (!global.CameraSim) return withLog(command, fail("CAMERA_SIM_UNAVAILABLE"));
                if (action === "startStream") return withLog(command, global.CameraSim.startStream(params));
                if (action === "stopStream") return withLog(command, global.CameraSim.stopStream());
                if (action === "getStreamUrl") return withLog(command, global.CameraSim.getStreamUrl());
                if (action === "setDistortion") return withLog(command, global.CameraSim.setDistortion(params));
                if (action === "getState")
                    return withLog(command, {
                        success: true,
                        state: global.CameraSim.getState(),
                    });
                return withLog(command, fail("UNKNOWN_CAMERA_ACTION"));
            }

            return withLog(command, fail("UNKNOWN_TARGET"));
        },
    };

    global.CTCommandBus = bus;
})(typeof window !== "undefined" ? window : this);
