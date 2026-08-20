const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== Verifying Refactored 5-Layer Architecture ===");

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const bootstrapPath = path.join(root, 'assets/js/app/bootstrap.js');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const toVmScript = code => code
    .replace(/^import\s+[^;]+;\s*$/gm, '')
    .replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g, '');

// 1. Extract script list from index.html
const scriptMatches = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)];
const scriptListMatch = bootstrap.match(/const scripts = \[([\s\S]*?)\];/);

if (!html.includes('type="module" src="./assets/js/app/bootstrap.js"') || !scriptListMatch) {
    console.error("FAIL: Could not find the ES module bootstrap or its scripts array");
    process.exit(1);
}

const scripts = eval("[" + scriptListMatch[1] + "]");
console.log(`Found ${scripts.length} application modules in the ES module bootstrap:`);

let hasError = false;

// 2. Verify each script exists and is syntactically valid
scripts.forEach((relPath) => {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`FAIL: Script does not exist: ${relPath}`);
        hasError = true;
        return;
    }

    const code = toVmScript(fs.readFileSync(fullPath, 'utf8'));
    try {
        new vm.Script(code, { filename: relPath });
        console.log(`  [OK] Valid syntax: ${relPath}`);
    } catch (e) {
        console.error(`  [FAIL] Syntax Error in ${relPath}:`, e.message);
        hasError = true;
    }
});

