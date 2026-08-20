function buildInjector() {
    const injectorGroup = new THREE.Group();
    injectorGroup.position.set(-1.8, 0, 1.8);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.05 });
    const darkPlasticMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 });

    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32), bodyMat);
    standBase.position.y = 0.05;
    injectorGroup.add(standBase);

    if (window.CTMeshFactory && typeof window.CTMeshFactory.createContactShadowPlane === "function") {
        const injectorShadow = window.CTMeshFactory.createContactShadowPlane(0.7, 0.7, 0.5);
        injectorShadow.position.set(0, 0.001, 0);
        injectorGroup.add(injectorShadow);
    }

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 32), bodyMat);
    pole.position.y = 0.8;
    injectorGroup.add(pole);

    // Monitor mount and arm
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), bodyMat);
    mount.position.set(0, 1.3, 0);
    injectorGroup.add(mount);

    const monitorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 16), metalMat);
    monitorArm.rotation.z = Math.PI / 2;
    monitorArm.position.set(-0.12, 1.3, 0);
    injectorGroup.add(monitorArm);

    // Detailed Canvas Monitor Screen matching the reference UI
    const createMonitorTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 512, 256);

        ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
        for (let i = 0; i < 512; i += 30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); }
        for (let i = 0; i < 256; i += 30) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke(); }

        ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(40, 220); ctx.lineTo(90, 120); ctx.lineTo(250, 110); ctx.lineTo(250, 256); ctx.stroke();

        ctx.strokeStyle = '#0088ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(40, 220); ctx.lineTo(100, 160); ctx.lineTo(230, 150); ctx.lineTo(230, 256); ctx.stroke();

        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('Nemoto', 380, 230);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#00ff66'; ctx.fillText('A  32 ml', 380, 50);
        ctx.fillStyle = '#0088ff'; ctx.fillText('B  45 ml', 380, 80);
        return new THREE.CanvasTexture(canvas);
    };

    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(-0.4, 1.3, 0.05);
    monitorGroup.rotation.y = Math.PI / 8; // Angled slightly towards the viewer

    // White mount section on the right
    const monitorMountGeo = new THREE.BoxGeometry(0.15, 0.28, 0.03);
    const monitorMount = new THREE.Mesh(monitorMountGeo, bodyMat);
    monitorMount.position.set(0.15, 0, 0);
    monitorGroup.add(monitorMount);

    // Black screen base
    const monitorBaseGeo = new THREE.BoxGeometry(0.35, 0.28, 0.02);
    const monitorBase = new THREE.Mesh(monitorBaseGeo, darkPlasticMat);
    monitorBase.position.set(-0.1, 0, 0);
    monitorGroup.add(monitorBase);

    // Rounded left edge for the monitor
    const monitorLeftGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 32);
    const monitorLeft = new THREE.Mesh(monitorLeftGeo, darkPlasticMat);
    monitorLeft.rotation.x = Math.PI / 2;
    monitorLeft.position.set(-0.275, 0, 0);
    monitorGroup.add(monitorLeft);

    // Screen surface
    const screenGeo = new THREE.PlaneGeometry(0.35, 0.25);
    const screenMat = new THREE.MeshBasicMaterial({ map: createMonitorTexture() });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(-0.1, 0, 0.011);
    monitorGroup.add(screen);

    injectorGroup.add(monitorGroup);

    // Head Group (Injector Body)
    const headGroup = new THREE.Group();
    headGroup.position.set(0.15, 1.1, 0.15);
    headGroup.rotation.x = -Math.PI / 2.2; // Tilted downward heavily like the image
    headGroup.rotation.z = Math.PI / 12;
    headGroup.rotation.y = Math.PI / 6;

    // Sleek white body base (capsule flattened)
    const baseGeo = new THREE.CapsuleGeometry(0.13, 0.45, 32, 32);
    const bodyBase = new THREE.Mesh(baseGeo, bodyMat);
    bodyBase.scale.set(1, 1, 0.35); // Flatten depth
    bodyBase.position.set(0, 0, -0.02);
    headGroup.add(bodyBase);

    // Rear bulky housing for motors/electronics
    const rearGeo = new THREE.CapsuleGeometry(0.12, 0.2, 32, 32);
    const rearHousing = new THREE.Mesh(rearGeo, bodyMat);
    rearHousing.scale.set(1, 1, 0.8);
    rearHousing.position.set(0, 0.18, 0.04);
    headGroup.add(rearHousing);

    // Side guides/walls for the syringes
    const guideGeo = new THREE.CapsuleGeometry(0.02, 0.4, 16, 16);
    const leftGuide = new THREE.Mesh(guideGeo, bodyMat);
    leftGuide.position.set(-0.11, -0.05, 0.04);
    headGroup.add(leftGuide);

    const rightGuide = new THREE.Mesh(guideGeo, bodyMat);
    rightGuide.position.set(0.11, -0.05, 0.04);
    headGroup.add(rightGuide);

    // Middle divider
    const midGuide = new THREE.Mesh(guideGeo, bodyMat);
    midGuide.scale.set(0.5, 1, 0.5);
    midGuide.position.set(0, -0.05, 0.02);
    headGroup.add(midGuide);

    // Control Panel Display & Buttons on the top housing
    const panelGeo = new THREE.CapsuleGeometry(0.025, 0.1, 16, 16);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.3, emissive: 0x113344 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.rotation.z = Math.PI / 2;
    panel.scale.set(1, 1, 0.2);
    panel.position.set(0, 0.28, 0.13);
    headGroup.add(panel);

    const btnOrange = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.01, 16),
        new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.2 })
    );
    btnOrange.rotation.x = Math.PI / 2;
    btnOrange.position.set(0, 0.21, 0.135);
    headGroup.add(btnOrange);

    const btnGreenMat = new THREE.MeshStandardMaterial({ color: 0x00cc66, roughness: 0.2 });
    const btnGreenL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.01, 16), btnGreenMat);
    btnGreenL.rotation.x = Math.PI / 2;
    btnGreenL.position.set(-0.04, 0.16, 0.13);
    headGroup.add(btnGreenL);

    const btnGreenR = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.01, 16), btnGreenMat);
    btnGreenR.rotation.x = Math.PI / 2;
    btnGreenR.position.set(0.04, 0.16, 0.13);
    headGroup.add(btnGreenR);

    function createSyringe(offsetX, colorHex, isA) {
        const syringeGroup = new THREE.Group();
        // Positioned resting inside the base tray channel
        syringeGroup.position.set(offsetX, -0.05, 0.05);

        // Glass/Plastic Barrel - DepthWrite false avoids transparency sorting issues
        const barrelMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.25,
            roughness: 0.05,
            transmission: 0.9,
            ior: 1.48,
            thickness: 0.04,
            clearcoat: 0.5,
            clearcoatRoughness: 0.05,
            depthWrite: false
        });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 32), barrelMat);
        syringeGroup.add(barrel);

        // Syringe Label (Barcode and scale)
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128; labelCanvas.height = 256;
        const lctx = labelCanvas.getContext('2d');
        lctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; lctx.fillRect(0, 0, 128, 256);
        lctx.fillStyle = '#111'; lctx.fillRect(15, 20, 98, 40); // Barcode box
        lctx.fillStyle = isA ? '#00e676' : '#2979ff'; lctx.fillRect(15, 70, 40, 25); // Color marker
        lctx.fillStyle = '#111';
        for (let i = 120; i < 240; i += 15) { lctx.fillRect(20, i, 30, 2); lctx.fillRect(15, i + 7, 15, 1); } // Ticks

        const labelMat = new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(labelCanvas),
            transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false
        });
        // Wrapping label around half the barrel
        const labelGeo = new THREE.CylinderGeometry(0.0355, 0.0355, 0.22, 16, 1, true, -Math.PI / 2, Math.PI);
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.y = -0.02;
        syringeGroup.add(label);

        // Colored Fluid - Made Opaque to completely fix viewing angles and transparency depth issues
        const fluidGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.3, 32);
        fluidGeo.translate(0, 0.15, 0); // Translate so origin is at the bottom
        const fluidMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.2,
            metalness: 0.1,
            emissive: colorHex,
            emissiveIntensity: 0.4 // Makes it pop brightly like contrast dye
        });
        const fluid = new THREE.Mesh(fluidGeo, fluidMat);
        fluid.position.y = -0.15;
        syringeGroup.add(fluid);

        // Plunger
        const plungerGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.02, 32);
        const plungerMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
        const plunger = new THREE.Mesh(plungerGeo, plungerMat);

        // Thick white Plunger Rod
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 16), bodyMat);
        rod.position.y = 0.15;
        plunger.add(rod);

        plunger.position.y = 0.15;
        syringeGroup.add(plunger);

        // Nozzle and Connector
        const tipGroup = new THREE.Group();
        tipGroup.position.y = -0.15;

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.035, 0.03, 16), barrelMat);
        tip.position.y = -0.015;
        tipGroup.add(tip);

        // Colored plastic connector piece at the tip
        const connector = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.015, 16),
            new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 })
        );
        connector.position.y = -0.035;
        tipGroup.add(connector);

        // IV Tube curving forward and down
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, -0.04, 0),
            new THREE.Vector3(0, -0.15, 0),
            new THREE.Vector3(offsetX * 1.5, -0.2, 0.1),
            new THREE.Vector3(offsetX * 2, -0.4, 0.2)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.002, 8, false);
        const tube = new THREE.Mesh(tubeGeo, new THREE.MeshPhysicalMaterial({
            color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.2, transmission: 0.9, depthWrite: false
        }));
        tipGroup.add(tube);

        syringeGroup.add(tipGroup);

        return { group: syringeGroup, fluid, plunger };
    }

    // Bright green and blue fluids
    const syringeA = createSyringe(-0.055, 0x00ff66, true);
    const syringeB = createSyringe(0.055, 0x0088ff, false);
    headGroup.add(syringeA.group);
    headGroup.add(syringeB.group);

    // Export to global Meshes object for existing animation loop
    Meshes.injector = {
        fluidA: syringeA.fluid,
        plungerA: syringeA.plunger,
        fluidB: syringeB.fluid,
        plungerB: syringeB.plunger,
    };

    injectorGroup.add(headGroup);

    injectorGroup.traverse(function (child) {
        if (child.isMesh) {
            if (!child.material || child.material.transparent !== true) {
                child.castShadow = true;
            }
            child.receiveShadow = true;
        }
    });

    var targetScene = (typeof scene !== "undefined" && scene) ? scene : window.scene;
    if (targetScene) targetScene.add(injectorGroup);
}

window.buildInjector = buildInjector;
