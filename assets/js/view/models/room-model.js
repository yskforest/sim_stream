// CT 3D Simulator - Room, Control Room, Server Rack & Environment Models

function buildRoom() {
    var targetScene = (typeof scene !== "undefined" && scene) ? scene : window.scene;
    if (!targetScene) return;

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
    targetScene.add(floor);

    // 50cm (0.5m) 間隔の基準グリッド
    const grid = new THREE.GridHelper(30, 60, 0x1d4ed8, 0x64748b);
    grid.position.y = 0.003;
    if (grid.material) {
        grid.material.opacity = 0.65;
        grid.material.transparent = true;
    }
    targetScene.add(grid);

    // 世界座標原点 (0,0,0) 3D XYZ 軸矢印
    const axesGroup = new THREE.Group();
    axesGroup.position.set(0, 0.005, 0);
    axesGroup.renderOrder = 9999;

    const totalLen = 1.0;
    const headLen = 0.22;
    const shaftLen = totalLen - headLen;
    const shaftRadius = 0.022;
    const headRadius = 0.065;

    function createThickAxisArrow(colorHex, dirVector) {
        const arrowGroup = new THREE.Group();
        arrowGroup.renderOrder = 9999;

        const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            depthTest: false,
            depthWrite: false,
            transparent: true
        });

        const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 16);
        shaftGeo.translate(0, shaftLen / 2, 0);
        const shaftMesh = new THREE.Mesh(shaftGeo, mat);
        shaftMesh.renderOrder = 9999;

        const headGeo = new THREE.ConeGeometry(headRadius, headLen, 24);
        headGeo.translate(0, shaftLen + headLen / 2, 0);
        const headMesh = new THREE.Mesh(headGeo, mat);
        headMesh.renderOrder = 9999;

        arrowGroup.add(shaftMesh);
        arrowGroup.add(headMesh);

        if (dirVector.x === 1) {
            arrowGroup.rotation.z = -Math.PI / 2;
        } else if (dirVector.z === 1) {
            arrowGroup.rotation.x = Math.PI / 2;
        }

        return arrowGroup;
    }

    axesGroup.add(createThickAxisArrow(0xef4444, new THREE.Vector3(1, 0, 0))); // X: 赤
    axesGroup.add(createThickAxisArrow(0x22c55e, new THREE.Vector3(0, 1, 0))); // Y: 緑
    axesGroup.add(createThickAxisArrow(0x3b82f6, new THREE.Vector3(0, 0, 1))); // Z: 青

    targetScene.add(axesGroup);

    if (typeof window !== "undefined") {
        if (!window.Meshes) window.Meshes = {};
        window.Meshes.worldAxesGroup = axesGroup;
    }
}

function buildControlRoom() {
    var targetScene = (typeof scene !== "undefined" && scene) ? scene : window.scene;
    if (!targetScene) return;

    const controlGroup = new THREE.Group();
    controlGroup.position.set(6.0, 0, 0);

    const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.04, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    );
    deskTop.position.set(0, 0.75, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;

    const legMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75);
    const leg1 = new THREE.Mesh(legGeo, legMat);
    leg1.position.set(0, -0.375, 0.9);
    const leg2 = new THREE.Mesh(legGeo, legMat);
    leg2.position.set(0, -0.375, -0.9);
    deskTop.add(leg1);
    deskTop.add(leg2);
    controlGroup.add(deskTop);

    function createConsoleMonitor(zOffset) {
        const monitorGroup = new THREE.Group();
        monitorGroup.position.set(0.1, 0.8, zOffset);
        monitorGroup.rotation.y = -Math.PI / 2 + (zOffset > 0 ? -0.1 : 0.1);

        const stand = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.2, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x111 }),
        );
        stand.position.y = 0.1;
        monitorGroup.add(stand);

        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.45, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x222 }),
        );
        panel.position.set(0, 0.35, 0.05);

        const screenGroup = new THREE.Group();
        screenGroup.position.set(0, 0, 0.026);

        const screenBG = new THREE.Mesh(
            new THREE.PlaneGeometry(0.66, 0.41),
            new THREE.MeshBasicMaterial({ color: 0x112233 }),
        );
        screenGroup.add(screenBG);

        const imgBox = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 0.3),
            new THREE.MeshBasicMaterial({ color: 0x8899aa }),
        );
        imgBox.position.set(0.15, 0, 0.001);
        screenGroup.add(imgBox);

        panel.add(screenGroup);
        monitorGroup.add(panel);
        return monitorGroup;
    }

    controlGroup.add(createConsoleMonitor(-0.4));
    controlGroup.add(createConsoleMonitor(0.4));

    const kbMat = new THREE.MeshStandardMaterial({ color: 0x222 });
    const kb1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.4), kbMat);
    kb1.position.set(-0.2, 0.775, -0.4);
    controlGroup.add(kb1);
    const kb2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.4), kbMat);
    kb2.position.set(-0.2, 0.775, 0.4);
    controlGroup.add(kb2);

    const switcherGroup = new THREE.Group();
    switcherGroup.position.set(0.0, 0.78, 0.0);
    switcherGroup.rotation.y = -Math.PI / 16;
    switcherGroup.rotation.z = Math.PI / 16;

    const swBaseMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
    const swBaseGeo = new THREE.BoxGeometry(0.36, 0.04, 0.1);
    const swBase = new THREE.Mesh(swBaseGeo, swBaseMat);
    switcherGroup.add(swBase);

    const btnColors = [0x22cc22, 0xcc2222, 0xddcc22, 0x2288dd, 0xcccccc, 0xcccccc];

    for (let i = 0; i < 6; i++) {
        const isStartBtn = i === 0;
        const rTop = isStartBtn ? 0.018 : 0.012;
        const rBot = isStartBtn ? 0.022 : 0.015;
        const h = isStartBtn ? 0.025 : 0.015;

        const btnMat = new THREE.MeshStandardMaterial({ color: btnColors[i], roughness: 0.5 });
        const btnGeo = new THREE.CylinderGeometry(rTop, rBot, h, 24);
        const btn = new THREE.Mesh(btnGeo, btnMat);

        const xOffset = -0.14 + i * 0.055;
        btn.position.set(xOffset, 0.02 + h / 2 - 0.005, 0);
        switcherGroup.add(btn);
    }
    controlGroup.add(switcherGroup);

    // --- Protective Radiation Lead Glass Partition Window ---
    const partitionGroup = new THREE.Group();
    partitionGroup.position.set(-1.0, 1.4, 0);

    // Dark metal frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.1), frameMat);
    frameLeft.position.set(0, 0, -1.5);
    partitionGroup.add(frameLeft);

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.1), frameMat);
    frameRight.position.set(0, 0, 1.5);
    partitionGroup.add(frameRight);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.1), frameMat);
    frameTop.position.set(0, 1.4, 0);
    partitionGroup.add(frameTop);

    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.1), frameMat);
    frameBottom.position.set(0, -1.4, 0);
    partitionGroup.add(frameBottom);

    // High-density lead glass pane
    const leadGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.65,
        roughness: 0.05,
        transmission: 0.9,
        ior: 1.52,
        thickness: 0.08,
        clearcoat: 0.6,
        clearcoatRoughness: 0.05,
        side: THREE.DoubleSide
    });
    const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.7), leadGlassMat);
    glassPane.rotation.y = Math.PI / 2;
    partitionGroup.add(glassPane);

    controlGroup.add(partitionGroup);

    controlGroup.traverse(function (child) {
        if (child.isMesh) {
            if (!child.material || child.material.transparent !== true) {
                child.castShadow = true;
            }
            child.receiveShadow = true;
        }
    });

    targetScene.add(controlGroup);
}

