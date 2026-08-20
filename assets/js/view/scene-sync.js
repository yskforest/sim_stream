(function attachSceneSync(global) {
    "use strict";

    function sync(state) {
        var meshes = global.Meshes;
        if (!state || !meshes) return;

        if (meshes.xrayBeam && meshes.xrayBeam.material) {
            meshes.xrayBeam.material.opacity = state.gantry.xrayVisible ? 0.35 : 0;
        }
        if (meshes.patientGroup) meshes.patientGroup.visible = state.patientVisible;

        var translucent = state.gantry.isTranslucent;
        var materials = meshes.materials || {};
        function setOpacity(material, opacity) {
            if (!material) return;
            material.transparent = translucent;
            material.opacity = opacity;
            material.depthWrite = !translucent;
            material.needsUpdate = true;
        }
        setOpacity(materials.gantry, translucent ? 0.2 : 1);
        if (materials.tunnel) {
            setOpacity(materials.tunnel, translucent ? 0.35 : 1);
            materials.tunnel.transmission = translucent ? 0.9 : 0;
        }
        if (Array.isArray(materials.accessories)) {
            materials.accessories.forEach(function (material) { setOpacity(material, translucent ? 0.2 : 1); });
        }

        var profile = global.CTProfileService;
        var yRange = profile ? profile.getCouchWorldRange("y") : { min: 0.45, max: 0.95 };
        var targetY = yRange.min + (yRange.max - yRange.min) * (state.couch.y / 100);
        if (meshes.tabletopGroup) meshes.tabletopGroup.position.y = targetY;

        if (Array.isArray(meshes.bellows)) {
            var partHeight = (targetY - 0.22) / meshes.bellows.length;
            meshes.bellows.forEach(function (mesh, index) {
                mesh.scale.y = partHeight / 0.1;
                mesh.position.y = index * partHeight + partHeight / 2;
            });
        }

        var zRange = profile ? profile.getCouchWorldRange("z") : { min: 2.6, max: -1 };
        if (meshes.tabletopGroup) {
            meshes.tabletopGroup.position.z = zRange.min + (zRange.max - zRange.min) * (state.couch.z / 100);
        }

        if (meshes.detectorGroup && meshes.xrayBeam) {
            var maxRows = profile ? profile.getDetectorRowsMax() : 320;
            var ratio = state.gantry.detectorRows / maxRows;
            meshes.detectorGroup.scale.z = ratio;
            meshes.xrayBeam.scale.z = (profile ? profile.getBeamZScaleAtMax() : 0.16) * ratio;
        }

        function updateSyringe(fluid, plunger, percent) {
            if (fluid) fluid.scale.y = Math.max(0.01, 1 - percent / 100);
            if (plunger) plunger.position.y = 0.15 - 0.3 * (percent / 100);
        }
        if (meshes.injector) {
            updateSyringe(meshes.injector.fluidA, meshes.injector.plungerA, state.injector.a);
            updateSyringe(meshes.injector.fluidB, meshes.injector.plungerB, state.injector.b);
        }
    }

    var unsubscribe = null;
    global.CTSceneSync = {
        setup: function setup() {
            if (unsubscribe || !global.CTStore) return;
            unsubscribe = global.CTStore.subscribe(sync);
            sync(global.CTStore.getState());
        },
        teardown: function teardown() {
            if (unsubscribe) unsubscribe();
            unsubscribe = null;
        },
        sync: sync
    };
})(typeof window !== "undefined" ? window : globalThis);
