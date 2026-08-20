// CT 3D Simulator - Room, Control Room, Server Rack & Environment Models (Slim & Modular)

function buildRoom() {
    var targetScene = (typeof scene !== "undefined" && scene) ? scene : window.scene;
    if (!targetScene) return;

    var floorTexture = (window.CTMeshFactory && typeof window.CTMeshFactory.createFloorTileTexture === "function")
        ? window.CTMeshFactory.createFloorTileTexture() : null;

    var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.1, map: floorTexture, bumpMap: floorTexture, bumpScale: 0.003 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    targetScene.add(floor);

    var grid = new THREE.GridHelper(30, 60, 0x1d4ed8, 0x64748b);
    grid.position.y = 0.003;
    if (grid.material) { grid.material.opacity = 0.65; grid.material.transparent = true; }
    targetScene.add(grid);

    // 3D XYZ 軸矢印
    var axesGroup = new THREE.Group();
    axesGroup.position.set(0, 0.005, 0);
    axesGroup.renderOrder = 9999;

    function createAxisArrow(hex, dir) {
        var g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: hex, depthTest: false, depthWrite: false, transparent: true });
        var sGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.78, 16);
        if (sGeo && sGeo.translate) sGeo.translate(0, 0.39, 0);
        var shaft = new THREE.Mesh(sGeo, mat);
        var hGeo = new THREE.ConeGeometry(0.065, 0.22, 24);
        if (hGeo && hGeo.translate) hGeo.translate(0, 0.89, 0);
        var head = new THREE.Mesh(hGeo, mat);
        g.add(shaft, head);
        if (dir.x === 1) g.rotation.z = -Math.PI / 2;
        else if (dir.z === 1) g.rotation.x = Math.PI / 2;
        return g;
    }

    axesGroup.add(createAxisArrow(0xef4444, new THREE.Vector3(1, 0, 0)));
    axesGroup.add(createAxisArrow(0x22c55e, new THREE.Vector3(0, 1, 0)));
    axesGroup.add(createAxisArrow(0x3b82f6, new THREE.Vector3(0, 0, 1)));
    targetScene.add(axesGroup);

    if (window.Meshes) window.Meshes.worldAxesGroup = axesGroup;
}

function buildControlRoom() {
    var targetScene = (typeof scene !== "undefined" && scene) ? scene : window.scene;
    if (!targetScene) return;

    var controlGroup = new THREE.Group();
    controlGroup.position.set(6.0, 0, 0);

    var deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 2.2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    deskTop.position.set(0, 0.75, 0);
    deskTop.castShadow = true; deskTop.receiveShadow = true;

    var legMat = new THREE.MeshStandardMaterial({ color: 0xdddddd }), legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75);
    [0.9, -0.9].forEach(function (z) {
        var leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(0, -0.375, z);
        deskTop.add(leg);
    });
    controlGroup.add(deskTop);

    function createMonitor(zOffset) {
        var mg = new THREE.Group();
        mg.position.set(0.1, 0.8, zOffset);
        mg.rotation.y = -Math.PI / 2 + (zOffset > 0 ? -0.1 : 0.1);

        var stand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        stand.position.y = 0.1;
        var panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        panel.position.set(0, 0.35, 0.05);

        var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.41), new THREE.MeshBasicMaterial({ color: 0x112233 }));
        screen.position.set(0, 0, 0.026);
        var imgBox = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x8899aa }));
        imgBox.position.set(0.15, 0, 0.027);

        panel.add(screen, imgBox);
        mg.add(stand, panel);
        return mg;
    }
    controlGroup.add(createMonitor(-0.4), createMonitor(0.4));

    var kbMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [-0.4, 0.4].forEach(function (z) {
        var kb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.4), kbMat);
        kb.position.set(-0.2, 0.775, z);
        controlGroup.add(kb);
    });

    // スイッチャー
    var swGroup = new THREE.Group();
    swGroup.position.set(0.0, 0.78, 0.0);
    swGroup.rotation.set(0, -Math.PI / 16, Math.PI / 16);
    swGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.1), new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 })));

    var btnColors = [0x22cc22, 0xcc2222, 0xddcc22, 0x2288dd, 0xcccccc, 0xcccccc];
    for (var i = 0; i < 6; i++) {
        var isStart = i === 0, h = isStart ? 0.025 : 0.015;
        var btn = new THREE.Mesh(
            new THREE.CylinderGeometry(isStart ? 0.018 : 0.012, isStart ? 0.022 : 0.015, h, 24),
            new THREE.MeshStandardMaterial({ color: btnColors[i], roughness: 0.5 })
        );
        btn.position.set(-0.14 + i * 0.055, 0.02 + h / 2 - 0.005, 0);
        swGroup.add(btn);
    }
    controlGroup.add(swGroup);

    // 鉛ガラスパーティション
    var partGroup = new THREE.Group();
    partGroup.position.set(-1.0, 1.4, 0);
    var frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });

    [[-1.5, 0, 0, 0.1, 2.8, 0.1], [1.5, 0, 0, 0.1, 2.8, 0.1],
     [0, 1.4, 0, 0.1, 0.1, 3.1], [0, -1.4, 0, 0.1, 0.1, 3.1]
    ].forEach(function (f) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(f[3], f[4], f[5]), frameMat);
        m.position.set(f[2], f[1], f[0]);
        partGroup.add(m);
    });

    var glass = new THREE.Mesh(
        new THREE.PlaneGeometry(3.0, 2.7),
        new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.65, roughness: 0.05, transmission: 0.9, ior: 1.52, thickness: 0.08, clearcoat: 0.6, side: THREE.DoubleSide })
    );
    glass.rotation.y = Math.PI / 2;
    partGroup.add(glass);
    controlGroup.add(partGroup);

    controlGroup.traverse(function (c) { if (c.isMesh) { c.castShadow = !c.material.transparent; c.receiveShadow = true; } });
    targetScene.add(controlGroup);
}

