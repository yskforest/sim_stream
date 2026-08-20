// CT 3D Simulator - Three.js Scene, Pipeline & Render Loop Manager (Slim & Modular)
(function attachSceneManager(global) {
    "use strict";

    var isFisheye = false, isEco = false, demandFrames = 60;
    var rt = null, fCam = null, fScene = null, fMesh = null;

    var requestRenderFrame = function (n) { demandFrames = Math.max(demandFrames || 0, typeof n === "number" ? n : 15); };

    function toggleFisheye(en) {
        isFisheye = typeof en === "boolean" ? en : !isFisheye;
        if (global.AppState && global.AppState.distortion) global.AppState.distortion.enabled = isFisheye;
        var btn = document.getElementById("btn-fisheye-toggle"), toggle = document.getElementById("input-distortion-enable");
        if (btn) { btn.style.backgroundColor = isFisheye ? "#7e22ce" : ""; btn.textContent = isFisheye ? "Disable Fisheye Lens" : "Toggle Fisheye Lens"; }
        if (toggle) toggle.checked = isFisheye;
        requestRenderFrame(30);
    }

    function updateCameraDistortion(p) {
        var params = p || (global.AppState && global.AppState.distortion);
        if (!params) return;
        if (params.enabled !== undefined) toggleFisheye(params.enabled);
        if (fMesh && fMesh.material && fMesh.material.uniforms) {
            var u = fMesh.material.uniforms;
            if (u.uK && params.k1 !== undefined) u.uK.value.set(params.k1 || 0, params.k2 || 0, params.k3 || 0, params.k4 || 0);
            if (u.uFocal && params.fx !== undefined) u.uFocal.value.set(params.fx || 1.0, params.fy || 1.0);
            if (u.uCenter && params.cx !== undefined) u.uCenter.value.set(params.cx !== undefined ? params.cx : 0.5, params.cy !== undefined ? params.cy : 0.5);
            if (u.uZoom && params.zoom !== undefined) u.uZoom.value = params.zoom || 1.0;
        }
        requestRenderFrame(15);
    }

    function toggleEcoMode(en) {
        isEco = typeof en === "boolean" ? en : !isEco;
        var btn = document.getElementById("btn-eco-toggle");
        if (btn) {
            btn.className = isEco ? "top-bar-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-400" : "top-bar-btn border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/60 font-bold";
            btn.textContent = isEco ? "ECO: ON" : "ECO";
        }
        setGraphicsQuality(isEco ? "eco" : "high");
        requestRenderFrame(30);
    }

    function setGraphicsQuality(mode) {
        if (!global.renderer) return;
        var isHigh = mode === "high";
        global.renderer.setPixelRatio(isHigh ? Math.min(window.devicePixelRatio, 2) : 0.85);
        if (typeof THREE.ACESFilmicToneMapping !== "undefined") {
            global.renderer.toneMapping = isHigh ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
            if (isHigh) global.renderer.toneMappingExposure = 1.05;
        }
        global.renderer.shadowMap.enabled = isHigh;
    }

    function toggleObjectVisibility(meshKey, btnId, activeClass, inactiveClass, textOn, textOff) {
        var meshes = global.Meshes || window.Meshes;
        if (!meshes || !meshes[meshKey]) return;
        var vis = !meshes[meshKey].visible;
        meshes[meshKey].visible = vis;
        var btn = document.getElementById(btnId);
        if (btn) {
            if (activeClass && inactiveClass) btn.className = vis ? activeClass : inactiveClass;
            if (textOn && textOff) btn.textContent = vis ? textOff : textOn;
        }
        requestRenderFrame(15);
    }

    var toggleLaserAlignment = function () {
        toggleObjectVisibility("laserGroup", "btn-laser-toggle", "top-bar-btn bg-rose-600 hover:bg-rose-500 text-white font-bold border border-rose-400 shadow-md shadow-rose-900/40", "top-bar-btn border-rose-500/50 text-rose-300 hover:bg-rose-950/60 font-bold");
    };
    var toggleWaterPhantom = function () {
        toggleObjectVisibility("phantomGroup", "btn-phantom-toggle", "top-bar-btn bg-sky-600 hover:bg-sky-500 text-white font-bold border border-sky-400 shadow-md shadow-sky-900/40", "top-bar-btn border-sky-500/50 text-sky-300 hover:bg-sky-950/60 font-bold");
    };
    var toggleAxesHelper = function () {
        toggleObjectVisibility("worldAxesGroup", "btn-axes-toggle", "top-bar-btn bg-amber-600 hover:bg-amber-500 text-white font-bold border border-amber-400 shadow-md shadow-amber-900/40", "top-bar-btn border-amber-500/50 text-amber-300 hover:bg-amber-950/60 font-bold");
    };

    function setupFisheyePipeline(rw, rh) {
        if (!rt || rt.width !== rw || rt.height !== rh) {
            if (rt) rt.dispose();
            rt = new THREE.WebGLRenderTarget(rw, rh, { format: THREE.RGBAFormat, samples: 4, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
        }
        if (!fScene) {
            fScene = new THREE.Scene();
            fCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            var d = (global.AppState && global.AppState.distortion) || {};
            var mat = new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse: { value: null },
                    uK: { value: new THREE.Vector4(d.k1 || 0.1, d.k2 || 0.05, d.k3 || 0, d.k4 || 0) },
                    uFocal: { value: new THREE.Vector2(d.fx || 1.0, d.fy || 1.0) },
                    uCenter: { value: new THREE.Vector2(d.cx !== undefined ? d.cx : 0.5, d.cy !== undefined ? d.cy : 0.5) },
                    uZoom: { value: d.zoom || 1.0 },
                    uAspect: { value: (rw && rh) ? (rw / rh) : (window.innerWidth / window.innerHeight) }
                },
                vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",
                fragmentShader: "uniform sampler2D tDiffuse; uniform vec4 uK; uniform vec2 uFocal, uCenter; uniform float uZoom, uAspect; varying vec2 vUv;\n" +
                    "void main() {\n" +
                    "  vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0) / max(uZoom, 0.01) / max(uFocal, vec2(0.001));\n" +
                    "  float td = length(p);\n" +
                    "  if (td < 1e-6) { gl_FragColor = vec4(pow(texture2D(tDiffuse, vUv).rgb, vec3(0.4545)), 1.0); return; }\n" +
                    "  float th = td;\n" +
                    "  for (int i = 0; i < 4; i++) {\n" +
                    "    float t2 = th*th, t4 = t2*t2, t6 = t4*t2, t8 = t4*t4;\n" +
                    "    float f = th * (1.0 + uK.x*t2 + uK.y*t4 + uK.z*t6 + uK.w*t8) - td;\n" +
                    "    float df = 1.0 + 3.0*uK.x*t2 + 5.0*uK.y*t4 + 7.0*uK.z*t6 + 9.0*uK.w*t8;\n" +
                    "    if (abs(df) > 1e-6) th -= f / df;\n" +
                    "  }\n" +
                    "  vec2 uv = ((p / td) * tan(clamp(th, -1.55, 1.55)) * uFocal) / vec2(uAspect, 1.0) + uCenter;\n" +
                    "  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n" +
                    "  else gl_FragColor = vec4(pow(texture2D(tDiffuse, uv).rgb, vec3(0.4545)), texture2D(tDiffuse, uv).a);\n" +
                    "}"
            });
            fMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
            fScene.add(fMesh);
        }
        if (fMesh && fMesh.material && fMesh.material.uniforms) {
            fMesh.material.uniforms.tDiffuse.value = rt.texture;
            if (fMesh.material.uniforms.uAspect) fMesh.material.uniforms.uAspect.value = (rw && rh) ? (rw / rh) : (window.innerWidth / window.innerHeight);
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
        if (typeof THREE.ACESFilmicToneMapping !== "undefined") { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
        if (typeof THREE.SRGBColorSpace !== "undefined") renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (container) { container.innerHTML = ""; container.appendChild(renderer.domElement); }

        scene.add(new THREE.AmbientLight(0xffffff, 0.85));
        var hemi = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.6); hemi.position.set(0, 20, 0); scene.add(hemi);

        var mainL = new THREE.DirectionalLight(0xffffff, 1.2); mainL.position.set(5, 8, 5); mainL.castShadow = true;
        mainL.shadow.mapSize.width = 2048; mainL.shadow.mapSize.height = 2048; mainL.shadow.bias = -0.0001; mainL.shadow.normalBias = 0.02; scene.add(mainL);
        var fillL = new THREE.DirectionalLight(0x94a3b8, 0.4); fillL.position.set(-5, 6, -5); scene.add(fillL);

        var controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.dampingFactor = 0.05; controls.maxPolarAngle = Math.PI / 2 + 0.05;
        controls.minDistance = 0.5; controls.maxDistance = 25;
        camera.position.set(4, 3, 5); controls.target.set(0, 0.5, 0); controls.update();

        controls.addEventListener("change", function () { requestRenderFrame(5); });
        window.addEventListener("resize", function () {
            camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight); setupFisheyePipeline(window.innerWidth, window.innerHeight);
            requestRenderFrame(15);
        });

        setupFisheyePipeline(window.innerWidth, window.innerHeight);
        Object.assign(global, { scene: scene, camera: camera, renderer: renderer, controls: controls });
        return { scene: scene, camera: camera, renderer: renderer, controls: controls };
    }

    function renderFrame(delta) {
        if (typeof TWEEN !== "undefined") TWEEN.update();
        var gantry = global.AppState && global.AppState.gantry;
        if (gantry && (gantry.isScanning || gantry.rotorSpeed > 0 || gantry.activeBatchIndex >= 0)) requestRenderFrame(10);
        var isFpsActive = global.CTFPSControls && typeof global.CTFPSControls.isEnabled === "function" && global.CTFPSControls.isEnabled();
        if (isFpsActive) requestRenderFrame(2);
        if (global.controls && global.controls.update) global.controls.update();

        if (demandFrames <= 0) return;
        if (demandFrames > 0) demandFrames--;

        var activeStream = (global.CTVideoStreamService && typeof global.CTVideoStreamService.getActiveStream === "function")
            ? global.CTVideoStreamService.getActiveStream() : null;

        var isStreamingMain = activeStream && activeStream.isStreaming && activeStream.mode === "main";

        if (isStreamingMain) {
            requestRenderFrame(5);
            var sw = activeStream.width || 1280, sh = activeStream.height || 720;
            var targetAspect = sw / sh;
            global.camera.aspect = targetAspect;

            if (typeof activeStream.hfov === "number" && activeStream.hfov > 0) {
                var hfovRad = (activeStream.hfov * Math.PI) / 180;
                var vfovRad = 2 * Math.atan(Math.tan(hfovRad / 2) / targetAspect);
                global.camera.fov = (vfovRad * 180) / Math.PI;
            }
            global.camera.updateProjectionMatrix();

            var winW = (typeof window !== "undefined" && window.innerWidth) || sw;
            var winH = (typeof window !== "undefined" && window.innerHeight) || sh;
            var winAspect = winW / winH;

            var vpW, vpH, vpX, vpY;
            if (winAspect > targetAspect) {
                vpH = winH; vpW = vpH * targetAspect;
                vpX = Math.floor((winW - vpW) / 2); vpY = 0;
            } else {
                vpW = winW; vpH = vpW / targetAspect;
                vpX = 0; vpY = Math.floor((winH - vpH) / 2);
            }

            global.renderer.setScissorTest(true);
            global.renderer.setClearColor(0x000000, 1.0);
            global.renderer.setViewport(0, 0, winW, winH);
            global.renderer.setScissor(0, 0, winW, winH);
            global.renderer.clear();

            global.renderer.setViewport(vpX, vpY, Math.floor(vpW), Math.floor(vpH));
            global.renderer.setScissor(vpX, vpY, Math.floor(vpW), Math.floor(vpH));

            if (isFisheye && rt && fScene && fCam) {
                setupFisheyePipeline(sw, sh);
                global.renderer.setRenderTarget(rt);
                global.renderer.render(global.scene, global.camera);
                global.renderer.setRenderTarget(null);
                global.renderer.render(fScene, fCam);
            } else {
                global.renderer.setRenderTarget(null);
                global.renderer.render(global.scene, global.camera);
            }

            global.renderer.setScissorTest(false);
            if (typeof window !== "undefined") {
                window.activeViewportBounds = { x: vpX, y: vpY, w: Math.floor(vpW), h: Math.floor(vpH), winW: winW, winH: winH };
            }
        } else {
            if (typeof window !== "undefined") {
                window.activeViewportBounds = null;
                var currAspect = window.innerWidth / window.innerHeight;
                if (global.camera && Math.abs(global.camera.aspect - currAspect) > 0.001) {
                    global.camera.aspect = currAspect;
                    global.camera.fov = 50;
                    global.camera.updateProjectionMatrix();
                }
            }
            global.renderer.setScissorTest(false);
            global.renderer.setViewport(0, 0, (typeof window !== "undefined" ? window.innerWidth : 1280), (typeof window !== "undefined" ? window.innerHeight : 720));

            if (isFisheye && rt && fScene && fCam) {
                global.renderer.setRenderTarget(rt);
                global.renderer.render(global.scene, global.camera);
                global.renderer.setRenderTarget(null);
                global.renderer.render(fScene, fCam);
            } else {
                global.renderer.setRenderTarget(null);
                global.renderer.render(global.scene, global.camera);
            }
        }
    }

    var manager = {
        init: initScene, renderFrame: renderFrame, requestRenderFrame: requestRenderFrame,
        toggleFisheye: toggleFisheye, updateCameraDistortion: updateCameraDistortion,
        toggleEcoMode: toggleEcoMode, setGraphicsQuality: setGraphicsQuality,
        toggleLaserAlignment: toggleLaserAlignment, toggleWaterPhantom: toggleWaterPhantom,
        toggleAxesHelper: toggleAxesHelper, toggleWorldAxes: toggleAxesHelper,
        setupFisheyePipeline: setupFisheyePipeline
    };

    global.CTSceneManager = manager;
    Object.assign(global, manager);
})(typeof window !== "undefined" ? window : this);
