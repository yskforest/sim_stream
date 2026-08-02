// アプリケーションエントリーポイント — 初期化とレンダーループのみを担当する
window.isFisheyeEnabled = false;
window.toggleFisheye = function() {
    window.isFisheyeEnabled = !window.isFisheyeEnabled;
    var btn = document.getElementById("btn-fisheye-toggle");
    if (btn) btn.style.backgroundColor = window.isFisheyeEnabled ? "#7e22ce" : "";
};
window.toggleLaserAlignment = function() {
    if (window.Meshes && window.Meshes.laserGroup) {
        window.Meshes.laserGroup.visible = !window.Meshes.laserGroup.visible;
        var btn = document.getElementById("btn-laser-toggle");
        if (btn) {
            if (window.Meshes.laserGroup.visible) {
                btn.className = "w-full bg-red-700 hover:bg-red-600 text-xs py-1.5 rounded border border-red-500 font-bold";
            } else {
                btn.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600";
            }
        }
    }
};
window.toggleWaterPhantom = function() {
    if (window.Meshes && window.Meshes.phantomGroup) {
        window.Meshes.phantomGroup.visible = !window.Meshes.phantomGroup.visible;
        var btn = document.getElementById("btn-phantom-toggle");
        if (btn) {
            if (window.Meshes.phantomGroup.visible) {
                btn.className = "w-full bg-cyan-700 hover:bg-cyan-600 text-xs py-1.5 rounded border border-cyan-500 font-bold";
            } else {
                btn.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600";
            }
        }
    }
};
window.setGraphicsQuality = function(mode) {
    if (!window.renderer) return;
    if (mode === "high") {
        window.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        if (typeof THREE.ACESFilmicToneMapping !== "undefined") {
            window.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            window.renderer.toneMappingExposure = 1.05;
        }
    } else {
        window.renderer.setPixelRatio(1.0);
        window.renderer.toneMapping = THREE.NoToneMapping;
    }
    window.renderer.setSize(window.innerWidth, window.innerHeight);
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
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    window.renderer = renderer;
    window.scene = scene;
    window.camera = camera;
    
    // --- High DPI Sharpness & Color Pipeline ---
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (typeof THREE.ACESFilmicToneMapping !== "undefined") {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
    }
    if (typeof THREE.SRGBColorSpace !== "undefined") {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (typeof THREE.sRGBEncoding !== "undefined") {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // --- Procedural IBL Environment Map Generation ---
    try {
        if (typeof THREE.PMREMGenerator === "function") {
            var pmremGen = new THREE.PMREMGenerator(renderer);
            pmremGen.compileEquirectangularShader();
            
            var envScene = new THREE.Scene();
            var envLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
            envLight1.position.set(2, 5, 2);
            envScene.add(envLight1);
            
            var envLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
            envLight2.position.set(-2, -3, -2);
            envScene.add(envLight2);

            var envBoxGeo = new THREE.BoxGeometry(10, 10, 10);
            var envBoxMat = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.BackSide });
            envScene.add(new THREE.Mesh(envBoxGeo, envBoxMat));

            var envTexture = pmremGen.fromScene(envScene).texture;
            scene.environment = envTexture;
            pmremGen.dispose();
        }
    } catch (e) {
        console.warn("Failed to generate PMREM environment map:", e);
    }

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;

    // --- High-Quality Realistic Medical Lighting ---
    var hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x334155, 0.55);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
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
    dirLight.shadow.bias = -0.0001;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    var ceilingPanelLight = new THREE.PointLight(0xe0f2fe, 0.8, 8);
    ceilingPanelLight.position.set(0, 3.2, 0);
    ceilingPanelLight.castShadow = true;
    ceilingPanelLight.shadow.mapSize.width = 1024;
    ceilingPanelLight.shadow.mapSize.height = 1024;
    ceilingPanelLight.shadow.bias = -0.0005;
    scene.add(ceilingPanelLight);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
            var dpr = renderer.getPixelRatio();
            var rw = Math.floor(vpW * dpr);
            var rh = Math.floor(vpH * dpr);
            if (!fisheyeRenderTarget || fisheyeRenderTarget.width !== rw || fisheyeRenderTarget.height !== rh) {
                if (fisheyeRenderTarget) fisheyeRenderTarget.dispose();
                fisheyeRenderTarget = new THREE.WebGLRenderTarget(rw, rh, {
                    format: THREE.RGBAFormat,
                    samples: 4,
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter
                });
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
            renderer.setViewport(vpX, vpY, Math.floor(vpW), Math.floor(vpH));
            renderer.setScissor(vpX, vpY, Math.floor(vpW), Math.floor(vpH));
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
            var dpr = renderer.getPixelRatio();
            var rw = Math.floor(window.innerWidth * dpr);
            var rh = Math.floor(window.innerHeight * dpr);
            if (!fisheyeRenderTarget || fisheyeRenderTarget.width !== rw || fisheyeRenderTarget.height !== rh) {
                if (fisheyeRenderTarget) fisheyeRenderTarget.dispose();
                fisheyeRenderTarget = new THREE.WebGLRenderTarget(rw, rh, {
                    format: THREE.RGBAFormat,
                    samples: 4,
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter
                });
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
            renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
            renderer.render(fisheyeScene, fisheyeCamera);
        } else {
            renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
            renderer.render(scene, camera);
        }
    }
}
