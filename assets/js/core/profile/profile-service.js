(function attachProfileService(global) {
    var active = null;

    function get(obj, path, fallback) {
        var cur = obj;
        for (var i = 0; i < path.length; i++) {
            if (!cur || !Object.prototype.hasOwnProperty.call(cur, path[i])) return fallback;
            cur = cur[path[i]];
        }
        return cur;
    }

    var service = {
        init: function init(profile) {
            active = profile || null;
        },
        getProfile: function getProfile() {
            return active;
        },
        getDetectorRowsOptions: function getDetectorRowsOptions() {
            return get(active, ["capabilities", "gantry", "detectorRows", "options"], [320]);
        },
        getDetectorRowsMax: function getDetectorRowsMax() {
            return get(active, ["mappings", "detectorRows", "maxRows"], 320);
        },
        getBeamZScaleAtMax: function getBeamZScaleAtMax() {
            return get(active, ["mappings", "detectorRows", "beamZScaleAtMax"], 0.16);
        },
        getCouchWorldRange: function getCouchWorldRange(axis) {
            return get(
                active,
                ["mappings", "couchWorld", axis],
                axis === "y" ? { min: 0.45, max: 0.95 } : { min: 2.6, max: -1.0 },
            );
        },
        getAxisCapability: function getAxisCapability(scope, key) {
            return get(active, ["capabilities", scope, key], null);
        },
    };

    global.CTProfileService = service;
})(window);
