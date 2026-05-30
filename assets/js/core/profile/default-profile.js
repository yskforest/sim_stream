(function attachDefaultProfile(global) {
    // Keep model-specific values in one place.
    global.CTDefaultProfile = {
        id: "default.ct-sim.v1",
        name: "CT Simulator Default Model",
        capabilities: {
            gantry: {
                detectorRows: {
                    options: [16, 32, 64, 80, 160, 320],
                    defaultValue: 320,
                },
                xrayVisible: true,
                rotorSpeed: { min: 0, max: 100, unit: "rpm" },
            },
            couch: {
                y: { min: 0, max: 100, defaultValue: 0 },
                z: { min: 0, max: 100, defaultValue: 0 },
            },
            injector: {
                a: { min: 0, max: 100, defaultValue: 0 },
                b: { min: 0, max: 100, defaultValue: 0 },
            },
        },
        mappings: {
            couchWorld: {
                y: { min: 0.45, max: 0.95 },
                z: { min: 2.6, max: -1.0 },
            },
            detectorRows: {
                maxRows: 320,
                beamZScaleAtMax: 0.16,
            },
        },
    };
})(window);