function buildServerRack() {
    var targetScene = (typeof scene !== "undefined" && scene) ? scene : window.scene;
    if (!targetScene) return;

    var rackGroup = new THREE.Group(), rackX = 6.0, rackZ = -2.2;
    rackGroup.position.set(rackX, 0, rackZ);

    var frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.8), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.2, roughness: 0.8 }));
    frame.position.y = 0.8; frame.castShadow = true; frame.receiveShadow = true;
    rackGroup.add(frame);

    if (window.CTMeshFactory && typeof window.CTMeshFactory.createContactShadowPlane === "function") {
        var shadow = window.CTMeshFactory.createContactShadowPlane(0.9, 1.1, 0.6);
        shadow.position.set(0, 0.001, 0);
        rackGroup.add(shadow);
    }

    var inner = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.5, 0.81), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    inner.position.y = 0.8;
    rackGroup.add(inner);

    if (!window.Meshes) window.Meshes = {};
    window.Meshes.serverBlades = {};
    window.Meshes.serverLeds = [];

    var servers = ["SCON", "DCON", "RTM", "IDD", "RDD", "SAC"], bladeMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
    var ledGeo = new THREE.CircleGeometry(0.008, 16);

    servers.forEach(function (label, i) {
        var bg = new THREE.Group(), yPos = 0.1 + i * 0.24 + 0.1;
        bg.position.set(0, yPos, 0.406);
        bg.add(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.2, 0.02), bladeMat));

        var pwr = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        pwr.position.set(-0.1, 0.02, 0.012);
        bg.add(pwr);

        for (var j = 0; j < 3; j++) {
            var actMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true });
            var act = new THREE.Mesh(ledGeo, actMat);
            act.position.set(-0.06 + j * 0.03, 0.02, 0.012);
            bg.add(act);
            window.Meshes.serverLeds.push(actMat);
        }
        rackGroup.add(bg);
        window.Meshes.serverBlades[label] = {
            target: new THREE.Vector3(rackX, yPos, rackZ + 0.4), cameraPos: new THREE.Vector3(rackX - 1.0, yPos + 0.1, rackZ + 1.6)
        };
    });

    window.Meshes.serverBlades["FullRack"] = {
        target: new THREE.Vector3(rackX, 0.8, rackZ), cameraPos: new THREE.Vector3(rackX - 2.5, 1.0, rackZ + 2.0)
    };
    targetScene.add(rackGroup);
}

window.CTRoomModel = { buildRoom, buildControlRoom, buildServerRack };
