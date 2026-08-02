function buildCTScanner() {
    const ctGroup = new THREE.Group();

    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 1.2, 0);

    // High-end medical physical materials
    const gantryMat = new THREE.MeshPhysicalMaterial({
        color: 0xfcfcfc,
        roughness: 0.15,
        metalness: 0.05,
        clearcoat: 0.45,
        clearcoatRoughness: 0.08,
        reflectivity: 0.6
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.3 });
    const baseCoverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.1 });
    const tunnelMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 0.3, side: THREE.DoubleSide });

    Meshes.materials = {
        gantry: gantryMat,
        base: baseCoverMat,
        tunnel: tunnelMat,
        accessories: [darkMat]
    };



    // --- 1. Gantry Silhouette (Matching reference image exactly) ---
    const shellW = 1.18;      // Half-width
    const shellBottom = -1.16; // Reaches the floor
    const shellDepth = 0.65;
    const boreRadius = 0.40;   // 80cm diameter bore
    const bevelT = 0.04;
    const frontZ = shellDepth / 2 + bevelT + 0.002;

    const shellShape = new THREE.Shape();
    const shoulderY = 0.1; // Where the vertical side meets the top semi-circle

    // Draw outer arch shape (straight sides, semi-circle top)
    shellShape.moveTo(shellW, shellBottom);
    shellShape.lineTo(shellW, shoulderY);
    // Semicircle over the top
    shellShape.absarc(0, shoulderY, shellW, 0, Math.PI, false);
    shellShape.lineTo(-shellW, shellBottom);
    shellShape.lineTo(shellW, shellBottom);

    // Add 80cm Bore Hole
    const shellHole = new THREE.Path();
    shellHole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
    shellShape.holes.push(shellHole);

    const shellGeo = new THREE.ExtrudeGeometry(shellShape, {
        depth: shellDepth,
        curveSegments: 128,
        bevelEnabled: true,
        bevelThickness: bevelT,
        bevelSize: 0.05,
        bevelSegments: 16,
    });
    shellGeo.translate(0, 0, -shellDepth / 2);
    const mainBody = new THREE.Mesh(shellGeo, gantryMat);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    gantryGroup.add(mainBody);

    if (window.CTMeshFactory && typeof window.CTMeshFactory.createContactShadowPlane === "function") {
        const gantryShadow = window.CTMeshFactory.createContactShadowPlane(2.6, 1.2, 0.7);
        gantryShadow.position.set(0, -1.199, 0);
        gantryGroup.add(gantryShadow);
    }

    // Bore Tunnel
    const tunnelGeo = new THREE.CylinderGeometry(boreRadius - 0.005, boreRadius - 0.005, shellDepth, 128, 1, true);
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.rotation.x = Math.PI / 2;
    gantryGroup.add(tunnel);

    const flareDepth = bevelT + 0.02;
    const flareGeo = new THREE.CylinderGeometry(boreRadius - 0.005, boreRadius + 0.08, flareDepth, 128, 1, true);
    const frontFlare = new THREE.Mesh(flareGeo, gantryMat);
    frontFlare.rotation.x = Math.PI / 2;
    frontFlare.position.z = shellDepth / 2 + flareDepth / 2;
    gantryGroup.add(frontFlare);

    const backFlare = frontFlare.clone();
    backFlare.rotation.x = -Math.PI / 2;
    backFlare.position.z = -(shellDepth / 2 + flareDepth / 2);
    gantryGroup.add(backFlare);

    // Distinctive glowing blue ring
    const glowGeo = new THREE.TorusGeometry(boreRadius + 0.015, 0.015, 32, 128);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x5599ff, transparent: true, opacity: 0.6 });
    const glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.position.z = shellDepth / 2 + flareDepth / 2 - 0.01;
    gantryGroup.add(glowRing);



    // --- 2. High-Contrast Emphasized Control Panels ---
    // Positioned exactly like the reference image
    gantryGroup.add(CTMeshFactory.createGantryControlPanel(0.75, 0.35, frontZ));
    gantryGroup.add(CTMeshFactory.createGantryControlPanel(-0.75, 0.35, frontZ));

    // Status LEDs
    const ledRedMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x33ff33 });

    Meshes.ledRed = new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), ledRedMat);
    Meshes.ledRed.position.set(-0.75, 0.65, frontZ);
    gantryGroup.add(Meshes.ledRed);

    Meshes.ledGreen = new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), ledGreenMat);
    Meshes.ledGreen.position.set(0.75, 0.65, frontZ);
    gantryGroup.add(Meshes.ledGreen);

    // --- 3. Accurate Pill-shaped Gantry Cameras ---
    function createCameraModule(x, y, isVertical) {
        const camGroup = new THREE.Group();
        camGroup.position.set(x, y, frontZ);

        // Black lens capsule
        const lensGeo = new THREE.SphereGeometry(0.025, 24, 24);
        const lens = new THREE.Mesh(lensGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));

        if (isVertical) {
            lens.scale.set(0.6, 1.4, 0.2);
        } else {
            lens.scale.set(1.4, 0.6, 0.2);
        }

        lens.position.z = 0.005;
        camGroup.add(lens);
        return camGroup;
    }

    // Top Center Camera (Vertical) - Directly above the bore
    gantryGroup.add(createCameraModule(0, 0.52, true));
    // Left Side Camera (Horizontal) - Directly beside the bore
    gantryGroup.add(createCameraModule(-0.52, 0, false));

    const rotorGroup = new THREE.Group();
    const rotorRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.2, 96, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x222, side: THREE.DoubleSide }),
    );
    rotorRing.rotation.x = Math.PI / 2;
    rotorGroup.add(rotorRing);

    const tubeGroup = new THREE.Group();
    tubeGroup.position.set(0, 0.52, 0); // Safely behind 0.40 bore radius

    const caseGeo = new THREE.BoxGeometry(0.38, 0.14, 0.22);
    tubeGroup.add(new THREE.Mesh(caseGeo, new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6 })));

    const anode = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 32), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 }));
    anode.rotation.z = Math.PI / 2;
    anode.position.y = 0.02;
    tubeGroup.add(anode);
    rotorGroup.add(tubeGroup);

    const detectorGroup = new THREE.Group();
    const detectorAngle = Math.PI / 2.25;
    const rIn = 0.52;
    const rOut = 0.55;
    const startAngle = -Math.PI / 2 - detectorAngle / 2;
    const endAngle = -Math.PI / 2 + detectorAngle / 2;

    const detShape = new THREE.Shape();
    detShape.moveTo(rIn * Math.cos(startAngle), rIn * Math.sin(startAngle));
    detShape.absarc(0, 0, rOut, startAngle, endAngle, false);
    detShape.lineTo(rIn * Math.cos(endAngle), rIn * Math.sin(endAngle));
    detShape.absarc(0, 0, rIn, endAngle, startAngle, true);

    const detGeo = new THREE.ExtrudeGeometry(detShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, curveSegments: 64 });
    detGeo.translate(0, 0, -0.08);
    detectorGroup.add(new THREE.Mesh(detGeo, new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.3, roughness: 0.6 })));
    rotorGroup.add(detectorGroup);
    Meshes.detectorGroup = detectorGroup;

    const beamHeight = 0.92;
    const beamGeo = new THREE.ConeGeometry(0.6, beamHeight, 4, 1, true);
    beamGeo.rotateY(Math.PI / 4);
    beamGeo.translate(0, -beamHeight / 2, 0);

    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const xrayBeam = new THREE.Mesh(beamGeo, beamMat);
    xrayBeam.position.set(0, 0.52, 0);
    xrayBeam.scale.set(1.2, 1.0, 0.16);
    rotorGroup.add(xrayBeam);
    Meshes.xrayBeam = xrayBeam;
    Meshes.beamMat = beamMat;

    gantryGroup.add(rotorGroup);
    Meshes.rotor = rotorGroup;
    ctGroup.add(gantryGroup);

    // --- 4. Patient Couch (Authentic Medical Hardware Design) ---
    const couchGroup = new THREE.Group();

    // Floor Base Pedestal (Compact, rounded motor housing on the floor)
    const couchFloorBase = createRoundedBox(0.70, 0.18, 1.40, 0.06, baseCoverMat);
    couchFloorBase.position.set(0, -0.09, 2.6);
    couchFloorBase.castShadow = true;
    couchFloorBase.receiveShadow = true;
    couchGroup.add(couchFloorBase);

    if (window.CTMeshFactory && typeof window.CTMeshFactory.createContactShadowPlane === "function") {
        const couchShadow = window.CTMeshFactory.createContactShadowPlane(1.1, 1.8, 0.6);
        couchShadow.position.set(0, -0.179, 2.6);
        couchGroup.add(couchShadow);
    }

    // Middle sliding mechanism cover
    const couchMidBase = createRoundedBox(0.56, 0.12, 1.30, 0.04, new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 }));
    couchMidBase.position.set(0, 0.06, 2.6);
    couchMidBase.castShadow = true;
    couchMidBase.receiveShadow = true;
    couchGroup.add(couchMidBase);

    // Expanding Bellows Column (Vertical accordion lift)
    const bellowsGroup = new THREE.Group();
    bellowsGroup.position.set(0, 0.22, 2.6);
    const bellowsCount = 6;
    const bellowsParts = [];
    for (let i = 0; i < bellowsCount; i++) {
        const width = 0.50 - i * 0.015;
        const depth = 1.15 - i * 0.03;
        const bMesh = createRoundedBox(width, 0.08, depth, 0.03, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 }));
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        bellowsParts.push(bMesh);
        bellowsGroup.add(bMesh);
    }
    couchGroup.add(bellowsGroup);
    Meshes.bellowsGroup = bellowsGroup;
    Meshes.bellows = bellowsParts;

    const tabletopGroup = new THREE.Group();
    tabletopGroup.position.set(0, 0.88, 2.6);

    // Under-table Sliding Support Carriage (Cantilevered cradle frame)
    const supportBase = createRoundedBox(0.46, 0.09, 1.70, 0.04, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }));
    supportBase.position.set(0, -0.06, -0.25);
    supportBase.castShadow = true;
    supportBase.receiveShadow = true;
    tabletopGroup.add(supportBase);

    // Grab Handle at the rear end of the extended table
    const handleGeo = new THREE.TorusGeometry(0.16, 0.012, 16, 32, Math.PI);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.5 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = -Math.PI / 2;
    handle.position.set(0, -0.01, 0.85); // Positioned at rear end of extended 2.4m plate
    handle.castShadow = true;
    handle.receiveShadow = true;
    tabletopGroup.add(handle);

    // --- Positioning Alignment Lasers (Red & Green Crosshairs) ---
    const laserGroup = new THREE.Group();
    laserGroup.position.set(0, 0, shellDepth / 2 + bevelT + 0.001);

    const laserMatRed = new THREE.MeshBasicMaterial({
        color: 0xff1133,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    const laserMatGreen = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });

    // Vertical central alignment laser plane
    const laserV = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.78), laserMatRed);
    laserGroup.add(laserV);

    // Horizontal alignment laser plane
    const laserH = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.004), laserMatRed);
    laserGroup.add(laserH);

    // Lateral green alignment lasers
    const laserLatLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.50), laserMatGreen);
    laserLatLeft.position.set(-0.38, 0, 0);
    laserGroup.add(laserLatLeft);

    const laserLatRight = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.50), laserMatGreen);
    laserLatRight.position.set(0.38, 0, 0);
    laserGroup.add(laserLatRight);

    gantryGroup.add(laserGroup);
    Meshes.laserGroup = laserGroup;

    // Realistic CT Carbon Fiber Tabletop Plate (2.4m length, extended 30cm away from CT)
    let carbonTexture = null;
    if (window.CTMeshFactory && typeof window.CTMeshFactory.createCarbonFiberTexture === "function") {
        carbonTexture = window.CTMeshFactory.createCarbonFiberTexture();
    }
    const carbonMat = new THREE.MeshStandardMaterial({
        color: 0x333742,
        roughness: 0.3,
        metalness: 0.2,
        bumpMap: carbonTexture,
        bumpScale: 0.002
    });
    const tabletop = createRoundedBox(0.44, 0.025, 2.40, 0.02, carbonMat);
    tabletop.position.set(0, 0.012, -0.35);
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    tabletopGroup.add(tabletop);

    // Soft Comfort Mattress with pale medical blue-gray vinyl cover (2.25m length)
    const mattress = createRoundedBox(0.42, 0.035, 2.25, 0.02, new THREE.MeshStandardMaterial({ color: 0x9cb0c5, roughness: 0.65 }));
    mattress.position.set(0, 0.042, -0.35);
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    tabletopGroup.add(mattress);

    const patientGroup = new THREE.Group();
    patientGroup.position.set(0, 0.060, 0.0);
    tabletopGroup.add(patientGroup);
    Meshes.patientGroup = patientGroup;

    const phantomGroup = new THREE.Group();
    phantomGroup.position.set(0, 0.20, 0.0);
    if (window.CTMeshFactory && typeof window.CTMeshFactory.createWaterPhantomMesh === "function") {
        phantomGroup.add(window.CTMeshFactory.createWaterPhantomMesh());
    }
    phantomGroup.visible = false;
    tabletopGroup.add(phantomGroup);
    Meshes.phantomGroup = phantomGroup;

    async function loadPatientGlb() {
        try {
            if (window.CTModelRegistry) {
                const defaultId = (window.CTModelsConfig && typeof window.CTModelsConfig.getDefaultPatientId === "function")
                    ? window.CTModelsConfig.getDefaultPatientId()
                    : null;
                const instance = await window.CTModelRegistry.spawnModelInstance(
                    AppState.patientModelId || defaultId,
                    { instanceId: "patient_primary", attachTo: "couch", visible: AppState.patientVisible }
                );
                patientGroup.visible = AppState.patientVisible;

                // スポーン直後の実際の初期トランスフォーム（Y位置補正等を含む）を AppState および UI にロード
                if (instance && instance.transform && window.AppState) {
                    const pos = instance.transform.position || [0, -0.1, 0.45];
                    const rot = instance.transform.rotation || [-90, 0, 0];
                    window.AppState.patientOffset = {
                        x: pos[0],
                        y: pos[1],
                        z: pos[2],
                        rotX: rot[0],
                        rotY: rot[1],
                        rotZ: rot[2]
                    };
                    if (typeof window.syncAllPatientTransformUI === "function") {
                        window.syncAllPatientTransformUI();
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to load primary GLB patient model, fallback to dummy mesh:", e);
            const dummy = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.7, 0.2), new THREE.MeshStandardMaterial({ color: 0x5599cc, roughness: 0.8 }));
            dummy.position.set(0, 0.1, 0);
            dummy.castShadow = true;
            patientGroup.add(dummy);
            patientGroup.visible = AppState.patientVisible;
        }
    }
    loadPatientGlb();

    couchGroup.add(tabletopGroup);
    Meshes.tabletopGroup = tabletopGroup;

    ctGroup.add(couchGroup);
    scene.add(ctGroup);
}
