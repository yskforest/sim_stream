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
        "switchLeftTab",
        "switchRightTab",
        "switchDockTab",
        "toggleLeftSidebar",
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

    // 3. Verify CSS rules
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
