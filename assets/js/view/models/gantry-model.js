function buildCTScanner() {
            const ctGroup = new THREE.Group();

            // --- 1. 繧ｬ繝ｳ繝医Μ ---
            const gantryGroup = new THREE.Group();
            gantryGroup.position.set(0, 1.2, 0);

            const gantryMat = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.3, metalness: 0.1 });
            const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
            const baseCoverMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.6 });
            const blueLightMat = new THREE.MeshBasicMaterial({ color: 0x66bbff });

            const tunnelMat = new THREE.MeshPhysicalMaterial({
                color: 0xeeeeee, transparent: false, opacity: 1.0,
                roughness: 0.2, transmission: 0.0, side: THREE.DoubleSide
            });

            const camFrameMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });
            const camLensMat = new THREE.MeshStandardMaterial({ color: 0x111, roughness: 0.1, metalness: 0.8 });
            const panelBaseMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea });
            const screenMat = new THREE.MeshBasicMaterial({ color: 0xe0f0ff });
            const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x88bbdd });
            const btnMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            const logoMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
            const ledRedMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
            const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x33ff33 });

            Meshes.materials = {
                gantry: gantryMat,
                base: baseCoverMat,
                tunnel: tunnelMat,
                accessories: [
                    darkMat, blueLightMat, camFrameMat, camLensMat,
                    panelBaseMat, screenMat, silhouetteMat, btnMat,
                    logoMat, ledRedMat, ledGreenMat
                ]
            };

            // Non-perfect-donut outer shell: rounded top with flatter lower section.
            const shellW = 1.34;
            const shellBottom = -1.10;
            const shellDepth = 0.58;
            const boreRadius = 0.68;
            const shellShape = new THREE.Shape();
            shellShape.moveTo(shellW, shellBottom);
            shellShape.lineTo(shellW, -0.05);
            shellShape.absarc(0, -0.05, shellW, 0, Math.PI, false);
            shellShape.lineTo(-shellW, shellBottom);
            shellShape.quadraticCurveTo(0, shellBottom - 0.10, shellW, shellBottom);

            const shellHole = new THREE.Path();
            shellHole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
            shellShape.holes.push(shellHole);

            const shellGeo = new THREE.ExtrudeGeometry(shellShape, {
                depth: shellDepth,
                curveSegments: 96,
                bevelEnabled: true,
                bevelThickness: 0.06,
                bevelSize: 0.08,
                bevelSegments: 10
            });
            shellGeo.translate(0, 0, -shellDepth / 2);
            const mainBody = new THREE.Mesh(shellGeo, gantryMat);
            mainBody.castShadow = true;
            mainBody.receiveShadow = true;
            gantryGroup.add(mainBody);

            // Base and feet closer to medical gantry stance.
            const gantryBase = createRoundedBox(2.72, 0.18, 1.08, 0.16, baseCoverMat);
            gantryBase.position.set(0, -1.16, 0);
            gantryGroup.add(gantryBase);

            const footL = createRoundedBox(0.42, 0.32, 0.88, 0.12, baseCoverMat);
            footL.position.set(-0.95, -0.98, 0);
            gantryGroup.add(footL);
            const footR = footL.clone();
            footR.position.x = 0.95;
            gantryGroup.add(footR);

            const tunnelDepth = 0.40;
            const tunnelRadius = 0.47;
            const tunnelGeo = new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, tunnelDepth, 96, 1, true);
            const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
            tunnel.rotation.x = Math.PI / 2;
            gantryGroup.add(tunnel);

            // Inner matte shroud to keep rotor visually inside the housing.
            const shroudMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide });
            const innerShroud = new THREE.Mesh(
                new THREE.CylinderGeometry(0.62, 0.62, 0.56, 96, 1, true),
                shroudMat
            );
            innerShroud.rotation.x = Math.PI / 2;
            gantryGroup.add(innerShroud);

            const flareMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.25, metalness: 0.06 });
            const frontFlare = new THREE.Mesh(new THREE.TorusGeometry(tunnelRadius + 0.05, 0.040, 22, 120), flareMat);
            frontFlare.position.z = shellDepth * 0.36;
            gantryGroup.add(frontFlare);
            const rearFlare = frontFlare.clone();
            rearFlare.position.z = -shellDepth * 0.36;
            gantryGroup.add(rearFlare);

            const ringGeo = new THREE.TorusGeometry(tunnelRadius + 0.002, 0.006, 16, 96);
            const ringFront = new THREE.Mesh(ringGeo, blueLightMat);
            ringFront.position.z = tunnelDepth / 2 - 0.01;
            gantryGroup.add(ringFront);
            const ringRear = ringFront.clone();
            ringRear.position.z = -tunnelDepth / 2 + 0.01;
            gantryGroup.add(ringRear);

            // Front device mounts / panels.
            const frontZ = 0.405;

            function createCamera(x, y) {
                const camGroup = new THREE.Group();
                camGroup.position.set(x, y, frontZ);

                camGroup.lookAt(new THREE.Vector3(0, -0.2, 2.0));

                const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 32), camFrameMat);
                frame.rotation.x = Math.PI / 2;

                const lens = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 16), camLensMat);
                lens.scale.z = 0.5;
                lens.position.z = 0.01;

                camGroup.add(frame); camGroup.add(lens);
                return camGroup;
            }

            gantryGroup.add(createCamera(0, 0.82));
            gantryGroup.add(createCamera(-0.82, 0));

            function createControlPanel(x, y) {
                const panelGroup = new THREE.Group();
                panelGroup.position.set(x, y, frontZ);
                panelGroup.rotation.y = 0;

                const baseGeo = new THREE.BoxGeometry(0.26, 0.45, 0.02);
                const base = new THREE.Mesh(baseGeo, panelBaseMat);
                panelGroup.add(base);

                const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.26), screenMat);
                screen.position.set(0, 0.08, 0.011);
                const head = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), silhouetteMat);
                head.position.set(0, 0.07, 0.001);
                const body = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.09), silhouetteMat);
                body.position.set(0, -0.01, 0.001);
                screen.add(head); screen.add(body);
                panelGroup.add(screen);

                for (let i = 0; i < 2; i++) {
                    for (let j = 0; j < 3; j++) {
                        const btn = new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), btnMat);
                        btn.position.set(-0.06 + j * 0.06, -0.12 - i * 0.06, 0.011);
                        panelGroup.add(btn);
                    }
                }
                return panelGroup;
            }

            gantryGroup.add(createControlPanel(0.8, 0.35));
            gantryGroup.add(createControlPanel(-0.8, 0.35));

            const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.045), logoMat);
            logo.position.set(0, 1.08, 0.43);
            gantryGroup.add(logo);

            const ledRed = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), ledRedMat);
            ledRed.position.set(-0.62, 0.99, 0.43);
            gantryGroup.add(ledRed);

            const ledGreen = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), ledGreenMat);
            ledGreen.position.set(0.62, 0.99, 0.43);
            gantryGroup.add(ledGreen);

            // --- 蜀・Κ繝ｭ繝ｼ繧ｿ (X邱夂ｮ｡逅・→讀懷・蝎ｨ) ---
            const rotorGroup = new THREE.Group();

            const rotorRing = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.2, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0x222, side: THREE.DoubleSide }));
            rotorRing.rotation.x = Math.PI / 2;
            rotorGroup.add(rotorRing);

            const tubeGroup = new THREE.Group();
            tubeGroup.position.set(0, 0.45, 0);

            // 縺ｯ縺ｿ蜃ｺ縺鈴亟豁｢縺ｮ縺溘ａ縲∫ｮ｡逅・こ繝ｼ繧ｹ繧貞ｹ・ｺ・￥縲∝･･陦後″繧偵せ繝ｪ繝縺ｫ隱ｿ謨ｴ
            const caseGeo = new THREE.BoxGeometry(0.38, 0.14, 0.22);
            const caseMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6 });
            tubeGroup.add(new THREE.Mesh(caseGeo, caseMat));

            const anodeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.34, 32);
            const anodeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
            const anode = new THREE.Mesh(anodeGeo, anodeMat);
            anode.rotation.z = Math.PI / 2;
            anode.position.y = 0.02;
            tubeGroup.add(anode);

            const collimatorGeo = new THREE.BoxGeometry(0.08, 0.05, 0.12);
            const collimatorMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const collimator = new THREE.Mesh(collimatorGeo, collimatorMat);
            collimator.position.y = -0.07;
            tubeGroup.add(collimator);

            rotorGroup.add(tubeGroup);

            const detectorGroup = new THREE.Group();
            const detectorAngle = Math.PI / 2.25;
            const rIn = 0.46;
            const rOut = 0.49;
            const startAngle = -Math.PI / 2 - detectorAngle / 2;
            const endAngle = -Math.PI / 2 + detectorAngle / 2;

            const detShape = new THREE.Shape();
            detShape.moveTo(rIn * Math.cos(startAngle), rIn * Math.sin(startAngle));
            detShape.absarc(0, 0, rOut, startAngle, endAngle, false);
            detShape.lineTo(rIn * Math.cos(endAngle), rIn * Math.sin(endAngle));
            detShape.absarc(0, 0, rIn, endAngle, startAngle, true);

            const baseDepth = 0.16;
            const detExtrude = { depth: baseDepth, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2, curveSegments: 64 };
            const detGeo = new THREE.ExtrudeGeometry(detShape, detExtrude);
            detGeo.translate(0, 0, -baseDepth / 2);
            const detMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.3, roughness: 0.6 });
            detectorGroup.add(new THREE.Mesh(detGeo, detMat));

            const senShape = new THREE.Shape();
            const sIn = 0.458;
            const sOut = 0.462;
            senShape.moveTo(sIn * Math.cos(startAngle), sIn * Math.sin(startAngle));
            senShape.absarc(0, 0, sOut, startAngle, endAngle, false);
            senShape.lineTo(sIn * Math.cos(endAngle), sIn * Math.sin(endAngle));
            senShape.absarc(0, 0, sIn, endAngle, startAngle, true);

            const senDepth = 0.15;
            const senGeo = new THREE.ExtrudeGeometry(senShape, { depth: senDepth, bevelEnabled: false, curveSegments: 64 });
            senGeo.translate(0, 0, -senDepth / 2);
            const senMat = new THREE.MeshStandardMaterial({ color: 0x0088cc, metalness: 0.7, roughness: 0.2 });
            detectorGroup.add(new THREE.Mesh(senGeo, senMat));

            const wireMat = new THREE.MeshBasicMaterial({ color: 0x88ddff, wireframe: true, transparent: true, opacity: 0.3 });
            detectorGroup.add(new THREE.Mesh(senGeo, wireMat));

            rotorGroup.add(detectorGroup);
            Meshes.detectorGroup = detectorGroup;

            const beamHeight = 0.92;
            const beamGeo = new THREE.ConeGeometry(0.6, beamHeight, 4, 1, true);
            beamGeo.rotateY(Math.PI / 4);
            beamGeo.translate(0, -beamHeight / 2, 0);

            const beamMat = new THREE.MeshBasicMaterial({
                color: 0xffff00, transparent: true, opacity: 0.0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            const xrayBeam = new THREE.Mesh(beamGeo, beamMat);
            xrayBeam.position.set(0, 0.44, 0);

            xrayBeam.scale.set(1.6, 1.0, 0.16);

            rotorGroup.add(xrayBeam);
            Meshes.xrayBeam = xrayBeam;

            gantryGroup.add(rotorGroup);
            Meshes.rotor = rotorGroup;
            ctGroup.add(gantryGroup);

            // --- 2. 蟇晏床 (繧ｫ繧ｦ繝・ ---
            const couchGroup = new THREE.Group();

            // Base carriage: wider, cleaner skirt-like design.
            const couchBase = createRoundedBox(0.9, 0.18, 1.95, 0.14, baseCoverMat);
            couchBase.position.set(0, 0.09, 2.6);
            couchGroup.add(couchBase);

            const bellowsGroup = new THREE.Group();
            bellowsGroup.position.set(0, 0.2, 2.6);
            const bellowsCount = 5;
            const bellowsParts = [];
            const bellowsMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.85 });
            for (let i = 0; i < bellowsCount; i++) {
                const width = 0.78 - (i * 0.03);
                const depth = 1.82 - (i * 0.06);
                const bMesh = createRoundedBox(width, 0.085, depth, 0.09, bellowsMat);
                bellowsParts.push(bMesh);
                bellowsGroup.add(bMesh);
            }
            couchGroup.add(bellowsGroup);
            Meshes.bellows = bellowsParts;

            const tabletopGroup = new THREE.Group();
            tabletopGroup.position.set(0, 0.8, 2.6);

            const supportMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.35 });
            const supportBase = createRoundedBox(0.74, 0.20, 2.35, 0.11, supportMat);
            supportBase.position.y = -0.10;
            tabletopGroup.add(supportBase);

            const footCover = createRoundedBox(0.80, 0.22, 0.58, 0.16, supportMat);
            footCover.position.set(0, -0.07, 0.96);
            tabletopGroup.add(footCover);

            const handle = createRoundedBox(0.42, 0.045, 0.11, 0.02, darkMat);
            handle.position.set(0, -0.05, 1.2);
            tabletopGroup.add(handle);

            const tableGeo = new THREE.BoxGeometry(0.56, 0.028, 3.5);
            const tableMat = new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.65 });
            const tabletop = new THREE.Mesh(tableGeo, tableMat);
            tabletop.position.set(0, 0.016, -0.22);
            tabletop.castShadow = true; tabletop.receiveShadow = true;
            tabletopGroup.add(tabletop);

            const matGeo = new THREE.BoxGeometry(0.54, 0.022, 3.35);
            const matMat = new THREE.MeshStandardMaterial({ color: 0xb3bbc5, roughness: 0.85 });
            const mattress = new THREE.Mesh(matGeo, matMat);
            mattress.position.set(0, 0.038, -0.22);
            tabletopGroup.add(mattress);

            const patientGroup = new THREE.Group();
            patientGroup.position.set(0, 0.08, -0.2);
            tabletopGroup.add(patientGroup);
            Meshes.patientGroup = patientGroup;

            const loader = new THREE.GLTFLoader();
            loader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Xbot.glb', function (gltf) {
                const model = gltf.scene;

                model.rotation.x = -Math.PI / 2;
                model.scale.set(0.85, 0.85, 0.85);
                // 謔｣閠・Δ繝・Ν繧偵＆繧峨↓繧ｬ繝ｳ繝医Μ譁ｹ蜷・螂･蛛ｴ)縺ｸ繧ｹ繝ｩ繧､繝・
                model.position.set(0, 0, 0.1);

                model.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.frustumCulled = false;
                    }
                });

                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(model);
                    const idleAnim = gltf.animations.find(a => a.name === 'idle') || gltf.animations[0];
                    if (idleAnim) {
                        const action = mixer.clipAction(idleAnim);
                        action.play();
                    }
                }

                patientGroup.add(model);
                patientGroup.visible = AppState.patientVisible;
            });

            couchGroup.add(tabletopGroup);
            Meshes.tabletopGroup = tabletopGroup;

            ctGroup.add(couchGroup);
            scene.add(ctGroup);
        }