function buildServerRack() {
    var targetScene = (typeof scene !== "undefined" && scene) ? scene : window.scene;
    if (!targetScene) return;

    const rackGroup = new THREE.Group();
    const rackX = 6.0;
    const rackZ = -2.2;
    rackGroup.position.set(rackX, 0, rackZ);

    const rackWidth = 0.6;
    const rackHeight = 1.6;
    const rackDepth = 0.8;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.2, roughness: 0.8 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, rackHeight, rackDepth), frameMat);
    frame.position.y = rackHeight / 2;
    frame.castShadow = true;
    frame.receiveShadow = true;
    rackGroup.add(frame);

    if (window.CTMeshFactory && typeof window.CTMeshFactory.createContactShadowPlane === "function") {
        const rackShadow = window.CTMeshFactory.createContactShadowPlane(0.9, 1.1, 0.6);
        rackShadow.position.set(0, 0.001, 0);
        rackGroup.add(rackShadow);
    }

    const innerMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
    const innerPanel = new THREE.Mesh(
        new THREE.BoxGeometry(rackWidth - 0.04, rackHeight - 0.1, rackDepth + 0.01),
        innerMat
    );
    innerPanel.position.y = rackHeight / 2;
    rackGroup.add(innerPanel);

    if (!window.Meshes) window.Meshes = {};
    window.Meshes.serverBlades = {};
    window.Meshes.serverLeds = [];

    const serverNames = ["SCON", "DCON", "RTM", "IDD", "RDD", "SAC"];
    const bladeHeight = 0.2;
    const bladeMargin = 0.04;
    const startY = 0.1;

    for (let i = 0; i < serverNames.length; i++) {
        const label = serverNames[i];
        const bladeGroup = new THREE.Group();
        const yPos = startY + i * (bladeHeight + bladeMargin) + bladeHeight / 2;
        bladeGroup.position.set(0, yPos, rackDepth / 2 + 0.006);

        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(rackWidth - 0.06, bladeHeight, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 })
        );
        bladeGroup.add(blade);

        const ledGeo = new THREE.CircleGeometry(0.008, 16);
        const pwrLed = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        pwrLed.position.set(-rackWidth / 2 + 0.2, 0.02, 0.012);
        bladeGroup.add(pwrLed);

        for (let j = 0; j < 3; j++) {
            const actLedMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true });
            const actLed = new THREE.Mesh(ledGeo, actLedMat);
            actLed.position.set(-rackWidth / 2 + 0.24 + j * 0.03, 0.02, 0.012);
            bladeGroup.add(actLed);
            window.Meshes.serverLeds.push(actLedMat);
        }

        rackGroup.add(bladeGroup);
        window.Meshes.serverBlades[label] = {
            target: new THREE.Vector3(rackX, yPos, rackZ + rackDepth / 2),
            cameraPos: new THREE.Vector3(rackX - 1.0, yPos + 0.1, rackZ + rackDepth / 2 + 1.2),
        };
    }

    window.Meshes.serverBlades["FullRack"] = {
        target: new THREE.Vector3(rackX, rackHeight / 2, rackZ),
        cameraPos: new THREE.Vector3(rackX - 2.5, rackHeight / 2 + 0.2, rackZ + 2.0),
    };

    targetScene.add(rackGroup);
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


