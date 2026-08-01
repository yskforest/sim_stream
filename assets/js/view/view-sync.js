// 状態変更を3Dメッシュへ反映する同期モジュール
function applyStateToMeshes(state) {
    // UI上の0-100%を、プロファイル定義の実空間座標へ変換する
    var yRange = CTProfileService.getCouchWorldRange("y");
    var couchY_min = yRange.min;
    var couchY_max = yRange.max;
    var targetY = couchY_min + (couchY_max - couchY_min) * (state.couch.y / 100);

    if (Meshes.tabletopGroup) Meshes.tabletopGroup.position.y = targetY;

    if (Meshes.bellows) {
        var baseTop = 0.2;
        var totalBellowsHeight = targetY - baseTop - 0.02;
        var partHeight = totalBellowsHeight / Meshes.bellows.length;

        Meshes.bellows.forEach(function (mesh, index) {
            mesh.scale.y = partHeight / 0.1;
            mesh.position.y = index * partHeight + partHeight / 2;
        });
    }

    var zRange = CTProfileService.getCouchWorldRange("z");
    var couchZ_min = zRange.min;
    var couchZ_max = zRange.max;
    if (Meshes.tabletopGroup) {
        Meshes.tabletopGroup.position.z = couchZ_min + (couchZ_max - couchZ_min) * (state.couch.z / 100);
    }

    if (Meshes.detectorGroup && Meshes.xrayBeam) {
        // 検出器列数に合わせて検出器とビーム厚みを連動させる
        var ratio = state.gantry.detectorRows / CTProfileService.getDetectorRowsMax();
        Meshes.detectorGroup.scale.z = ratio;
        var baseBeamZScale = CTProfileService.getBeamZScaleAtMax();
        Meshes.xrayBeam.scale.z = baseBeamZScale * ratio;
    }

    function updateSyringe(fluidMesh, plungerMesh, percent) {
        // 注入率に応じて液体量とプランジャ位置を同期更新する
        var r = Math.max(0.01, 1.0 - percent / 100);
        if (fluidMesh) fluidMesh.scale.y = r;
        if (plungerMesh) plungerMesh.position.y = 0.15 - 0.3 * (percent / 100);
    }

    if (Meshes.injector) {
        updateSyringe(Meshes.injector.fluidA, Meshes.injector.plungerA, state.injector.a);
        updateSyringe(Meshes.injector.fluidB, Meshes.injector.plungerB, state.injector.b);
    }
}
