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

console.log("External interface protocol validation: OK");
