const fs = require("fs");
const path = require("path");

function verifyUILayout() {
    console.log("=== Verifying UI Layout & Logic ===");

    const htmlPath = path.resolve(__dirname, "../index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    const cssPath = path.resolve(__dirname, "../assets/css/ct-simulator.css");
    const css = fs.readFileSync(cssPath, "utf-8");

    const uiJsPath = path.resolve(__dirname, "../assets/js/adapters/ui/ui-controller.js");
    const uiJs = fs.readFileSync(uiJsPath, "utf-8");

    const sceneManagerPath = path.resolve(__dirname, "../assets/js/view/scene-manager.js");
    const sceneManagerJs = fs.readFileSync(sceneManagerPath, "utf-8");

    const fpsControlsPath = path.resolve(__dirname, "../assets/js/view/fps-controls.js");
    const fpsControlsJs = fs.readFileSync(fpsControlsPath, "utf-8");

    const cameraPresetsPath = path.resolve(__dirname, "../assets/js/view/camera-presets.js");
    const cameraPresetsJs = fs.readFileSync(cameraPresetsPath, "utf-8");

    // 1. Verify Top App Bar & Switcher
    const requiredIds = [
        "top-app-bar",
        "status-app-mode",
        "pill-mode-mock",
        "pill-mode-external",
        "btn-eco-toggle",
        "btn-hud-toggle",
        "btn-toggle-dock",
        "btn-toggle-right-sidebar",
        // Right sidebar
        "right-sidebar",
        "tab-right-view",
        "tab-right-lens",
        "tab-right-stream",
        "tab-right-patient",
        "select-camera-view",
        "select-focus",
        "btn-gantry-opaque",
        "btn-gantry-trans",
        "btn-laser-toggle",
        "select-graphics-quality",
        "btn-xray-toggle",
        "btn-phantom-toggle",
        "btn-axes-toggle",
        "btn-patient-toggle",
        // Distortion
        "input-distortion-enable",
        "btn-fisheye-toggle",
        "select-distortion-preset",
        "slider-distortion-k1",
        "slider-distortion-k2",
        "slider-distortion-k3",
        "slider-distortion-k4",
        "slider-distortion-fx",
        "slider-distortion-fy",
        "slider-distortion-cx",
        "slider-distortion-cy",
        "slider-distortion-zoom",
        // Stream
        "select-stream-codec",
        "select-stream-proto",
        "select-stream-fps",
        "select-stream-quality",
        "input-stream-width",
        "input-stream-height",
        "input-stream-hfov",
        "btn-camera-stream-toggle",
        "stream-url-display",
        // Patient 9-DOF
        "select-patient-glb",
        "slider-patient-pos-x",
        "slider-patient-pos-y",
        "slider-patient-pos-z",
        "slider-patient-pos-rotX",
        "slider-patient-pos-rotY",
        "slider-patient-pos-rotZ",
        "slider-patient-pos-scaleX",
        "slider-patient-pos-scaleY",
        "slider-patient-pos-scaleZ",
        "input-add-glb-path",
        // Bottom dock (Scan Console / HW Settings / HW Monitor / Command Log)
        "bottom-dock",
        "tab-dock-scan",
        "mock-console-overlay",
        "mock-console-controls",
        "btn-scan-toggle",
        "slider-rotor-speed",
        "batch-container",
        "btn-add-batch",
        "btn-run-sequence",
        "tab-dock-hw",
        "select-detector-rows",
        "slider-couch-y",
        "slider-couch-z",
        "slider-inject-a",
        "slider-inject-b",
        "tab-dock-monitor",
        "tab-dock-log",
        "status-badge",
        "monitor-rpm",
        "monitor-rpm-bar",
        "monitor-mode",
        "monitor-rows",
        "monitor-couch-y",
        "monitor-couch-z",
        "monitor-inj-a",
        "monitor-inj-b",
        "monitor-last-source",
        "monitor-last-result",
        "monitor-last-error",
        "command-log-list",
        "btn-clear-command-log"
    ];

    let missingIds = [];
    requiredIds.forEach(id => {
        if (!html.includes(`id="${id}"`)) {
            missingIds.push(id);
        }
    });

    if (missingIds.length > 0) {
        console.error("FAIL: Missing HTML elements by ID:", missingIds);
        process.exit(1);
    }
    console.log(`PASS: All ${requiredIds.length} required UI element IDs exist in index.html`);

    // 2. Verify UI Controller functions
    const requiredFunctions = [
        "switchRightTab",
        "switchDockTab",
        "toggleRightSidebar",
        "toggleBottomDock",
        "setConsoleMockMode",
        "onDistortionParamInput",
        "onDistortionPresetChange",
        "resetDistortionParamsUI"
    ];

    let missingFuncs = [];
    requiredFunctions.forEach(fn => {
        if (!uiJs.includes(fn)) {
            missingFuncs.push(fn);
        }
    });

    if (missingFuncs.length > 0) {
        console.error("FAIL: Missing UI Controller functions:", missingFuncs);
        process.exit(1);
    }
    console.log(`PASS: All ${requiredFunctions.length} UI controller navigation functions exist`);

    const performanceJs = fs.readFileSync(path.resolve(__dirname, "../assets/js/core/services/performance-service.js"), "utf8");
    const actionSources = [html, uiJs, performanceJs].join("\n");
    const declaredActions = [...actionSources.matchAll(/data-action=["']([^"']+)["']/g)].map(match => match[1]);
    const missingActions = [...new Set(declaredActions)].filter(action => !uiJs.includes(`action === "${action}"`));
    if (missingActions.length > 0) {
        console.error("FAIL: Delegated UI actions without handlers:", missingActions);
        process.exit(1);
    }
    console.log(`PASS: All ${new Set(declaredActions).size} delegated UI actions have handlers`);

    // 3. Verify cross-file UI wiring that simple ID-presence checks cannot catch.
    const wiringChecks = [
        {
            ok: uiJs.includes('byId("batch-container")') && !uiJs.includes('byId("batch-list-container")'),
            message: 'Batch renderer targets the HTML element "batch-container"'
        },
        {
            ok: uiJs.includes('byId("btn-run-sequence")') && !uiJs.includes('byId("btn-run-seq")'),
            message: 'Sequence runner UI targets the HTML button "btn-run-sequence"'
        },
        {
            ok: uiJs.includes('global.CTSequenceRunner.isRunning()') &&
                html.includes('data-action="toggle-sequence"') && uiJs.includes('sequence.stopAutoSequence() : sequence.runAutoSequence()'),
            message: 'Sequence UI reads runner state and delegates the RUN/STOP action'
        },
        {
            ok: html.includes('data-action="toggle-axes"') && uiJs.includes('scene.toggleAxesHelper()'),
            message: 'World-axes control uses delegated actions and the scene-manager namespace'
        },
        {
            ok: sceneManagerJs.includes('if (demandFrames <= 0) return;') && !sceneManagerJs.includes('if (isEco && demandFrames <= 0) return;'),
            message: 'Demand-driven rendering skips idle frames in every graphics mode'
        },
        {
            ok: sceneManagerJs.includes('if (isFpsActive) requestRenderFrame(2);') &&
                fpsControlsJs.includes('requestFPSRender(2);'),
            message: 'FPS mode continuously requests frames from the demand-driven renderer'
        },
        {
            ok: cameraPresetsJs.includes('if (isFree || isFPS)') &&
                !html.includes('onchange="setCameraView(this.value)"'),
            message: 'Free/FPS transitions preserve the current view and camera selection has one change handler'
        },
        {
            ok: fpsControlsJs.includes('window.addEventListener("blur", resetInputState') &&
                fpsControlsJs.includes('document.addEventListener("visibilitychange"') &&
                fpsControlsJs.includes('window.controls.target.copy(target)'),
            message: 'FPS input resets on focus loss and keeps the OrbitControls target synchronized'
        },
        {
            ok: uiJs.includes('byId("val-distortion-" + k)') && !uiJs.includes('updateDistortionParameters'),
            message: 'Distortion controls update existing value labels without calling a missing service method'
        },
        {
            ok: uiJs.includes('["sliderCouchY", "couch", "moveY"]') &&
                uiJs.includes('["sliderCouchZ", "couch", "moveZ"]') &&
                uiJs.includes('["sliderInjectA", "injector", "setA"]') &&
                uiJs.includes('["sliderInjectB", "injector", "setB"]'),
            message: 'HW sliders use actions supported by the command bus'
        },
        {
            ok: uiJs.includes('executeCommand("gantry", "setRotorSpeed", { value:') &&
                uiJs.includes('executeCommand("gantry", "setDetectorRows", { value:'),
            message: 'Gantry settings use the canonical params.value contract'
        }
    ];

    const failedWiring = wiringChecks.filter(check => !check.ok).map(check => check.message);
    if (failedWiring.length > 0) {
        console.error("FAIL: Broken cross-file UI wiring:", failedWiring);
        process.exit(1);
    }
    console.log(`PASS: All ${wiringChecks.length} cross-file UI wiring checks passed`);

    // 4. Verify CSS rules
    const requiredCssRules = [
        "#top-app-bar",
        "#right-sidebar",
        "#bottom-dock",
        ".sidebar-tabs",
        ".tab-btn",
        ".tab-pane",
        ".mode-pill-group",
        ".mode-pill-btn",
        ".external-mode-overlay"
    ];

    let missingCss = [];
    requiredCssRules.forEach(rule => {
        if (!css.includes(rule)) {
            missingCss.push(rule);
        }
    });

    if (missingCss.length > 0) {
        console.error("FAIL: Missing CSS rules:", missingCss);
        process.exit(1);
    }
    console.log(`PASS: All ${requiredCssRules.length} CSS rules exist in ct-simulator.css`);

    console.log("\nALL UI VERIFICATION TESTS PASSED SUCCESSFULLY!");
}

verifyUILayout();
