const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== Verifying Refactored 5-Layer Architecture ===");

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 1. Extract script list from index.html
const scriptMatches = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)];
const scriptListMatch = html.match(/const scripts = \[([\s\S]*?)\];/);

if (!scriptListMatch) {
    console.error("FAIL: Could not find scripts array in index.html");
    process.exit(1);
}

const scripts = eval("[" + scriptListMatch[1] + "]");
console.log(`Found ${scripts.length} scripts in dynamic loader list:`);

let hasError = false;

// 2. Verify each script exists and is syntactically valid
scripts.forEach((relPath) => {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`FAIL: Script does not exist: ${relPath}`);
        hasError = true;
        return;
    }

    const code = fs.readFileSync(fullPath, 'utf8');
    try {
        new vm.Script(code, { filename: relPath });
        console.log(`  [OK] Valid syntax: ${relPath}`);
    } catch (e) {
        console.error(`  [FAIL] Syntax Error in ${relPath}:`, e.message);
        hasError = true;
    }
});

// 3. Verify that deleted legacy files do not exist
const deletedFiles = [
    'assets/js/core/services/batch-service.js',
    'assets/js/core/services/sequence-service.js',
    'assets/js/core/services/tween-utils.js',
    'assets/js/adapters/ui/scan-controller.js',
    'assets/js/adapters/ui/patient-controller.js',
    'assets/js/adapters/ui/dialog-controller.js',
    'assets/js/view/models/control-room-model.js',
    'assets/js/view/models/server-rack-model.js',
    'assets/js/view/view-sync.js'
];

deletedFiles.forEach(file => {
    const fullPath = path.join(root, file);
    if (fs.existsSync(fullPath)) {
        console.error(`FAIL: Obsolete file still exists: ${file}`);
        hasError = true;
    } else {
        console.log(`  [OK] Cleaned legacy file: ${file}`);
    }
});

// 4. Verify 5-Layer Core Architecture Files
const required5Layers = [
    // Layer 1: Configuration
    'assets/js/core/config/config-service.js',
    'assets/js/core/config/models-config.js',
    // Layer 2: Domain / HW Simulator
    'assets/js/core/state.js',
    'assets/js/core/store.js',
    'assets/js/core/profile/profile-service.js',
    'assets/js/core/hw/gantry-sim.js',
    'assets/js/core/hw/couch-sim.js',
    'assets/js/core/hw/injector-sim.js',
    'assets/js/core/hw/camera-sim.js',
    // Layer 3: Application Services
    'assets/js/core/commands/command-bus.js',
    'assets/js/core/services/command-log-service.js',
    'assets/js/core/services/sequence-runner.js',
    'assets/js/core/services/model-registry.js',
    'assets/js/core/services/video-stream-service.js',
    'assets/js/core/services/performance-service.js',
    // Layer 4: Adapters
    'assets/js/adapters/external/external-gateway.js',
    'assets/js/adapters/external/protocol-v1.js',
    'assets/js/adapters/video/stream-gateway.js',
    'assets/js/adapters/video/canvas-capturer.js',
    'assets/js/adapters/ui/ui-controller.js',
    // Layer 5: Presentation & 3D View
    'assets/js/view/scene-manager.js',
    'assets/js/view/fps-controls.js',
    'assets/js/view/camera-presets.js',
    'assets/js/view/models/mesh-factory.js',
    'assets/js/view/models/gantry-model.js',
    'assets/js/view/models/injector-model.js',
    'assets/js/view/models/room-model.js',
    'assets/js/core/main.js'
];

required5Layers.forEach(file => {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) {
        console.error(`FAIL: Missing 5-layer module: ${file}`);
        hasError = true;
    }
});

