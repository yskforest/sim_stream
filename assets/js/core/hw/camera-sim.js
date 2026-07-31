(function attachCameraSim(global) {
    var cameraState = {
        position: { x: 0, y: 1.8, z: 3.5 },
        lookAt: { x: 0, y: 1.2, z: 0 },
        fov: 50,
        hfov: 60,
        isStreaming: false,
        codec: "mjpeg",
        protocol: "http",
        fps: 30,
        width: 640,
        height: 480,
        streamUrl: null,
    };

    function notifyStateChange() {
        if (global.CTStore && global.CTStore.getState()) {
            var state = global.CTStore.getState();
            state.camera = cameraState;
            state.notify();
        }
    }

    var cameraSim = {
        getState: function getState() {
            return Object.assign({}, cameraState);
        },
        setTransform: function setTransform(position, lookAt) {
            if (position) {
                cameraState.position.x = typeof position.x === "number" ? position.x : cameraState.position.x;
                cameraState.position.y = typeof position.y === "number" ? position.y : cameraState.position.y;
                cameraState.position.z = typeof position.z === "number" ? position.z : cameraState.position.z;
            }
            if (lookAt) {
                cameraState.lookAt.x = typeof lookAt.x === "number" ? lookAt.x : cameraState.lookAt.x;
                cameraState.lookAt.y = typeof lookAt.y === "number" ? lookAt.y : cameraState.lookAt.y;
                cameraState.lookAt.z = typeof lookAt.z === "number" ? lookAt.z : cameraState.lookAt.z;
            }
            notifyStateChange();
            return { success: true, state: cameraState };
        },
        setFov: function setFov(fov) {
            if (typeof fov === "number" && fov > 0) {
                cameraState.fov = fov;
                notifyStateChange();
            }
            return { success: true, state: cameraState };
        },
        setHFov: function setHFov(hfov) {
            if (typeof hfov === "number" && hfov > 0) {
                cameraState.hfov = hfov;
                notifyStateChange();
            }
            return { success: true, state: cameraState };
        },
        startStream: function startStream(params) {
            params = params || {};
            cameraState.codec = params.codec === "h264" ? "h264" : "mjpeg";
            cameraState.protocol = params.protocol === "rtsp" ? "rtsp" : "http";
            cameraState.fps = typeof params.fps === "number" ? params.fps : 30;
            if (typeof params.width === "number") cameraState.width = params.width;
            if (typeof params.height === "number") cameraState.height = params.height;
            if (typeof params.hfov === "number") cameraState.hfov = params.hfov;
            cameraState.isStreaming = true;

            if (global.CTVideoStreamService && typeof global.CTVideoStreamService.start === "function") {
                var streamRes = global.CTVideoStreamService.start({
                    codec: cameraState.codec,
                    protocol: cameraState.protocol,
                    fps: cameraState.fps,
                    width: cameraState.width,
                    height: cameraState.height,
                    hfov: cameraState.hfov,
                });
                cameraState.streamUrl = streamRes.streamUrl;
            } else {
                cameraState.streamUrl =
                    cameraState.protocol + "://localhost:8080/stream/virtual-camera." + (cameraState.codec === "h264" ? "mp4" : "mjpg");
            }

            notifyStateChange();
            return { success: true, state: cameraState, streamUrl: cameraState.streamUrl };
        },
        stopStream: function stopStream() {
            cameraState.isStreaming = false;
            cameraState.streamUrl = null;

            if (global.CTVideoStreamService && typeof global.CTVideoStreamService.stop === "function") {
                global.CTVideoStreamService.stop();
            }

            notifyStateChange();
            return { success: true, state: cameraState };
        },
        getStreamUrl: function getStreamUrl() {
            return { success: true, streamUrl: cameraState.streamUrl, isStreaming: cameraState.isStreaming };
        },
    };

    global.CameraSim = cameraSim;
})(window);
