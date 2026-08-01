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
loadScript(ctx, "assets/js/core/hw/camera-sim.js");
loadScript(ctx, "assets/js/core/services/video-stream-service.js");
loadScript(ctx, "assets/js/core/commands/command-bus.js");
loadScript(ctx, "assets/js/adapters/external/external-gateway.js");

ctx.CTStore.bindState(ctx.AppState);

const validGlbModel = proto.validateCommand({
    requestId: "req-glb-1",
    target: "simulator",
    action: "setPatientModel",
    params: { modelId: "rp_posed_00178_29" },
});
assert(validGlbModel.valid === true, "Expected valid setPatientModel command");

const gatewayGlbRes = ctx.CTExternalGateway.send({
    requestId: "req-glb-2",
    target: "simulator",
    action: "setPatientModel",
    params: { modelId: "rp_posed_00178_29" },
});
assert(gatewayGlbRes.success === true, "Expected gateway.send success for setPatientModel");

const gatewayRes = ctx.CTExternalGateway.send({
    requestId: "req-cam-3",
    target: "camera",
    action: "startStream",
    params: { codec: "mjpeg", protocol: "http", fps: 30 },
});

assert(gatewayRes.success === true, "Expected gateway.send success for camera startStream");
assert(typeof gatewayRes.payload.streamUrl === "string", "Expected streamUrl string in payload");
assert(gatewayRes.payload.streamUrl.includes("http://"), "Expected http stream URL");

console.log("External interface protocol validation: OK");
process.exit(0);
