(function attachFPSControls(global) {
    var camera = null;
    var domElement = null;
    var isEnabled = false;

    var keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        sprint: false
    };

    var yaw = 0;   // Horizontal rotation (radians)
    var pitch = 0; // Vertical rotation (radians)

    var moveSpeed = 2.5;  // Normal speed (m/s)
    var sprintFactor = 2.2; // Fast speed multiplier
    var mouseSensitivity = 0.0025;

    var isMouseDown = false;
    var lastMouseX = 0;
    var lastMouseY = 0;

    function onKeyDown(e) {
        if (!isEnabled) return;
        // Don't capture keys when user is typing in input fields
        var activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "SELECT" || activeEl.tagName === "TEXTAREA")) {
            return;
        }

        switch (e.code) {
            case "KeyW":
            case "ArrowUp":
                keys.forward = true;
                break;
            case "KeyS":
            case "ArrowDown":
                keys.backward = true;
                break;
            case "KeyA":
            case "ArrowLeft":
                keys.left = true;
                break;
            case "KeyD":
            case "ArrowRight":
                keys.right = true;
                break;
            case "KeyE":
            case "Space":
                keys.up = true;
                break;
            case "KeyQ":
                keys.down = true;
                break;
            case "ShiftLeft":
            case "ShiftRight":
                keys.sprint = true;
                break;
        }
    }

    function onKeyUp(e) {
        switch (e.code) {
            case "KeyW":
            case "ArrowUp":
                keys.forward = false;
                break;
            case "KeyS":
            case "ArrowDown":
                keys.backward = false;
                break;
            case "KeyA":
            case "ArrowLeft":
                keys.left = false;
                break;
            case "KeyD":
            case "ArrowRight":
                keys.right = false;
                break;
            case "KeyE":
            case "Space":
                keys.up = false;
                break;
            case "KeyQ":
                keys.down = false;
                break;
            case "ShiftLeft":
            case "ShiftRight":
                keys.sprint = false;
                break;
        }
    }

    function onMouseDown(e) {
        if (!isEnabled) return;
        // Accept left or right mouse drag over canvas
        if (e.target === domElement || (domElement && domElement.contains(e.target))) {
            isMouseDown = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    }

    function onMouseUp() {
        isMouseDown = false;
    }

    function onMouseMove(e) {
        if (!isEnabled || !isMouseDown) return;

        var deltaX = e.clientX - lastMouseX;
        var deltaY = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        yaw -= deltaX * mouseSensitivity;
        pitch -= deltaY * mouseSensitivity;

        // Clamp pitch to avoid flipping upside down (-85 deg to +85 deg)
        var maxPitch = (Math.PI / 2) - 0.05;
        pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

        updateCameraRotation();
    }

    function updateCameraRotation() {
        if (!camera) return;

        // Calculate look direction from yaw and pitch
        var dir = new THREE.Vector3(
            -Math.sin(yaw) * Math.cos(pitch),
            Math.sin(pitch),
            -Math.cos(yaw) * Math.cos(pitch)
        );

        var target = camera.position.clone().add(dir);
        camera.lookAt(target);
    }

    function syncAnglesFromCamera() {
        if (!camera) return;

        var dir = new THREE.Vector3();
        camera.getWorldDirection(dir);

        pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y)));
        yaw = Math.atan2(-dir.x, -dir.z);
    }

    var fpsControls = {
        init: function init(cam, element) {
            camera = cam;
            domElement = element || document.body;

            window.addEventListener("keydown", onKeyDown, false);
            window.addEventListener("keyup", onKeyUp, false);
            window.addEventListener("mousedown", onMouseDown, false);
            window.addEventListener("mouseup", onMouseUp, false);
            window.addEventListener("mousemove", onMouseMove, false);
        },

        enable: function enable() {
            isEnabled = true;
            syncAnglesFromCamera();
            updateCameraRotation();

            var hud = document.getElementById("fps-hud-guide");
            if (hud) hud.classList.remove("hidden");
        },

        disable: function disable() {
            isEnabled = false;
            // Reset pressed key states
            Object.keys(keys).forEach(function (k) { keys[k] = false; });
            isMouseDown = false;

            var hud = document.getElementById("fps-hud-guide");
            if (hud) hud.classList.add("hidden");
        },

        isEnabled: function getIsEnabled() {
            return isEnabled;
        },

        update: function update(delta) {
            if (!isEnabled || !camera) return;
            delta = delta || 0.016;

            var speed = moveSpeed * (keys.sprint ? sprintFactor : 1.0) * delta;

            // Calculate forward and right vectors projected onto horizontal plane (XZ)
            var forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
            var right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            var moveVector = new THREE.Vector3(0, 0, 0);

            if (keys.forward) moveVector.add(forward);
            if (keys.backward) moveVector.sub(forward);
            if (keys.right) moveVector.add(right);
            if (keys.left) moveVector.sub(right);
            if (keys.up) moveVector.y += 1.0;
            if (keys.down) moveVector.y -= 1.0;

            if (moveVector.lengthSq() > 0) {
                // Normalize horizontal component if moving diagonally
                var yComp = moveVector.y;
                moveVector.y = 0;
                if (moveVector.lengthSq() > 0) moveVector.normalize();
                moveVector.y = yComp;

                camera.position.addScaledVector(moveVector, speed);

                // Update OrbitControls target if present so switching back to Orbit is smooth
                if (window.controls) {
                    var lookDir = new THREE.Vector3(
                        -Math.sin(yaw) * Math.cos(pitch),
                        Math.sin(pitch),
                        -Math.cos(yaw) * Math.cos(pitch)
                    );
                    window.controls.target.copy(camera.position).add(lookDir.multiplyScalar(2.0));
                }
            }
        }
    };

    global.CTFPSControls = fpsControls;
})(typeof window !== "undefined" ? window : this);
