// アプリケーションエントリーポイント — 初期化とレンダーループのみを担当する
window.isFisheyeEnabled = false;
window.toggleFisheye = function() {
    window.isFisheyeEnabled = !window.isFisheyeEnabled;
    var btn = document.getElementById("btn-fisheye-toggle");
    if (btn) btn.style.backgroundColor = window.isFisheyeEnabled ? "#7e22ce" : "";
};
var fisheyeRenderTarget = null;
var fisheyeCamera = null;
var fisheyeScene = null;
var fisheyeMesh = null;

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

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    dirLight.shadow.bias = -0.0003;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    var pointLight = new THREE.PointLight(0xddf0ff, 0.6, 5);
    pointLight.position.set(0, 1.2, 0);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    pointLight.shadow.bias = -0.001;
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

    var activeStream = window.CTVideoStreamService ? window.CTVideoStreamService.getActiveStream() : null;
    if (activeStream && activeStream.isStreaming && activeStream.mode === "main") {
        var targetAspect = activeStream.width / activeStream.height;
        camera.aspect = targetAspect;
        if (typeof activeStream.hfov === "number" && activeStream.hfov > 0) {
            var hfovRad = (activeStream.hfov * Math.PI) / 180;
            var vfovRad = 2 * Math.atan(Math.tan(hfovRad / 2) / targetAspect);
            camera.fov = (vfovRad * 180) / Math.PI;
        }
        camera.updateProjectionMatrix();

        var winW = window.innerWidth;
        var winH = window.innerHeight;
        var winAspect = winW / winH;

        var vpW, vpH, vpX, vpY;
        if (winAspect > targetAspect) {
            vpH = winH;
            vpW = vpH * targetAspect;
            vpX = Math.floor((winW - vpW) / 2);
            vpY = 0;
        } else {
            vpW = winW;
            vpH = vpW / targetAspect;
            vpX = 0;
            vpY = Math.floor((winH - vpH) / 2);
        }

        renderer.setScissorTest(true);
        renderer.setClearColor(0x000000, 1.0);
        renderer.setViewport(0, 0, winW, winH);
        renderer.setScissor(0, 0, winW, winH);
        renderer.clear();

        renderer.setViewport(vpX, vpY, Math.floor(vpW), Math.floor(vpH));
        renderer.setScissor(vpX, vpY, Math.floor(vpW), Math.floor(vpH));
        
        if (window.isFisheyeEnabled) {
            var rw = Math.floor(vpW);
            var rh = Math.floor(vpH);
            if (!fisheyeRenderTarget || fisheyeRenderTarget.width !== rw || fisheyeRenderTarget.height !== rh) {
                if (fisheyeRenderTarget) fisheyeRenderTarget.dispose();
                fisheyeRenderTarget = new THREE.WebGLRenderTarget(rw, rh, { format: THREE.RGBAFormat });
                if (!fisheyeScene) {
                    fisheyeScene = new THREE.Scene();
                    fisheyeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
                    var geo = new THREE.PlaneGeometry(2, 2);
                    var mat = new THREE.ShaderMaterial({
                        uniforms: { tDiffuse: { value: null }, strength: { value: 0.25 }, zoom: { value: 0.66 } },
                        vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",
                        fragmentShader: "uniform sampler2D tDiffuse; uniform float strength; uniform float zoom; varying vec2 vUv; void main() { vec2 p = vUv * 2.0 - 1.0; float r2 = dot(p, p); float f = (1.0 + r2 * strength) * zoom; vec2 uv = f * p * 0.5 + 0.5; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); } else { vec4 texColor = texture2D(tDiffuse, uv); gl_FragColor = vec4(pow(texColor.rgb, vec3(1.0 / 2.2)), texColor.a); } }"
                    });
                    fisheyeMesh = new THREE.Mesh(geo, mat);
                    fisheyeScene.add(fisheyeMesh);
                }
                fisheyeMesh.material.uniforms.tDiffuse.value = fisheyeRenderTarget.texture;
            }
            
            renderer.setRenderTarget(fisheyeRenderTarget);
            renderer.setViewport(0, 0, rw, rh);
            renderer.setScissorTest(false);
            renderer.setClearColor(0x000000, 1.0);
            renderer.clear();
            renderer.render(scene, camera);

            renderer.setRenderTarget(null);
            renderer.setScissorTest(true);
            renderer.setViewport(vpX, vpY, rw, rh);
            renderer.setScissor(vpX, vpY, rw, rh);
            renderer.render(fisheyeScene, fisheyeCamera);
        } else {
            renderer.render(scene, camera);
        }

        renderer.setScissorTest(false);

        window.activeViewportBounds = { x: vpX, y: vpY, w: Math.floor(vpW), h: Math.floor(vpH), winW: winW, winH: winH };
    } else {
        window.activeViewportBounds = null;
        renderer.setScissorTest(false);
        
        if (window.isFisheyeEnabled) {
            var rw = window.innerWidth;
            var rh = window.innerHeight;
            if (!fisheyeRenderTarget || fisheyeRenderTarget.width !== rw || fisheyeRenderTarget.height !== rh) {
                if (fisheyeRenderTarget) fisheyeRenderTarget.dispose();
                fisheyeRenderTarget = new THREE.WebGLRenderTarget(rw, rh, { format: THREE.RGBAFormat });
                if (!fisheyeScene) {
                    fisheyeScene = new THREE.Scene();
                    fisheyeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
                    var geo = new THREE.PlaneGeometry(2, 2);
                    var mat = new THREE.ShaderMaterial({
                        uniforms: { tDiffuse: { value: null }, strength: { value: 0.25 }, zoom: { value: 0.66 } },
                        vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",
                        fragmentShader: "uniform sampler2D tDiffuse; uniform float strength; uniform float zoom; varying vec2 vUv; void main() { vec2 p = vUv * 2.0 - 1.0; float r2 = dot(p, p); float f = (1.0 + r2 * strength) * zoom; vec2 uv = f * p * 0.5 + 0.5; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); } else { vec4 texColor = texture2D(tDiffuse, uv); gl_FragColor = vec4(pow(texColor.rgb, vec3(1.0 / 2.2)), texColor.a); } }"
                    });
                    fisheyeMesh = new THREE.Mesh(geo, mat);
                    fisheyeScene.add(fisheyeMesh);
                }
                fisheyeMesh.material.uniforms.tDiffuse.value = fisheyeRenderTarget.texture;
            }
            
            renderer.setRenderTarget(fisheyeRenderTarget);
            renderer.setViewport(0, 0, rw, rh);
            renderer.render(scene, camera);

            renderer.setRenderTarget(null);
            renderer.setViewport(0, 0, rw, rh);
            renderer.render(fisheyeScene, fisheyeCamera);
        } else {
            renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
            renderer.render(scene, camera);
        }
    }
}