// Verify that relative ES module imports resolve on disk.
scripts.concat(['./assets/js/app/bootstrap.js']).forEach(relPath => {
    const fullPath = path.join(root, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    for (const match of code.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g)) {
        if (!match[1].startsWith('.')) continue;
        const dependency = path.resolve(path.dirname(fullPath), match[1]);
        if (!fs.existsSync(dependency)) {
            console.error(`  [FAIL] Unresolved import in ${relPath}: ${match[1]}`);
            hasError = true;
        }
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
    'assets/js/core/commands/command-catalog.js',
    'assets/js/core/services/command-log-service.js',
    'assets/js/core/services/sequence-runner.js',
    'assets/js/core/services/model-registry.js',
    'assets/js/core/services/video-stream-service.js',
    'assets/js/core/services/performance-service.js',
    'assets/js/core/services/simulator-service.js',
    // Layer 4: Adapters
    'assets/js/adapters/external/external-gateway.js',
    'assets/js/adapters/external/protocol-v1.js',
    'assets/js/adapters/video/stream-gateway.js',
    'assets/js/adapters/video/canvas-capturer.js',
    'assets/js/adapters/ui/ui-controller.js',
    // Layer 5: Presentation & 3D View
    'assets/js/view/scene-manager.js',
    'assets/js/view/scene-sync.js',
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

// 5. Verify architecture boundaries introduced by the staged refactor.
console.log("\n--- Verifying dependency boundaries ---");
const commandBusCode = fs.readFileSync(path.join(root, 'assets/js/core/commands/command-bus.js'), 'utf8');
const protocolCode = fs.readFileSync(path.join(root, 'assets/js/adapters/external/protocol-v1.js'), 'utf8');
const stateCode = fs.readFileSync(path.join(root, 'assets/js/core/state.js'), 'utf8');
const sequenceCode = fs.readFileSync(path.join(root, 'assets/js/core/services/sequence-runner.js'), 'utf8');
const uiCode = fs.readFileSync(path.join(root, 'assets/js/adapters/ui/ui-controller.js'), 'utf8');
const runtimeCode = scripts.map(relPath => fs.readFileSync(path.join(root, relPath), 'utf8')).join('\n');

const boundaryChecks = [
    [!html.includes('function loadNext('), 'index.html uses the ES module bootstrap instead of DOM script injection'],
    [commandBusCode.includes('CTCommandCatalog.execute') && !commandBusCode.includes('target ==='), 'Command bus delegates to the command catalog'],
    [protocolCode.includes('CTCommandCatalog.validate'), 'Protocol validation shares the command catalog'],
    [commandBusCode.includes('import { CTCommandCatalog }') && protocolCode.includes('import { CTCommandCatalog }'), 'Command core uses ES module imports instead of command globals'],
    [!stateCode.includes('subscribe(') && !stateCode.includes('listeners:'), 'AppState is serializable data without store behavior'],
    [!sequenceCode.includes('toggleScan') && !sequenceCode.includes('toggleXRay') && !sequenceCode.includes('global.Meshes'), 'Sequence runner has no UI or scene dependency'],
    [sequenceCode.indexOf('isRunning = false;', sequenceCode.indexOf('finally')) < sequenceCode.lastIndexOf('key: "cancelRequested"'), 'Sequence completion clears running state before its final UI notification'],
    [!uiCode.includes('function applyStateToMeshes'), '3D state synchronization is outside the UI adapter'],
    [!/(?:onclick|onchange|oninput)\s*=/.test(html + runtimeCode), 'UI events use data-action delegation instead of inline/property handlers'],
    [!runtimeCode.includes('global.CTCommandBus') && !runtimeCode.includes('global.CTCommandCatalog') && !runtimeCode.includes('global.CTProtocolV1'), 'Control-core modules are not published as browser globals']
];
boundaryChecks.forEach(([ok, message]) => {
    if (!ok) {
        console.error(`  [FAIL] ${message}`);
        hasError = true;
    } else {
        console.log(`  [OK] ${message}`);
    }
});

// 6. Verify compatibility modules in a unified VM context.
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
        GLTFLoader: function() { this.load = (_path, done) => done({ scene: new contextObj.THREE.Group() }); },
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
        MathUtils: { degToRad: degrees => degrees * Math.PI / 180 },
        Box3: function() { this.min = { y: 0 }; this.setFromObject = () => this; this.getSize = target => Object.assign(target, { x: 1, y: 1, z: 1 }); },
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
        Group: function() { this.position = { set: () => {} }; this.rotation = { set: () => {} }; this.scale = { set: () => {} }; this.add = () => {}; this.traverse = () => {}; this.clone = () => new contextObj.THREE.Group(); },
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
    const code = toVmScript(fs.readFileSync(fullPath, 'utf8'));
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
    if (vmContext.CTUIController && typeof vmContext.CTUIController.toggleCameraStream === "function") {
        vmContext.CTUIController.toggleCameraStream();
        const activeState = vmContext.AppState.camera;
        console.log("  [OK] toggleCameraStream() started streaming. isStreaming:", activeState.isStreaming, "URL:", activeState.streamUrl);
        if (!activeState.isStreaming) {
            console.error("  [FAIL] Expected camera.isStreaming to be true after start");
            process.exit(1);
        }
        vmContext.CTUIController.toggleCameraStream();
        console.log("  [OK] toggleCameraStream() stopped streaming. isStreaming:", activeState.isStreaming);
        if (activeState.isStreaming) {
            console.error("  [FAIL] Expected camera.isStreaming to be false after stop");
            process.exit(1);
        }
    } else {
        console.error("  [FAIL] CTUIController.toggleCameraStream is not a function");
        process.exit(1);
    }

    console.log("\n--- Testing Refactored UI Feature Wiring ---");
    if (!vmContext.CTSceneManager || typeof vmContext.CTSceneManager.toggleAxesHelper !== "function") {
        console.error("  [FAIL] CTSceneManager.toggleAxesHelper is not a function");
        process.exit(1);
    }
    console.log("  [OK] World-axes action is namespaced under CTSceneManager");

    try {
        vmContext.CTUIController.onDistortionPresetChange("fisheye");
        if (vmContext.AppState.distortion.k1 !== 0.4 || vmContext.AppState.distortion.zoom !== 0.95) {
            console.error("  [FAIL] Distortion preset did not update AppState");
            process.exit(1);
        }
        vmContext.CTUIController.onDistortionParamInput();
        console.log("  [OK] Distortion preset and slider handlers execute without missing-service errors");
    } catch (e) {
        console.error("  [FAIL] Distortion UI handler threw:", e.stack || e.message);
        process.exit(1);
    }

    if (!vmContext.CTSequenceRunner || typeof vmContext.CTSequenceRunner.isRunning !== "function") {
        console.error("  [FAIL] CTSequenceRunner running-state API is unavailable");
        process.exit(1);
    }
    console.log("  [OK] CTSequenceRunner exposes its running state");

    const initialBatchCount = vmContext.AppState.gantry.scanSequence.length;
    vmContext.CTSequenceRunner.addScanBatch();
    if (vmContext.AppState.gantry.scanSequence.length !== initialBatchCount + 1) {
        console.error("  [FAIL] addScanBatch did not append a batch");
        process.exit(1);
    }
    const addedBatchIndex = vmContext.AppState.gantry.scanSequence.length - 1;
    vmContext.CTSequenceRunner.updateBatchData(addedBatchIndex, "delay", 7);
    if (vmContext.AppState.gantry.scanSequence[addedBatchIndex].delay !== 7) {
        console.error("  [FAIL] updateBatchData did not update the batch");
        process.exit(1);
    }
    vmContext.CTSequenceRunner.removeScanBatch(addedBatchIndex);
    if (vmContext.AppState.gantry.scanSequence.length !== initialBatchCount) {
        console.error("  [FAIL] removeScanBatch did not remove the batch");
        process.exit(1);
    }
    console.log("  [OK] Batch add, update, and remove operations are functional");

    console.log("\nALL 5-LAYER REFACTORING & ARCHITECTURE TESTS PASSED!");
}