// 5. Verify sequential loading in a unified VM context (catches duplicate global let/const/var declarations)
console.log("\n--- Testing sequential execution in a shared global VM context ---");
const contextObj = {
    window: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    document: {
        getElementById: () => ({
            value: '', innerText: '', style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
            children: [],
            addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], appendChild: () => {}
        }),
        createElement: () => ({
            appendChild: () => {}, setAttribute: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
            style: {}, getContext: () => ({
                createLinearGradient: () => ({ addColorStop: () => {} }),
                createRadialGradient: () => ({ addColorStop: () => {} }),
                fillRect: () => {}, arc: () => {}, fill: () => {}, beginPath: () => {},
                moveTo: () => {}, lineTo: () => {}, stroke: () => {}, strokeRect: () => {},
                fillText: () => {}, measureText: () => ({ width: 10 }),
                save: () => {}, restore: () => {}
            }),
            width: 128, height: 128
        }),
        readyState: "complete",
        addEventListener: () => {},
        body: { appendChild: () => {} }
    },
    performance: { now: () => Date.now() },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    console: console,
    requestAnimationFrame: () => {},
    WebSocket: function() { this.send = () => {}; },
    THREE: {
        Clock: function() { this.update = () => {}; this.getDelta = () => 0.016; },
        Timer: function() { this.update = () => {}; this.getDelta = () => 0.016; },
        Scene: function() { this.background = null; this.fog = null; this.add = () => {}; },
        Color: function() {},
        FogExp2: function() {},
        PerspectiveCamera: function() { this.aspect = 1; this.updateProjectionMatrix = () => {}; this.position = { set: () => {} }; },
        OrthographicCamera: function() {},
        WebGLRenderTarget: function() { this.texture = {}; this.dispose = () => {}; },
        WebGLRenderer: function() {
            this.setPixelRatio = () => {}; this.setSize = () => {}; this.setRenderTarget = () => {};
            this.render = () => {}; this.domElement = {}; this.shadowMap = {};
        },
        AmbientLight: function() {},
        HemisphereLight: function() { this.position = { set: () => {} }; },
        DirectionalLight: function() { this.position = { set: () => {} }; this.shadow = { mapSize: {}, camera: {} }; },
        OrbitControls: function() { this.target = { set: () => {} }; this.addEventListener = () => {}; this.update = () => {}; },
        Vector2: function() { this.set = () => {}; },
        Vector3: function() { this.set = () => {}; },
        Vector4: function() { this.set = () => {}; },
        CanvasTexture: function() { this.wrapS = 1000; this.wrapT = 1000; this.repeat = { set: () => {} }; },
        RepeatWrapping: 1000,
        PlaneGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        CylinderGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        ConeGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        BoxGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        SphereGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        TorusGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        RingGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        TubeGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        CubicBezierCurve3: function() { this.getPoints = () => []; },
        PointLight: function() { this.position = { set: () => {} }; this.shadow = { mapSize: {} }; },
        DoubleSide: 2,
        Path: function() { this.absarc = () => {}; },
        Shape: function() { this.moveTo = () => {}; this.lineTo = () => {}; this.quadraticCurveTo = () => {}; this.absarc = () => {}; this.holes = []; },
        ExtrudeGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        CapsuleGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        CircleGeometry: function() { this.rotateX = () => {}; this.rotateY = () => {}; this.rotateZ = () => {}; this.translate = () => {}; },
        GridHelper: function() { this.position = {}; },
        Group: function() { this.position = { set: () => {} }; this.rotation = { set: () => {} }; this.scale = { set: () => {} }; this.add = () => {}; this.traverse = () => {}; },
        ShaderMaterial: function() { this.uniforms = { uK: { value: { set: () => {} } }, uFocal: { value: { set: () => {} } }, uCenter: { value: { set: () => {} } }, uZoom: { value: 1.0 }, tDiffuse: { value: null } }; },
        MeshBasicMaterial: function() {},
        MeshStandardMaterial: function() {},
        MeshPhysicalMaterial: function() {},
        Mesh: function() {
            this.position = { set: () => {} }; this.rotation = { set: () => {} }; this.scale = { set: () => {} };
            this.add = () => {}; this.traverse = () => {}; this.clone = () => new contextObj.THREE.Mesh();
        }
    }
};
contextObj.window = contextObj;
contextObj.globalThis = contextObj;

const vmContext = vm.createContext(contextObj);

scripts.forEach((relPath) => {
    const fullPath = path.join(root, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    try {
        vm.runInContext(code, vmContext, { filename: relPath });
        console.log(`  [OK] Evaluated in shared context: ${relPath}`);
    } catch (e) {
        console.error(`  [FAIL] Runtime Execution Error in ${relPath}:`, e.stack || e.message);
        hasError = true;
    }
});

if (hasError) {
    console.error("\nArchitecture verification FAILED!");
    process.exit(1);
} else {
    // Verify Stream Start / Stop toggle logic
    console.log("\n--- Testing Camera Stream Start / Stop ---");
    if (typeof vmContext.toggleCameraStream === "function") {
        vmContext.toggleCameraStream();
        const activeState = vmContext.AppState.camera;
        console.log("  [OK] toggleCameraStream() started streaming. isStreaming:", activeState.isStreaming, "URL:", activeState.streamUrl);
        if (!activeState.isStreaming) {
            console.error("  [FAIL] Expected camera.isStreaming to be true after start");
            process.exit(1);
        }
        vmContext.toggleCameraStream();
        console.log("  [OK] toggleCameraStream() stopped streaming. isStreaming:", activeState.isStreaming);
        if (activeState.isStreaming) {
            console.error("  [FAIL] Expected camera.isStreaming to be false after stop");
            process.exit(1);
        }
    } else {
        console.error("  [FAIL] global.toggleCameraStream is not a function");
        process.exit(1);
    }
    console.log("\nALL 5-LAYER REFACTORING & ARCHITECTURE TESTS PASSED!");
}

