(function attachCameraSim(global) {
    "use strict";

    function config(path, fallback) {
        return global.CTConfigService && global.CTConfigService.get
            ? global.CTConfigService.get(path, fallback)
            : fallback;
    }
    function state() { return global.CTStore.getState().camera; }
    function patch(changes) {
        global.CTStore.patch("camera", changes);
        return state();
    }
    function mergeVector(previous, changes) {
        var next = Object.assign({}, previous);
        ["x", "y", "z"].forEach(function (key) {
            if (changes && typeof changes[key] === "number") next[key] = changes[key];
        });
        return next;
    }
    function success() { return { success: true, state: state() }; }

    patch({
        position: { x: 0, y: 1.8, z: 3.5 },
        lookAt: { x: 0, y: 1.2, z: 0 },
        virtualPosition: { x: 0, y: 1.8, z: 3.5 },
        virtualLookAt: { x: 0, y: 1.2, z: 0 },
        fov: config("camera.fov", 50),
        hfov: config("camera.hfov", 60),
        codec: config("camera.codec", "h264"),
        protocol: config("camera.protocol", "rtsp"),
        fps: config("camera.fps", 30),
        width: config("camera.width", 1280),
        height: config("camera.height", 960),
        mode: "main",
        isStreaming: false,
        streamUrl: null
    });

    global.CameraSim = {
        getState: function getState() {
            return Object.assign({}, state());
        },
        setTransform: function setTransform(position, lookAt) {
            patch({ position: mergeVector(state().position, position), lookAt: mergeVector(state().lookAt, lookAt) });
            return success();
        },
        setVirtualTransform: function setVirtualTransform(position, lookAt) {
            patch({
                virtualPosition: mergeVector(state().virtualPosition, position),
                virtualLookAt: mergeVector(state().virtualLookAt, lookAt)
            });
            return success();
        },
        setFov: function setFov(fov) {
            if (typeof fov === "number" && fov > 0) patch({ fov: fov });
            return success();
        },
        setHFov: function setHFov(hfov) {
            if (typeof hfov === "number" && hfov > 0) patch({ hfov: hfov });
            return success();
        },
        startStream: function startStream(params) {
            params = params || {};
            var next = Object.assign({}, state(), {
                codec: params.codec || state().codec,
                protocol: params.protocol || state().protocol,
                fps: typeof params.fps === "number" ? params.fps : state().fps,
                width: typeof params.width === "number" ? params.width : state().width,
                height: typeof params.height === "number" ? params.height : state().height,
                hfov: typeof params.hfov === "number" ? params.hfov : state().hfov,
                mode: params.mode || params.captureMode || "main",
                virtualPosition: params.virtualPosition || state().virtualPosition,
                virtualLookAt: params.virtualLookAt || state().virtualLookAt,
                isStreaming: true
            });
            var streamResult = global.CTVideoStreamService && global.CTVideoStreamService.start
                ? global.CTVideoStreamService.start(next)
                : null;
            if (streamResult && streamResult.streamUrl) {
                next.streamUrl = streamResult.streamUrl;
            } else {
                var port = next.protocol === "rtsp" ? config("network.rtspPort", 8554) : config("network.httpPort", 8080);
                next.streamUrl = next.protocol + "://" + config("network.host", "localhost") + ":" + port + "/stream/virtual-camera." + (next.codec === "h264" ? "mp4" : "mjpg");
            }
            patch(next);
            return { success: true, state: state(), streamUrl: state().streamUrl };
        },
        stopStream: function stopStream() {
            if (global.CTVideoStreamService && global.CTVideoStreamService.stop) global.CTVideoStreamService.stop();
            patch({ isStreaming: false, streamUrl: null });
            return success();
        },
        getStreamUrl: function getStreamUrl() {
            return { success: true, streamUrl: state().streamUrl, isStreaming: state().isStreaming };
        },
        setDistortion: function setDistortion(params) {
            global.CTStore.patch("distortion", params || {});
            if (typeof global.updateCameraDistortion === "function") global.updateCameraDistortion(params || {});
            return { success: true, distortion: global.CTStore.getState().distortion };
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
