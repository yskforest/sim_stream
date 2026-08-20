const fs = require("fs");
const vm = require("vm");
const path = require("path");

function loadScript(ctx, relPath) {
    const p = path.resolve(__dirname, "..", relPath);
    const code = fs.readFileSync(p, "utf8")
        .replace(/^import\s+[^;]+;\s*$/gm, "")
        .replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g, "");
    vm.runInContext(code, ctx, { filename: p });
}

function assert(cond, message) {
    if (!cond) {
        throw new Error(message);
    }
}

const sandbox = {
    window: {},
    console,
    Date,
    setInterval,
    clearInterval,
    THREE: {
        Clock: function () {
            this.getDelta = function () {
                return 0.016;
            };
        },
        Timer: function () {
            this.getDelta = function () {
                return 0.016;
            };
            this.update = function () {};
        },
    },
};
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);

loadScript(ctx, "assets/js/core/commands/command-catalog.js");
loadScript(ctx, "assets/js/adapters/external/protocol-v1.js");

const proto = vm.runInContext("CTProtocolV1", ctx);
assert(proto, "CTProtocolV1 is not available");

const valid = proto.validateCommand({
    requestId: "req-1",
    target: "gantry",
    action: "setScanning",
    params: { value: true },
});
assert(valid.valid === true, "Expected valid command");

const invalidTarget = proto.validateCommand({
    requestId: "req-2",
    target: "unknown",
    action: "setScanning",
    params: { value: true },
});
assert(invalidTarget.valid === false, "Expected invalid target");
assert(invalidTarget.error.code === "TARGET_NOT_FOUND", "Expected TARGET_NOT_FOUND");

const invalidParam = proto.validateCommand({
    requestId: "req-3",
    target: "gantry",
    action: "setScanning",
    params: { value: 1 },
});
assert(invalidParam.valid === false, "Expected invalid param");
assert(invalidParam.error.code === "VALIDATION_ERROR", "Expected VALIDATION_ERROR");

// Camera stream command verification
const validCameraStream = proto.validateCommand({
    requestId: "req-cam-1",
    target: "camera",
    action: "startStream",
    params: { codec: "h264", protocol: "rtsp", fps: 30 },
});
assert(validCameraStream.valid === true, "Expected valid camera startStream command");

const invalidCameraCodec = proto.validateCommand({
    requestId: "req-cam-2",
    target: "camera",
    action: "startStream",
    params: { codec: "invalid_codec" },
});
assert(invalidCameraCodec.valid === false, "Expected invalid camera codec");
assert(invalidCameraCodec.error.code === "VALIDATION_ERROR", "Expected VALIDATION_ERROR for codec");

// Full integration mock test
loadScript(ctx, "assets/js/core/store.js");
loadScript(ctx, "assets/js/core/state.js");
loadScript(ctx, "assets/js/core/profile/default-profile.js");
loadScript(ctx, "assets/js/core/profile/profile-service.js");
ctx.CTProfileService.init(ctx.CTDefaultProfile);
loadScript(ctx, "assets/js/core/config/models-config.js");
loadScript(ctx, "assets/js/core/services/model-registry.js");
loadScript(ctx, "assets/js/core/hw/couch-sim.js");
loadScript(ctx, "assets/js/core/hw/gantry-sim.js");
loadScript(ctx, "assets/js/core/hw/injector-sim.js");
loadScript(ctx, "assets/js/core/hw/camera-sim.js");
loadScript(ctx, "assets/js/core/services/video-stream-service.js");
loadScript(ctx, "assets/js/core/services/simulator-service.js");
loadScript(ctx, "assets/js/core/services/command-log-service.js");
loadScript(ctx, "assets/js/core/commands/command-bus.js");
loadScript(ctx, "assets/js/adapters/external/external-gateway.js");

ctx.CTStore.bindState(ctx.AppState);

const targetModelId = ctx.CTModelsConfig.getDefaultPatientId();

const validGlbModel = proto.validateCommand({
    requestId: "req-glb-1",
    target: "simulator",
    action: "setPatientModel",
    params: { modelId: targetModelId },
});
assert(validGlbModel.valid === true, "Expected valid setPatientModel command");

const gatewayGlbRes = ctx.CTExternalGateway.send({
    requestId: "req-glb-2",
    target: "simulator",
    action: "setPatientModel",
    params: { modelId: targetModelId },
});
assert(gatewayGlbRes.success === true, "Expected gateway.send success for setPatientModel");

// Test setPatientPosition (9-DOF)
const validPatientPos = proto.validateCommand({
    requestId: "req-pos-1",
    target: "simulator",
    action: "setPatientPosition",
    params: { x: 0.1, y: -0.2, z: 0.5, rotX: -90, rotY: 10, rotZ: 0, scaleX: 1.1, scaleY: 1.1, scaleZ: 1.1 },
});
assert(validPatientPos.valid === true, "Expected valid setPatientPosition command");

const gatewayPosRes = ctx.CTExternalGateway.send({
    requestId: "req-pos-2",
    target: "simulator",
    action: "setPatientPosition",
    params: { x: 0.1, y: -0.2, z: 0.5, rotX: -90, rotY: 10, rotZ: 0, scaleX: 1.1, scaleY: 1.1, scaleZ: 1.1 },
});
assert(gatewayPosRes.success === true, "Expected gateway.send success for setPatientPosition");
assert(ctx.AppState.patientOffset.scaleX === 1.1, "Expected scaleX to be 1.1");
assert(ctx.AppState.patientOffset.rotY === 10, "Expected rotY to be 10");

