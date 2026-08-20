import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { GLTFLoader } from "three/addons/GLTFLoader.js";

// Composition root. Control-core modules use explicit ES imports; remaining
// Three.js compatibility modules are migrated behind namespaced boundaries.
window.THREE = Object.assign({}, THREE, { OrbitControls, GLTFLoader });

const scripts = [
    "./assets/vendor/tween/tween.umd.js",
    "./assets/js/core/config/config-service.js",
    "./assets/js/core/config/models-config.js",
    "./assets/js/core/store.js",
    "./assets/js/core/state.js",
    "./assets/js/core/profile/default-profile.js",
    "./assets/js/core/profile/profile-service.js",
    "./assets/js/core/hw/gantry-sim.js",
    "./assets/js/core/hw/couch-sim.js",
    "./assets/js/core/hw/injector-sim.js",
    "./assets/js/core/hw/camera-sim.js",
    "./assets/js/core/services/simulator-service.js",
    "./assets/js/core/commands/command-catalog.js",
    "./assets/js/core/commands/command-bus.js",
    "./assets/js/core/services/command-log-service.js",
    "./assets/js/core/services/video-stream-service.js",
    "./assets/js/core/services/sequence-runner.js",
    "./assets/js/core/services/model-registry.js",
    "./assets/js/core/services/performance-service.js",
    "./assets/js/adapters/external/protocol-v1.js",
    "./assets/js/adapters/external/external-gateway.js",
    "./assets/js/adapters/video/canvas-capturer.js",
    "./assets/js/adapters/video/stream-gateway.js",
    "./assets/js/adapters/ui/ui-controller.js",
    "./assets/js/view/scene-manager.js",
    "./assets/js/view/scene-sync.js",
    "./assets/js/view/fps-controls.js",
    "./assets/js/view/camera-presets.js",
    "./assets/js/view/models/mesh-factory.js",
    "./assets/js/view/models/gantry-model.js",
    "./assets/js/view/models/injector-model.js",
    "./assets/js/view/models/room-model.js",
    "./assets/js/core/main.js"
];

for (const path of scripts) {
    await import(new URL("../../../" + path, import.meta.url));
    if (path.endsWith("config-service.js")) await window.CTConfigService.loadConfig();
}
