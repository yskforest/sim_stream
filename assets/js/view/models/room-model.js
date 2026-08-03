function buildRoom() {
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    
    let floorTexture = null;
    if (window.CTMeshFactory && typeof window.CTMeshFactory.createFloorTileTexture === "function") {
        floorTexture = window.CTMeshFactory.createFloorTileTexture();
    }

    const floorMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.25,
        metalness: 0.1,
        map: floorTexture,
        bumpMap: floorTexture,
        bumpScale: 0.003
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 50cm (0.5m) 間隔の視認性の高いクッキリした単一基準グリッド (30m ÷ 60 = 0.5m)
    const grid = new THREE.GridHelper(30, 60, 0x1d4ed8, 0x64748b);
    grid.position.y = 0.003;
    if (grid.material) {
        grid.material.opacity = 0.65;
        grid.material.transparent = true;
    }
    scene.add(grid);

    // --- 世界座標原点 (0,0,0) 極太 3D XYZ 軸矢印 (Thick 3D Mesh Arrows - Always On Top) ---
    const axesGroup = new THREE.Group();
    axesGroup.position.set(0, 0.005, 0);
    axesGroup.renderOrder = 9999;

    const totalLen = 1.0;     // 軸の全高 1.0m
    const headLen = 0.22;     // 矢印ヘッド長 22cm
    const shaftLen = totalLen - headLen; // 幹の長さ 78cm
    const shaftRadius = 0.022; // 幹の太さ (直径 4.4cm)
    const headRadius = 0.065;  // コーンヘッド太さ (直径 13cm)

    function createThickAxisArrow(colorHex, dirVector) {
        const arrowGroup = new THREE.Group();
        arrowGroup.renderOrder = 9999;

        const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            depthTest: false,
            depthWrite: false,
            transparent: true
        });

        // 1. 幹 (Shaft Cylinder)
        const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 16);
        shaftGeo.translate(0, shaftLen / 2, 0);
        const shaftMesh = new THREE.Mesh(shaftGeo, mat);
        shaftMesh.renderOrder = 9999;

        // 2. 矢印頭 (Cone Head)
        const headGeo = new THREE.ConeGeometry(headRadius, headLen, 24);
        headGeo.translate(0, shaftLen + headLen / 2, 0);
        const headMesh = new THREE.Mesh(headGeo, mat);
        headMesh.renderOrder = 9999;

        arrowGroup.add(shaftMesh);
        arrowGroup.add(headMesh);

        // 方向ベクトルに合わせて回転設定
        if (dirVector.x === 1) {
            arrowGroup.rotation.z = -Math.PI / 2; // X軸 (右方向)
        } else if (dirVector.z === 1) {
            arrowGroup.rotation.x = Math.PI / 2;  // Z軸 (手前/奥方向)
        } // Y軸はデフォルトで上向き

        return arrowGroup;
    }

    // X軸: 赤 (Red)
    const arrowX = createThickAxisArrow(0xef4444, new THREE.Vector3(1, 0, 0));
    // Y軸: 緑 (Green)
    const arrowY = createThickAxisArrow(0x22c55e, new THREE.Vector3(0, 1, 0));
    // Z軸: 青 (Blue)
    const arrowZ = createThickAxisArrow(0x3b82f6, new THREE.Vector3(0, 0, 1));

    axesGroup.add(arrowX);
    axesGroup.add(arrowY);
    axesGroup.add(arrowZ);

    scene.add(axesGroup);

    if (typeof window !== "undefined") {
        if (!window.Meshes) window.Meshes = {};
        window.Meshes.worldAxesGroup = axesGroup;
    }
}

function toggleWorldAxes() {
    var meshesObj = (typeof window !== "undefined" && window.Meshes) || (typeof Meshes !== "undefined" ? Meshes : null);
    if (meshesObj && meshesObj.worldAxesGroup) {
        meshesObj.worldAxesGroup.visible = !meshesObj.worldAxesGroup.visible;
    }
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
