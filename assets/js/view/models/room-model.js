function buildRoom() {
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    // 病室・CT検査室をイメージした明るく清潔感のある医療用フロアカラー
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0xc4d4e0,
        roughness: 0.35,
        metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 50cm (0.5m) 間隔の視認性の高いクッキリしたグリッド (30m ÷ 60 = 0.5m)
    const grid = new THREE.GridHelper(30, 60, 0x1d4ed8, 0x334155);
    grid.position.y = 0.005;
    if (grid.material) {
        grid.material.opacity = 0.85;
        grid.material.transparent = true;
    }
    scene.add(grid);
}

function createRoundedBox(width, height, depth, radius, material) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -depth / 2;
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + depth - radius);
    shape.quadraticCurveTo(x, y + depth, x + radius, y + depth);
    shape.lineTo(x + width - radius, y + depth);
    shape.quadraticCurveTo(x + width, y + depth, x + width, y + depth - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);

    const extrudeSettings = {
        depth: height,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}
