// CT 3D Simulator - Three.js Scene, Pipeline & Render Loop Manager
(function attachSceneManager(global) {
    "use strict";

    var isFisheyeEnabled = false;
    var isEcoModeEnabled = false;
    var renderDemandCount = 60;

    var fisheyeRenderTarget = null;
    var fisheyeCamera = null;
    var fisheyeScene = null;
    var fisheyeMesh = null;

    function requestRenderFrame(count) {
        renderDemandCount = Math.max(renderDemandCount || 0, typeof count === "number" ? count : 15);
    }

    function toggleFisheye(enabled) {
        if (typeof enabled === "boolean") {
            isFisheyeEnabled = enabled;
        } else {
            isFisheyeEnabled = !isFisheyeEnabled;
        }
        if (global.AppState && global.AppState.distortion) {
            global.AppState.distortion.enabled = isFisheyeEnabled;
        }
        var btn = document.getElementById("btn-fisheye-toggle");
        if (btn) {
            btn.style.backgroundColor = isFisheyeEnabled ? "#7e22ce" : "";
            btn.textContent = isFisheyeEnabled ? "Disable Fisheye Lens" : "Toggle Fisheye Lens";
        }
        var mainToggle = document.getElementById("input-distortion-enable");
        if (mainToggle) mainToggle.checked = isFisheyeEnabled;
        requestRenderFrame(30);
    }

    function updateCameraDistortion(params) {
        if (!params && global.AppState && global.AppState.distortion) {
            params = global.AppState.distortion;
        }
        if (!params) return;

        if (params.enabled !== undefined) {
            isFisheyeEnabled = !!params.enabled;
            var btn = document.getElementById("btn-fisheye-toggle");
            if (btn) btn.style.backgroundColor = isFisheyeEnabled ? "#7e22ce" : "";
        }

        if (fisheyeMesh && fisheyeMesh.material && fisheyeMesh.material.uniforms) {
            var u = fisheyeMesh.material.uniforms;
            if (u.uK && params.k1 !== undefined) u.uK.value.set(params.k1 || 0, params.k2 || 0, params.k3 || 0, params.k4 || 0);
            if (u.uFocal && params.fx !== undefined) u.uFocal.value.set(params.fx !== undefined ? params.fx : 1.0, params.fy !== undefined ? params.fy : 1.0);
            if (u.uCenter && params.cx !== undefined) u.uCenter.value.set(params.cx !== undefined ? params.cx : 0.5, params.cy !== undefined ? params.cy : 0.5);
            if (u.uZoom && params.zoom !== undefined) u.uZoom.value = params.zoom || 1.0;
        }
        requestRenderFrame(15);
    }

    function toggleEcoMode(enabled) {
        if (typeof enabled === "boolean") {
            isEcoModeEnabled = enabled;
        } else {
            isEcoModeEnabled = !isEcoModeEnabled;
        }
        var btn = document.getElementById("btn-eco-toggle");
        if (btn) {
            if (isEcoModeEnabled) {
                btn.className = "top-bar-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-400";
                btn.textContent = "ECO: ON";
            } else {
                btn.className = "top-bar-btn border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/60 font-bold";
                btn.textContent = "ECO";
            }
        }
        if (isEcoModeEnabled) {
            setGraphicsQuality("eco");
        } else {
            setGraphicsQuality("high");
        }
        requestRenderFrame(30);
    }

    function setGraphicsQuality(mode) {
        if (!global.renderer) return;
        if (mode === "high") {
            global.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            if (typeof THREE.ACESFilmicToneMapping !== "undefined") {
                global.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                global.renderer.toneMappingExposure = 1.05;
            }
            global.renderer.shadowMap.enabled = true;
        } else if (mode === "eco" || mode === "low") {
            global.renderer.setPixelRatio(0.85);
            global.renderer.toneMapping = THREE.NoToneMapping;
            global.renderer.shadowMap.enabled = false;
        } else {
            global.renderer.setPixelRatio(1.0);
            global.renderer.toneMapping = THREE.NoToneMapping;
            global.renderer.shadowMap.enabled = true;
        }
        global.renderer.setSize(window.innerWidth, window.innerHeight);
        requestRenderFrame(10);
    }

    function toggleLaserAlignment() {
        if (global.Meshes && global.Meshes.laserGroup) {
            global.Meshes.laserGroup.visible = !global.Meshes.laserGroup.visible;
            var btn = document.getElementById("btn-laser-toggle");
            if (btn) {
                if (global.Meshes.laserGroup.visible) {
                    btn.className = "w-full bg-red-700 hover:bg-red-600 text-xs py-1.5 rounded border border-red-500 font-bold";
                } else {
                    btn.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600";
                }
            }
            requestRenderFrame(15);
        }
    }

    function toggleWaterPhantom() {
        if (global.Meshes && global.Meshes.phantomGroup) {
            global.Meshes.phantomGroup.visible = !global.Meshes.phantomGroup.visible;
            var btn = document.getElementById("btn-phantom-toggle");
            if (btn) {
                if (global.Meshes.phantomGroup.visible) {
                    btn.className = "w-full bg-cyan-700 hover:bg-cyan-600 text-xs py-1.5 rounded border border-cyan-500 font-bold";
                } else {
                    btn.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600";
                }
            }
            requestRenderFrame(15);
        }
    }

    function toggleAxesHelper() {
        if (global.Meshes && global.Meshes.axesHelper) {
            global.Meshes.axesHelper.visible = !global.Meshes.axesHelper.visible;
            var btn = document.getElementById("btn-axes-toggle");
            if (btn) {
                if (global.Meshes.axesHelper.visible) {
                    btn.className = "w-full bg-indigo-700 hover:bg-indigo-600 text-xs py-1.5 rounded border border-indigo-500 font-bold";
                } else {
                    btn.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600";
                }
            }
            requestRenderFrame(15);
        }
    }

    function setupFisheyePipeline(rw, rh) {
        if (!fisheyeRenderTarget || fisheyeRenderTarget.width !== rw || fisheyeRenderTarget.height !== rh) {
            if (fisheyeRenderTarget) fisheyeRenderTarget.dispose();
            fisheyeRenderTarget = new THREE.WebGLRenderTarget(rw, rh, {
                format: THREE.RGBAFormat,
                samples: 4,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter
            });
        }

        if (!fisheyeScene) {
            fisheyeScene = new THREE.Scene();
            fisheyeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            var geo = new THREE.PlaneGeometry(2, 2);
            var dParams = (global.AppState && global.AppState.distortion) ? global.AppState.distortion : {};

            var mat = new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse: { value: null },
                    uK: { value: new THREE.Vector4(dParams.k1 !== undefined ? dParams.k1 : 0.1, dParams.k2 !== undefined ? dParams.k2 : 0.05, dParams.k3 || 0, dParams.k4 || 0) },
                    uFocal: { value: new THREE.Vector2(dParams.fx !== undefined ? dParams.fx : 1.0, dParams.fy !== undefined ? dParams.fy : 1.0) },
                    uCenter: { value: new THREE.Vector2(dParams.cx !== undefined ? dParams.cx : 0.5, dParams.cy !== undefined ? dParams.cy : 0.5) },
                    uZoom: { value: dParams.zoom !== undefined ? dParams.zoom : 1.0 },
                    uAspect: { value: (rw && rh) ? (rw / rh) : (window.innerWidth / window.innerHeight) }
                },
                vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",
                fragmentShader: [
                    "uniform sampler2D tDiffuse;",
                    "uniform vec4 uK;",
                    "uniform vec2 uFocal;",
                    "uniform vec2 uCenter;",
                    "uniform float uZoom;",
                    "uniform float uAspect;",
                    "varying vec2 vUv;",
                    "",
                    "void main() {",
                    "    vec2 p_dist = (vUv - uCenter) * vec2(uAspect, 1.0) / max(uZoom, 0.01);",
                    "    p_dist.x /= max(uFocal.x, 0.001);",
                    "    p_dist.y /= max(uFocal.y, 0.001);",
                    "",
                    "    float theta_d = length(p_dist);",
                    "",
                    "    if (theta_d < 1e-6) {",
                    "        vec4 texColor = texture2D(tDiffuse, vUv);",
                    "        gl_FragColor = vec4(pow(texColor.rgb, vec3(1.0 / 2.2)), texColor.a);",
                    "        return;",
                    "    }",
                    "",
                    "    float theta = theta_d;",
                    "    for (int i = 0; i < 4; i++) {",
                    "        float theta2 = theta * theta;",
                    "        float theta4 = theta2 * theta2;",
                    "        float theta6 = theta4 * theta2;",
                    "        float theta8 = theta4 * theta4;",
                    "",
                    "        float f = theta * (1.0 + uK.x * theta2 + uK.y * theta4 + uK.z * theta6 + uK.w * theta8) - theta_d;",
                    "        float df = 1.0 + 3.0 * uK.x * theta2 + 5.0 * uK.y * theta4 + 7.0 * uK.z * theta6 + 9.0 * uK.w * theta8;",
                    "",
                    "        if (abs(df) > 1e-6) {",
                    "            theta -= f / df;",
                    "        }",
                    "    }",
                    "",
                    "    float safe_theta = clamp(theta, -1.55, 1.55);",
                    "    float r = tan(safe_theta);",
                    "",
                    "    vec2 p_undist = (p_dist / theta_d) * r;",
                    "    p_undist.x *= uFocal.x;",
                    "    p_undist.y *= uFocal.y;",
                    "",
                    "    vec2 uv_src = (p_undist / vec2(uAspect, 1.0)) + uCenter;",
                    "",
                    "    if (uv_src.x < 0.0 || uv_src.x > 1.0 || uv_src.y < 0.0 || uv_src.y > 1.0) {",
                    "        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);",
                    "    } else {",
                    "        vec4 texColor = texture2D(tDiffuse, uv_src);",
                    "        gl_FragColor = vec4(pow(texColor.rgb, vec3(1.0 / 2.2)), texColor.a);",
                    "    }",
                    "}"
                ].join("\n")
            });
            fisheyeMesh = new THREE.Mesh(geo, mat);
            fisheyeScene.add(fisheyeMesh);
        }

        if (fisheyeMesh && fisheyeMesh.material && fisheyeMesh.material.uniforms) {
            fisheyeMesh.material.uniforms.tDiffuse.value = fisheyeRenderTarget.texture;
            if (fisheyeMesh.material.uniforms.uAspect) {
                fisheyeMesh.material.uniforms.uAspect.value = (rw && rh) ? (rw / rh) : (window.innerWidth / window.innerHeight);
            }
        }
    }

    function initScene() {
        var container = document.getElementById("canvas-container");
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);
        scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

        var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        if (typeof THREE.ACESFilmicToneMapping !== "undefined") {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.05;
        }
        if (typeof THREE.SRGBColorSpace !== "undefined") {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (container) {
            container.innerHTML = "";
            container.appendChild(renderer.domElement);
        }

        // Lighting
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);

        var hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.6);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        var mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(5, 8, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.bias = -0.0001;
        mainLight.shadow.normalBias = 0.02;
        scene.add(mainLight);

        var fillLight = new THREE.DirectionalLight(0x94a3b8, 0.4);
        fillLight.position.set(-5, 6, -5);
        scene.add(fillLight);

        var controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 + 0.05;
        controls.minDistance = 0.5;
        controls.maxDistance = 25;

        // Default Free View Camera Position & Target
        camera.position.set(4, 3, 5);
        controls.target.set(0, 0.5, 0);
        controls.update();

        controls.addEventListener("change", function () {
            requestRenderFrame(5);
        });

        window.addEventListener("resize", function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            setupFisheyePipeline(window.innerWidth, window.innerHeight);
            requestRenderFrame(15);
        });

        // Initialize distortion pipeline
        setupFisheyePipeline(window.innerWidth, window.innerHeight);

        global.scene = scene;
        global.camera = camera;
        global.renderer = renderer;
        global.controls = controls;

        return { scene: scene, camera: camera, renderer: renderer, controls: controls };
    }

    function renderFrame(delta) {
        if (typeof TWEEN !== "undefined") {
            TWEEN.update();
        }

        var isScanning = global.AppState && global.AppState.gantry && global.AppState.gantry.isScanning;
        var rpm = global.AppState && global.AppState.gantry ? global.AppState.gantry.rotorSpeed : 0;
        var activeIdx = global.AppState && global.AppState.gantry ? global.AppState.gantry.activeBatchIndex : -1;

        if (isScanning || rpm > 0 || activeIdx >= 0) {
            requestRenderFrame(10);
        }

        if (global.controls && global.controls.update) {
            global.controls.update();
        }

        if (isEcoModeEnabled && renderDemandCount <= 0) {
            return;
        }

        if (renderDemandCount > 0) {
            renderDemandCount--;
        }

        if (isFisheyeEnabled && fisheyeRenderTarget && fisheyeScene && fisheyeCamera) {
            global.renderer.setRenderTarget(fisheyeRenderTarget);
            global.renderer.render(global.scene, global.camera);
            global.renderer.setRenderTarget(null);
            global.renderer.render(fisheyeScene, fisheyeCamera);
        } else {
            global.renderer.setRenderTarget(null);
            global.renderer.render(global.scene, global.camera);
        }
    }

    // Public API
    global.CTSceneManager = {
        init: initScene,
        renderFrame: renderFrame,
        requestRenderFrame: requestRenderFrame,
        toggleFisheye: toggleFisheye,
        updateCameraDistortion: updateCameraDistortion,
        toggleEcoMode: toggleEcoMode,
        setGraphicsQuality: setGraphicsQuality,
        toggleLaserAlignment: toggleLaserAlignment,
        toggleWaterPhantom: toggleWaterPhantom,
        toggleAxesHelper: toggleAxesHelper,
        setupFisheyePipeline: setupFisheyePipeline,
    };

    // Exports for global callers
    global.requestRenderFrame = requestRenderFrame;
    global.toggleFisheye = toggleFisheye;
    global.updateCameraDistortion = updateCameraDistortion;
    global.toggleEcoMode = toggleEcoMode;
    global.setGraphicsQuality = setGraphicsQuality;
    global.toggleLaserAlignment = toggleLaserAlignment;
    global.toggleWaterPhantom = toggleWaterPhantom;
    global.toggleAxesHelper = toggleAxesHelper;
})(typeof window !== "undefined" ? window : this);