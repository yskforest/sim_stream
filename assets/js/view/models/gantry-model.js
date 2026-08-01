function buildCTScanner() {
    const ctGroup = new THREE.Group();

    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 1.2, 0);

    // High-end medical materials
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.15, metalness: 0.1 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const baseCoverMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.5 });
    const tunnelMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, side: THREE.DoubleSide });

    Meshes.materials = {
        gantry: gantryMat,
        base: baseCoverMat,
        tunnel: tunnelMat,
        accessories: [darkMat]
    };

    // Helper for Logos
    function createLogoTexture(text, fontStr, color, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.font = fontStr;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return texture;
    }

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

    // Distinctive glowing blue ring (Aquilion style)
    const glowGeo = new THREE.TorusGeometry(boreRadius + 0.015, 0.015, 32, 128);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x5599ff, transparent: true, opacity: 0.6 });
    const glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.position.z = shellDepth / 2 + flareDepth / 2 - 0.01;
    gantryGroup.add(glowRing);

    // --- 2. High-Contrast Emphasized Control Panels ---
    function createControlPanel(x, y) {
        const group = new THREE.Group();
        group.position.set(x, y, frontZ);

        // Emphasized Bezel / Frame
        const bezel = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.42, 0.015),
            new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.6 })
        );
        bezel.position.z = 0.0075;
        bezel.castShadow = true;
        group.add(bezel);

        // Dark-themed LCD Screen (Blackish/Dark Grey)
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x181a1f });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), screenMat);
        screen.position.set(0, 0.07, 0.016);
        group.add(screen);

        // Light UI on Dark Screen (Human Figure)
        const uiMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
        const head = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), uiMat);
        head.position.set(0, 0.11, 0.017);
        group.add(head);
        const body = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.10), uiMat);
        body.position.set(0, 0.03, 0.017);
        group.add(body);

        // Emphasized D-Pad Buttons
        const dpadGroup = new THREE.Group();
        dpadGroup.position.set(0, -0.11, 0.016);

        const btnGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.005, 24);
        btnGeo.rotateX(Math.PI / 2);
        const btnMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

        const positions = [[0, 0.04], [0, -0.04], [-0.04, 0], [0.04, 0], [0, 0]];
        positions.forEach(pos => {
            const btn = new THREE.Mesh(btnGeo, btnMat);
            btn.position.set(pos[0], pos[1], 0);
            btn.castShadow = true;
            dpadGroup.add(btn);
        });
        group.add(dpadGroup);

        return group;
    }

    // Positioned exactly like the reference image
    gantryGroup.add(createControlPanel(0.75, 0.35));
    gantryGroup.add(createControlPanel(-0.75, 0.35));

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

    // --- 4. Patient Couch (Detailed front, handles, structural tiers) ---
    const couchGroup = new THREE.Group();

    // Bottom wide structural base
    const couchFloorBase = createRoundedBox(0.85, 0.15, 2.0, 0.06, baseCoverMat);
    couchFloorBase.position.set(0, -0.07, 2.6);
    couchGroup.add(couchFloorBase);

    // Middle sliding mechanism cover
    const couchMidBase = createRoundedBox(0.65, 0.15, 1.95, 0.05, new THREE.MeshStandardMaterial({ color: 0xf0f0f0 }));
    couchMidBase.position.set(0, 0.08, 2.6);
    couchGroup.add(couchMidBase);

    // Expanding Bellows
    const bellowsGroup = new THREE.Group();
    bellowsGroup.position.set(0, 0.25, 2.6);
    const bellowsCount = 6;
    const bellowsParts = [];
    for (let i = 0; i < bellowsCount; i++) {
        const width = 0.58 - i * 0.02;
        const depth = 1.82 - i * 0.04;
        const bMesh = createRoundedBox(width, 0.10, depth, 0.04, new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.85 }));
        bellowsParts.push(bMesh);
        bellowsGroup.add(bMesh);
    }
    couchGroup.add(bellowsGroup);
    Meshes.bellowsGroup = bellowsGroup;
    Meshes.bellows = bellowsParts;

    const tabletopGroup = new THREE.Group();
    tabletopGroup.position.set(0, 0.88, 2.6);

    // Under-table support structure
    const supportBase = createRoundedBox(0.55, 0.15, 2.45, 0.05, new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.35 }));
    supportBase.position.y = -0.12;
    tabletopGroup.add(supportBase);

    // New U-Shaped Front Handle (Matches reference)
    const handleGeo = new THREE.TorusGeometry(0.18, 0.015, 16, 32, Math.PI);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = -Math.PI / 2;
    handle.position.set(0, -0.01, 1.70); // Placed at the very front tip
    tabletopGroup.add(handle);

    // Tabletop carbon-fiber/grey material
    const tabletop = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.025, 3.5), new THREE.MeshStandardMaterial({ color: 0x99aacc, roughness: 0.5 }));
    tabletop.position.set(0, 0.012, -0.15);
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    tabletopGroup.add(tabletop);

    // Thick Mattress with light grey cover
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 3.35), new THREE.MeshStandardMaterial({ color: 0xe5ebf2, roughness: 0.9 }));
    mattress.position.set(0, 0.042, -0.15);
    tabletopGroup.add(mattress);

    const patientGroup = new THREE.Group();
    patientGroup.position.set(0, 0.060, -0.2);
    tabletopGroup.add(patientGroup);
    Meshes.patientGroup = patientGroup;

    async function loadPatientGlb() {
        try {
            if (window.CTModelRegistry) {
                const instance = await window.CTModelRegistry.spawnModelInstance(
                    AppState.patientModelId || "rp_posed_00178_29",
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