// Test setDistortion
const validDistortion = proto.validateCommand({
    requestId: "req-dist-1",
    target: "camera",
    action: "setDistortion",
    params: { enabled: true, k1: 0.15, k2: 0.05, fx: 1.0, fy: 1.0, cx: 0.5, cy: 0.5, zoom: 0.9 },
});
assert(validDistortion.valid === true, "Expected valid setDistortion command");

const gatewayDistRes = ctx.CTExternalGateway.send({
    requestId: "req-dist-2",
    target: "camera",
    action: "setDistortion",
    params: { enabled: true, k1: 0.15, k2: 0.05, fx: 1.0, fy: 1.0, cx: 0.5, cy: 0.5, zoom: 0.9 },
});
assert(gatewayDistRes.success === true, "Expected gateway.send success for setDistortion");
assert(ctx.AppState.distortion.k1 === 0.15, "Expected k1 to be 0.15");
assert(ctx.AppState.distortion.enabled === true, "Expected distortion to be enabled");

// Test camera transform & fov
const validCamTransform = proto.validateCommand({
    requestId: "req-cam-tf",
    target: "camera",
    action: "setTransform",
    params: { position: { x: 1, y: 2, z: 3 }, lookAt: { x: 0, y: 0, z: 0 } },
});
assert(validCamTransform.valid === true, "Expected valid setTransform command");

const gatewayCamTfRes = ctx.CTExternalGateway.send({
    requestId: "req-cam-tf-2",
    target: "camera",
    action: "setTransform",
    params: { position: { x: 1, y: 2, z: 3 }, lookAt: { x: 0, y: 0, z: 0 } },
});
assert(gatewayCamTfRes.success === true, "Expected gateway.send success for setTransform");

// Test Couch and Injector
const gatewayCouchRes = ctx.CTExternalGateway.send({
    requestId: "req-couch-1",
    target: "couch",
    action: "moveZ",
    params: { value: 65 },
});
assert(gatewayCouchRes.success === true, "Expected couch moveZ success");
assert(ctx.AppState.couch.z === 65, "Expected couch z to be 65");

const gatewayInjRes = ctx.CTExternalGateway.send({
    requestId: "req-inj-1",
    target: "injector",
    action: "setA",
    params: { value: 80 },
});
assert(gatewayInjRes.success === true, "Expected injector setA success");
assert(ctx.AppState.injector.a === 80, "Expected injector a to be 80");

// Test every HW Settings contract that is wired from the built-in UI.
const gatewayCouchYRes = ctx.CTExternalGateway.send({
    requestId: "req-couch-y",
    target: "couch",
    action: "moveY",
    params: { value: 40 },
});
assert(gatewayCouchYRes.success === true, "Expected couch moveY success");
assert(ctx.AppState.couch.y === 40, "Expected couch y to be 40");

const gatewayInjBRes = ctx.CTExternalGateway.send({
    requestId: "req-inj-b",
    target: "injector",
    action: "setB",
    params: { value: 35 },
});
assert(gatewayInjBRes.success === true, "Expected injector setB success");
assert(ctx.AppState.injector.b === 35, "Expected injector b to be 35");

const gatewayRotorRes = ctx.CTExternalGateway.send({
    requestId: "req-rotor",
    target: "gantry",
    action: "setRotorSpeed",
    params: { value: 80 },
});
assert(gatewayRotorRes.success === true, "Expected gantry setRotorSpeed success");
assert(ctx.AppState.gantry.rotorSpeed === 80, "Expected rotorSpeed to be 80");

const gatewayRowsRes = ctx.CTExternalGateway.send({
    requestId: "req-rows",
    target: "gantry",
    action: "setDetectorRows",
    params: { value: 160 },
});
assert(gatewayRowsRes.success === true, "Expected gantry setDetectorRows success");
assert(ctx.AppState.gantry.detectorRows === 160, "Expected detectorRows to be 160");

const invalidRowsRes = ctx.CTExternalGateway.send({
    requestId: "req-invalid-rows",
    target: "gantry",
    action: "setDetectorRows",
    params: { value: 999 },
});
assert(invalidRowsRes.success === false, "Expected unsupported detector rows to fail");
assert(invalidRowsRes.error.code === "INVALID_DETECTOR_ROWS", "Expected INVALID_DETECTOR_ROWS");

Object.entries(vm.runInContext("CTCommandCatalog", ctx).definitions).forEach(([name, definition]) => {
    assert(typeof definition.validate === "function", `Expected validator for ${name}`);
    assert(typeof definition.run === "function", `Expected handler for ${name}`);
});

const publicState = ctx.CTExternalGateway.getState();
assert(publicState.success === true, "Expected getState success");
assert(publicState.payload.listeners === undefined, "Expected public state to omit internal listeners");
publicState.payload.couch.y = 999;
assert(ctx.AppState.couch.y !== 999, "Expected public state to be a detached snapshot");

const commandState = ctx.CTExternalGateway.send({ target: "simulator", action: "getState" });
commandState.payload.couch.z = 999;
assert(ctx.AppState.couch.z !== 999, "Expected send(getState) to return a detached snapshot");

// Test camera streaming
const gatewayRes = ctx.CTExternalGateway.send({
    requestId: "req-cam-3",
    target: "camera",
    action: "startStream",
    params: { codec: "mjpeg", protocol: "http", fps: 30 },
});

assert(gatewayRes.success === true, "Expected gateway.send success for camera startStream");
assert(typeof gatewayRes.payload.streamUrl === "string", "Expected streamUrl string in payload");
assert(gatewayRes.payload.streamUrl.includes("http://"), "Expected http stream URL");

console.log("External interface protocol validation: OK (All tests passed)");
process.exit(0);
