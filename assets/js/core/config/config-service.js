(function attachConfigService(global) {
    var configData = {
        camera: {
            width: 1280,
            height: 960,
            fps: 30,
            hfov: 60,
            fov: 50,
            quality: 0.92,
            codec: "h264",
            protocol: "rtsp"
        },
        network: {
            httpPort: 8080,
            rtspPort: 8554,
            host: "127.0.0.1"
        },
        graphics: {
            quality: "high",
            shadows: true,
            exposure: 1.05
        },
        hardware: {
            defaultDetectorRows: 320,
            maxRotorSpeed: 100
        },
        patient: {
            defaultModelId: "default_patient",
            defaultModelName: "3D Patient (Male Posed 170cm)",
            defaultModelPath: "./assets/glb/rp_dennis_posed_004_100k.glb",
            defaultPosition: [0, -0.24, 0.45],
            defaultRotation: [-97, 0, 0],
            targetHeight: 1.7
        }
    };

    var isLoaded = false;
    var loadPromise = null;

    function deepMerge(target, source) {
        for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
                    if (!target[key] || typeof target[key] !== "object") target[key] = {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }

    var service = {
        loadConfig: function loadConfig(url) {
            url = url || "./config.json";
            if (loadPromise) return loadPromise;

            loadPromise = fetch(url)
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Failed to load config file: " + response.statusText);
                    }
                    return response.text().then(function (text) {
                        var cleanText = text.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*/g, "$1");
                        return JSON.parse(cleanText);
                    });
                })
                .then(function (data) {
                    deepMerge(configData, data);
                    isLoaded = true;
                    console.log("[CTConfigService] Loaded configuration from " + url, configData);
                    return configData;
                })
                .catch(function (err) {
                    console.warn("[CTConfigService] Failed to load " + url + ", using built-in defaults.", err);
                    isLoaded = true;
                    return configData;
                });

            return loadPromise;
        },

        get: function get(path, defaultValue) {
            if (!path) return configData;
            var parts = path.split(".");
            var curr = configData;
            for (var i = 0; i < parts.length; i++) {
                if (curr === null || curr === undefined || typeof curr !== "object") {
                    return defaultValue;
                }
                curr = curr[parts[i]];
            }
            return curr !== undefined ? curr : defaultValue;
        },

        getAll: function getAll() {
            return configData;
        },

        isReady: function isReady() {
            return isLoaded;
        }
    };

    global.CTConfigService = service;
})(window);
