const fs = require("fs");
const vm = require("vm");
const path = require("path");

function loadScript(ctx, relPath) {
    const p = path.resolve(__dirname, "..", relPath);
    const code = fs.readFileSync(p, "utf8");
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

loadScript(ctx, "assets/js/adapters/external/protocol-v1.js");

const proto = ctx.CTProtocolV1;
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
loadScript(ctx, "assets/js/core/config/models-config.js");
loadScript(ctx, "assets/js/core/services/model-registry.js");
loadScript(ctx, "assets/js/core/hw/couch-sim.js");
loadScript(ctx, "assets/js/core/hw/gantry-sim.js");
loadScript(ctx, "assets/js/core/hw/injector-sim.js");
loadScript(ctx, "assets/js/core/hw/camera-sim.js");
loadScript(ctx, "assets/js/core/services/video-stream-service.js");
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
