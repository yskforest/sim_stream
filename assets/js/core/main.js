// CT 3D Simulator - Main Application Orchestrator
window.Meshes = window.Meshes || {};

(function initApp(global) {
    "use strict";

    var clock = null;

    function init() {
        clock = typeof THREE.Timer === "function" ? new THREE.Timer() : new THREE.Clock();

        // 1. Initialize Profile & Config
        if (global.CTProfileService && global.CTDefaultProfile) {
            global.CTProfileService.init(global.CTDefaultProfile);
        }

        // 2. Initialize Three.js Scene & Viewport
        var sceneContext = global.CTSceneManager.init();
        global.scene = sceneContext.scene;
        global.camera = sceneContext.camera;
        global.renderer = sceneContext.renderer;
        global.controls = sceneContext.controls;

        // 3. Initialize FPS Controls
        if (global.CTFPSControls && typeof global.CTFPSControls.init === "function") {
            global.CTFPSControls.init(global.camera, global.renderer.domElement);
        }

        // 4. Build 3D Models
        if (typeof global.buildRoom === "function") global.buildRoom();
        if (typeof global.buildCTScanner === "function") global.buildCTScanner();
        if (typeof global.buildInjector === "function") global.buildInjector();
        if (typeof global.buildControlRoom === "function") global.buildControlRoom();
        if (typeof global.buildServerRack === "function") global.buildServerRack();

        if (global.CTSceneSync) global.CTSceneSync.setup();

        // 5. Initialize UI Controller & Bindings
        if (global.CTUIController && typeof global.CTUIController.setup === "function") {
            global.CTUIController.setup();
        }

        // 6. Set Default View
        if (typeof global.setCameraView === "function") {
            global.setCameraView("free");
        }

        if (global.CTStore) global.CTStore.notify();

        // 7. Subscribe demand render triggers
        if (global.CTStore) {
            global.CTStore.subscribe(function () {
                global.requestRenderFrame(20);
            });
        }

        window.addEventListener("pointerdown", function () { global.requestRenderFrame(30); });
        window.addEventListener("mousemove", function () {
            if (global.controls && global.controls.state !== -1) {
                global.requestRenderFrame(10);
            }
        });

        // 8. Start Render Loop
        requestAnimationFrame(animate);
    }

    function animate(time) {
        var renderStart = performance.now();
        requestAnimationFrame(animate);

        var currentTime = time !== undefined ? time : performance.now();
        if (typeof clock.update === "function") {
            clock.update(currentTime);
        }
        var delta = typeof clock.getDelta === "function" ? clock.getDelta() : 0.016;

        // Update Rotor Movement
        var isRotorMoving = false;
        if (global.Meshes && global.Meshes.rotor && global.AppState && global.AppState.gantry && global.AppState.gantry.rotorSpeed > 0) {
            isRotorMoving = true;
            var radPerSec = (global.AppState.gantry.rotorSpeed * Math.PI * 2) / 60;
            global.Meshes.rotor.rotation.z += radPerSec * delta;
            global.CTStore.patch("gantry", { angle: global.Meshes.rotor.rotation.z % (Math.PI * 2) }, { silent: true });
        }

        // Update server rack LEDs
        if (global.Meshes && global.Meshes.serverLeds && isRotorMoving) {
            global.Meshes.serverLeds.forEach(function (mat) {
                if (Math.random() > 0.85) {
                    mat.opacity = Math.random();
                }
            });
        }

        // Update FPS Controls if active
        if (global.CTFPSControls && typeof global.CTFPSControls.isEnabled === "function" && global.CTFPSControls.isEnabled()) {
            global.CTFPSControls.update(delta);
        }

        // Delegate rendering to SceneManager
        global.CTSceneManager.renderFrame(delta);

        // Performance telemetry
        if (global.CTPerformanceService && typeof global.CTPerformanceService.recordRenderFrame === "function") {
            global.CTPerformanceService.recordRenderFrame(renderStart, global.renderer);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})(typeof window !== "undefined" ? window : this);
