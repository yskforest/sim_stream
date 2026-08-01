// アプリケーションエントリーポイント — 初期化とレンダーループのみを担当する
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
        init();
        animate();
    });
} else {
    init();
    animate();
}

function init() {
    clock = typeof THREE.Timer === "function" ? new THREE.Timer() : new THREE.Clock();

    if (window.CTProfileService && window.CTDefaultProfile) {
        window.CTProfileService.init(window.CTDefaultProfile);
    }
    var container = document.getElementById("canvas-container");
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111115);
    scene.fog = new THREE.FogExp2(0x111115, 0.03);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    window.renderer = renderer;
    window.scene = scene;
    window.camera = camera;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;

    // --- Lighting ---
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    var pointLight = new THREE.PointLight(0xddf0ff, 0.6, 5);
    pointLight.position.set(0, 1.2, 0);
    scene.add(pointLight);

    // --- Environment Build ---
    buildRoom();
    buildCTScanner();
    buildInjector();
    buildControlRoom();
    buildServerRack();

    // --- UI Setup ---
    CTUIController.setup();
    setCameraView("free");
    window.addEventListener("resize", onWindowResize);
    AppState.notify();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);
    if (!clock || !renderer || !scene || !camera) return;

    var currentTime = time !== undefined ? time : performance.now();
    if (typeof TWEEN !== "undefined" && typeof TWEEN.update === "function") {
        TWEEN.update(currentTime);
    }
    if (typeof clock.update === "function") {
        clock.update(currentTime);
    }
    var delta = typeof clock.getDelta === "function" ? clock.getDelta() : 0.016;

    if (Meshes.rotor && AppState.gantry.rotorSpeed > 0) {
        var radPerSec = (AppState.gantry.rotorSpeed * Math.PI * 2) / 60;
        Meshes.rotor.rotation.z += radPerSec * delta;
        AppState.gantry.angle = Meshes.rotor.rotation.z % (Math.PI * 2);
    }

    if (mixer) {
        mixer.update(delta);
    }

    if (Meshes.serverLeds) {
        Meshes.serverLeds.forEach(function (mat) {
            if (Math.random() > 0.85) {
                mat.opacity = Math.random();
            }
        });
    }

    controls.update();
    renderer.render(scene, camera);
}
