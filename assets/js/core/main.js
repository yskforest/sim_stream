init();
animate();

function init() {
            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x111115);
            scene.fog = new THREE.FogExp2(0x111115, 0.03);

            camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2 - 0.01;

            // --- Lighting ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
            dirLight.position.set(5, 10, 5);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            scene.add(dirLight);

            const pointLight = new THREE.PointLight(0xddf0ff, 0.6, 5);
            pointLight.position.set(0, 1.2, 0);
            scene.add(pointLight);

            // --- Environment Build ---
            buildRoom();
            buildCTScanner();
            buildInjector();
            buildControlRoom();
            buildServerRack();

            // --- UI Setup ---
            setupUI();
            setCameraView('free');
            window.addEventListener('resize', onWindowResize);
            AppState.notify();
        }

        function buildRoom() {
            const floorGeo = new THREE.PlaneGeometry(30, 30);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.8 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            const grid = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
            grid.position.y = 0.01;
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

            const extrudeSettings = { depth: height, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 };
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            geometry.rotateX(-Math.PI / 2);
            geometry.translate(0, -height / 2, 0);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }

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

            const shape = new THREE.Shape();
            const w = 1.35;
            const b = -1.15;

            shape.moveTo(w, b);
            shape.lineTo(w, 0);
            shape.absarc(0, 0, w, 0, Math.PI, false);
            shape.lineTo(-w, b);
            shape.lineTo(w, b);

            const boreRadius = 0.65;
            const hole = new THREE.Path();
            hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
            shape.holes.push(hole);

            const extrudeSettings = {
                depth: 0.5, curveSegments: 64,
                bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.15, bevelSegments: 32
            };
            const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            bodyGeo.translate(0, 0, -0.25);
            const mainBody = new THREE.Mesh(bodyGeo, gantryMat);
            mainBody.castShadow = true; mainBody.receiveShadow = true;
            gantryGroup.add(mainBody);

            const taperPoints = [];
            const tunnelRadius = 0.46;
            const taperDepth = 0.1;
            for (let i = 0; i <= 30; i++) {
                const t = i / 30;
                // 縺ｪ縺繧峨°縺ｪ譖ｲ邱壹・繝・・繝代・
                const r = tunnelRadius + (boreRadius - tunnelRadius) * Math.sin(t * Math.PI / 2);
                const y = taperDepth * t;
                taperPoints.push(new THREE.Vector2(r, y));
            }
            const taperGeo = new THREE.LatheGeometry(taperPoints, 64);

            const frontTaper = new THREE.Mesh(taperGeo, gantryMat);
            frontTaper.rotation.x = -Math.PI / 2; // 謇句燕縺ｸ蜷代￥
            frontTaper.position.z = 0.15; // Z=0.15 縺九ｉ Z=0.25縺ｸ蠎・′繧・
            frontTaper.receiveShadow = true;
            gantryGroup.add(frontTaper);

            const rearTaper = new THREE.Mesh(taperGeo, gantryMat);
            rearTaper.rotation.x = Math.PI / 2; // 螂･縺ｸ蜷代￥
            rearTaper.position.z = -0.15; // Z=-0.15 縺九ｉ Z=-0.25縺ｸ蠎・′繧・
            rearTaper.receiveShadow = true;
            gantryGroup.add(rearTaper);

            // 繝医Φ繝阪Ν縺ｮ髟ｷ縺輔ｒ 0.45 縺九ｉ 0.3 縺ｫ遏ｭ邵ｮ・亥・驛ｨ繝代・繝・・縺ｯ縺ｿ蜃ｺ縺励ｒ髦ｲ豁｢・・
            const tunnelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.3, 64, 1, true);
            const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
            tunnel.rotation.x = Math.PI / 2;
            gantryGroup.add(tunnel);

            const ringGeo = new THREE.TorusGeometry(0.462, 0.008, 16, 64);
            const ringFront = new THREE.Mesh(ringGeo, blueLightMat);
            ringFront.position.z = 0.14; // 繝医Φ繝阪Ν縺ｮ遶ｯ縺ｫ蜷医ｏ縺帙※隱ｿ謨ｴ
            gantryGroup.add(ringFront);

            const ringRear = ringFront.clone();
            ringRear.position.z = -0.14; // 繝医Φ繝阪Ν縺ｮ遶ｯ縺ｫ蜷医ｏ縺帙※隱ｿ謨ｴ
            gantryGroup.add(ringRear);

            const gantryBase = createRoundedBox(2.7, 0.1, 1.0, 0.1, baseCoverMat);
            gantryBase.position.set(0, -1.15, 0);
            gantryGroup.add(gantryBase);

            const slitPlaneGeo = new THREE.PlaneGeometry(0.35, 0.02);
            for (let i = 0; i < 4; i++) {
                const slitR = new THREE.Mesh(slitPlaneGeo, darkMat);
                slitR.position.set(1.31, -0.3 - i * 0.12, 0.35);
                gantryGroup.add(slitR);

                const slitL = new THREE.Mesh(slitPlaneGeo, darkMat);
                slitL.position.set(-1.31, -0.3 - i * 0.12, 0.35);
                gantryGroup.add(slitL);
            }

            const frontZ = 0.395;

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

            const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.04), logoMat);
            logo.position.set(0, 1.15, 0.42);
            gantryGroup.add(logo);

            const ledRed = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), ledRedMat);
            ledRed.position.set(-0.6, 1.05, 0.42);
            gantryGroup.add(ledRed);

            const ledGreen = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), ledGreenMat);
            ledGreen.position.set(0.6, 1.05, 0.42);
            gantryGroup.add(ledGreen);

            // --- 蜀・Κ繝ｭ繝ｼ繧ｿ (X邱夂ｮ｡逅・→讀懷・蝎ｨ) ---
            const rotorGroup = new THREE.Group();

            const rotorRing = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.25, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x222, side: THREE.DoubleSide }));
            rotorRing.rotation.x = Math.PI / 2;
            rotorGroup.add(rotorRing);

            const tubeGroup = new THREE.Group();
            tubeGroup.position.set(0, 0.52, 0);

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
            const detectorAngle = Math.PI / 2.2;
            const rIn = 0.52;
            const rOut = 0.56;
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
            const sIn = 0.518;
            const sOut = 0.521;
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

            const beamHeight = 1.04;
            const beamGeo = new THREE.ConeGeometry(0.6, beamHeight, 4, 1, true);
            beamGeo.rotateY(Math.PI / 4);
            beamGeo.translate(0, -beamHeight / 2, 0);

            const beamMat = new THREE.MeshBasicMaterial({
                color: 0xffff00, transparent: true, opacity: 0.0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            const xrayBeam = new THREE.Mesh(beamGeo, beamMat);
            xrayBeam.position.set(0, 0.5, 0);

            xrayBeam.scale.set(1.6, 1.0, 0.16);

            rotorGroup.add(xrayBeam);
            Meshes.xrayBeam = xrayBeam;

            gantryGroup.add(rotorGroup);
            Meshes.rotor = rotorGroup;
            ctGroup.add(gantryGroup);

            // --- 2. 蟇晏床 (繧ｫ繧ｦ繝・ ---
            const couchGroup = new THREE.Group();

            // 菫ｮ豁｣: 蛻晄悄菴咲ｽｮ繧呈焔蜑・Z:2.6)縺ｸ遘ｻ蜍輔＠繧√ｊ霎ｼ縺ｿ繧定ｧ｣豸・
            const couchBase = createRoundedBox(0.8, 0.2, 1.8, 0.15, baseCoverMat);
            couchBase.position.set(0, 0.1, 2.6);
            couchGroup.add(couchBase);

            const bellowsGroup = new THREE.Group();
            bellowsGroup.position.set(0, 0.2, 2.6);
            const bellowsCount = 6;
            const bellowsParts = [];
            const bellowsMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.9 });
            for (let i = 0; i < bellowsCount; i++) {
                const width = 0.75 - (i * 0.025);
                const depth = 1.75 - (i * 0.04);
                const bMesh = createRoundedBox(width, 0.1, depth, 0.1, bellowsMat);
                bellowsParts.push(bMesh);
                bellowsGroup.add(bMesh);
            }
            couchGroup.add(bellowsGroup);
            Meshes.bellows = bellowsParts;

            const tabletopGroup = new THREE.Group();
            tabletopGroup.position.set(0, 0.8, 2.6);

            const supportMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 });
            const supportBase = createRoundedBox(0.72, 0.18, 2.2, 0.1, supportMat);
            supportBase.position.y = -0.09;
            tabletopGroup.add(supportBase);

            const footCover = createRoundedBox(0.75, 0.22, 0.5, 0.15, supportMat);
            footCover.position.set(0, -0.07, 0.9);
            tabletopGroup.add(footCover);

            const handle = createRoundedBox(0.4, 0.05, 0.1, 0.02, darkMat);
            handle.position.set(0, -0.05, 1.15);
            tabletopGroup.add(handle);

            const tableGeo = new THREE.BoxGeometry(0.55, 0.03, 3.4);
            const tableMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
            const tabletop = new THREE.Mesh(tableGeo, tableMat);
            tabletop.position.set(0, 0.015, -0.2);
            tabletop.castShadow = true; tabletop.receiveShadow = true;
            tabletopGroup.add(tabletop);

            const matGeo = new THREE.BoxGeometry(0.53, 0.025, 3.3);
            const matMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
            const mattress = new THREE.Mesh(matGeo, matMat);
            mattress.position.set(0, 0.04, -0.2);
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

        function buildInjector() {
            const injectorGroup = new THREE.Group();
            injectorGroup.position.set(-1.8, 0, 1.8);

            const standMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4, metalness: 0.3 });

            const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), standMat);
            standBase.position.y = 0.05;
            injectorGroup.add(standBase);

            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 16), standMat);
            pole.position.y = 0.7;
            injectorGroup.add(pole);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), standMat);
            arm.position.set(0.15, 1.3, 0);
            injectorGroup.add(arm);

            const headGroup = new THREE.Group();
            headGroup.position.set(0.3, 1.3, 0);
            headGroup.rotation.z = -Math.PI / 6;
            headGroup.rotation.y = Math.PI / 4;

            const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.15), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
            headGroup.add(headBox);

            function createSyringe(offsetX, isContrast) {
                const syringeGroup = new THREE.Group();
                syringeGroup.position.set(offsetX, 0.2, 0);

                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.1, transmission: 0.8 }));
                syringeGroup.add(barrel);

                const fluidGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.3, 16);
                fluidGeo.translate(0, 0.15, 0);
                const fluidMat = new THREE.MeshStandardMaterial({ color: isContrast ? 0xccffcc : 0xddddff, transparent: true, opacity: 0.8 });
                const fluid = new THREE.Mesh(fluidGeo, fluidMat);
                fluid.position.y = -0.15;
                syringeGroup.add(fluid);

                const plungerGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.05, 16);
                const plungerMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
                const plunger = new THREE.Mesh(plungerGeo, plungerMat);
                plunger.position.y = 0.15;

                const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8), plungerMat);
                rod.position.y = 0.15;
                plunger.add(rod);

                syringeGroup.add(plunger);
                return { group: syringeGroup, fluid, plunger };
            }

            const syringeA = createSyringe(-0.08, true);
            const syringeB = createSyringe(0.08, false);
            headGroup.add(syringeA.group); headGroup.add(syringeB.group);

            Meshes.injector = {
                fluidA: syringeA.fluid, plungerA: syringeA.plunger,
                fluidB: syringeB.fluid, plungerB: syringeB.plunger
            };

            injectorGroup.add(headGroup);
            scene.add(injectorGroup);
        }

        function buildControlRoom() {
            const controlGroup = new THREE.Group();
            
            // 菫ｮ豁｣: 譛ｺ繧偵＆繧峨↓螂･縺ｸ遘ｻ蜍包ｼ医ぎ繝ｳ繝医Μ繧・ｯ晏床縺九ｉ驕縺悶￠繧具ｼ・
            controlGroup.position.set(6.0, 0, 0);

            const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 2.2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
            deskTop.position.set(0, 0.75, 0);
            deskTop.castShadow = true; deskTop.receiveShadow = true;

            const legMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
            const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75);
            const leg1 = new THREE.Mesh(legGeo, legMat); leg1.position.set(0, -0.375, 0.9);
            const leg2 = new THREE.Mesh(legGeo, legMat); leg2.position.set(0, -0.375, -0.9);
            deskTop.add(leg1); deskTop.add(leg2);
            controlGroup.add(deskTop);

            function createConsoleMonitor(zOffset) {
                const monitorGroup = new THREE.Group();
                monitorGroup.position.set(0.1, 0.8, zOffset);
                monitorGroup.rotation.y = -Math.PI / 2 + (zOffset > 0 ? -0.1 : 0.1);

                const stand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x111 }));
                stand.position.y = 0.1;
                monitorGroup.add(stand);

                const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0x222 }));
                panel.position.set(0, 0.35, 0.05);

                const screenGroup = new THREE.Group();
                screenGroup.position.set(0, 0, 0.026);

                const screenBG = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.41), new THREE.MeshBasicMaterial({ color: 0x112233 }));
                screenGroup.add(screenBG);

                const imgBox = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x8899aa }));
                imgBox.position.set(0.15, 0, 0.001);
                screenGroup.add(imgBox);

                panel.add(screenGroup);
                monitorGroup.add(panel);
                return monitorGroup;
            }

            controlGroup.add(createConsoleMonitor(-0.4));
            controlGroup.add(createConsoleMonitor(0.4));

            const kbMat = new THREE.MeshStandardMaterial({ color: 0x222 });
            const kb1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.4), kbMat); kb1.position.set(-0.2, 0.775, -0.4); controlGroup.add(kb1);
            const kb2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.4), kbMat); kb2.position.set(-0.2, 0.775, 0.4); controlGroup.add(kb2);

            // 謫堺ｽ懊せ繧､繝・メ繝｣ (Operation Switcher)
            const switcherGroup = new THREE.Group();
            switcherGroup.position.set(0.0, 0.78, 0.0);
            switcherGroup.rotation.y = -Math.PI / 16;
            switcherGroup.rotation.z = Math.PI / 16; 

            const swBaseMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
            const swBaseGeo = new THREE.BoxGeometry(0.36, 0.04, 0.10); 
            const swBase = new THREE.Mesh(swBaseGeo, swBaseMat);
            switcherGroup.add(swBase);

            // 6縺､縺ｮ繝懊ち繝ｳ繧呈ｨｪ荳蛻励↓ (邱・ 襍､, 鮟・ 髱・ 逋ｽ, 逋ｽ)
            const btnColors = [0x22cc22, 0xcc2222, 0xddcc22, 0x2288dd, 0xcccccc, 0xcccccc];
            
            for (let i = 0; i < 6; i++) {
                const isStartBtn = (i === 0);
                // 髢句ｧ九・繧ｿ繝ｳ縺ｮ縺ｿ螟ｧ縺阪￥縺吶ｋ
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

            scene.add(controlGroup);
        }

        function buildServerRack() {
            const rackGroup = new THREE.Group();
            
            // 菫ｮ豁｣: 譛ｺ縺ｮ髫｣・・霆ｸ縺ｧ繝槭う繝翫せ譁ｹ蜷代∈・峨↓驟咲ｽｮ
            const rackX = 6.0;
            const rackZ = -2.2;
            rackGroup.position.set(rackX, 0, rackZ);

            // 螟匁棧 (蟷・0cm x 鬮倥＆160cm x 螂･陦・0cm 縺ｫ蠕ｮ隱ｿ謨ｴ)
            const rackWidth = 0.6;
            const rackHeight = 1.6;
            const rackDepth = 0.8;

            // 菫ｮ豁｣: 繝ｩ繝・け縺ｮ螟冶｣・ｒ逋ｽ繝吶・繧ｹ縺ｫ螟画峩
            const frameMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.2, roughness: 0.8 });
            const frameGeo = new THREE.BoxGeometry(rackWidth, rackHeight, rackDepth);
            const frame = new THREE.Mesh(frameGeo, frameMat);
            frame.position.y = rackHeight / 2;
            frame.castShadow = true; frame.receiveShadow = true;
            rackGroup.add(frame);

            // 蜀・Κ縺ｮ鮟偵＞閭梧勹・医し繝ｼ繝舌・繝ｦ繝九ャ繝医ｒ縺ｯ繧∬ｾｼ繧驛ｨ蛻・ｼ・
            const innerMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
            const innerPanel = new THREE.Mesh(new THREE.BoxGeometry(rackWidth - 0.04, rackHeight - 0.1, rackDepth + 0.01), innerMat);
            innerPanel.position.y = rackHeight / 2;
            rackGroup.add(innerPanel);

            Meshes.serverBlades = {};
            Meshes.serverLeds = [];

            // 繧ｵ繝ｼ繝舌・蜷阪ｒ螳夂ｾｩ (蜈ｨ6蜿ｰ)
            const serverNames = ['SCON', 'DCON', 'RTM', 'IDD', 'RDD', 'SAC'];
            const bladeCount = serverNames.length;
            const bladeHeight = 0.2;
            const bladeMargin = 0.04;
            // 繝ｩ繝・け荳矩Κ縺九ｉ縺ｮ繧ｪ繝輔そ繝・ヨ
            const startY = 0.1; 

            for(let i=0; i<bladeCount; i++) {
                const label = serverNames[i];
                const bladeGroup = new THREE.Group();
                const yPos = startY + i * (bladeHeight + bladeMargin) + bladeHeight/2;
                
                // 謇句燕・域ｭ｣髱｢・峨↓驟咲ｽｮ
                bladeGroup.position.set(0, yPos, rackDepth / 2 + 0.006);

                // 繝悶Ξ繝ｼ繝牙燕髱｢繝代ロ繝ｫ
                const bladeGeo = new THREE.BoxGeometry(rackWidth - 0.06, bladeHeight, 0.02);
                const bladeMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
                const blade = new THREE.Mesh(bladeGeo, bladeMat);
                bladeGroup.add(blade);

                // 謠帶ｰ怜哨・医Γ繝・す繝･鬚ｨ縺ｮ讓ｪ邱夲ｼ・
                const ventGeo = new THREE.PlaneGeometry(0.3, 0.1);
                const ventMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
                const vent = new THREE.Mesh(ventGeo, ventMat);
                vent.position.set(0, 0, 0.011);
                bladeGroup.add(vent);

                // 蜿匁焔 (蟾ｦ蜿ｳ)
                const handleGeo = new THREE.BoxGeometry(0.015, bladeHeight - 0.04, 0.04);
                const handleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 });
                const handleL = new THREE.Mesh(handleGeo, handleMat);
                handleL.position.set(-rackWidth/2 + 0.06, 0, 0.02);
                const handleR = handleL.clone();
                handleR.position.set(rackWidth/2 - 0.06, 0, 0.02);
                bladeGroup.add(handleL); bladeGroup.add(handleR);

                // 繧ｵ繝ｼ繝舌・繝ｩ繝吶Ν逕ｨ縺ｮ蟆上＆縺・ヱ繝阪Ν
                const lblGeo = new THREE.PlaneGeometry(0.08, 0.03);
                const lblMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
                const lbl = new THREE.Mesh(lblGeo, lblMat);
                lbl.position.set(-rackWidth/2 + 0.14, 0, 0.012);
                bladeGroup.add(lbl);

                // 繧ｹ繝・・繧ｿ繧ｹLED (髮ｻ貅・
                const ledGeo = new THREE.CircleGeometry(0.008, 16);
                const pwrLedMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                const pwrLed = new THREE.Mesh(ledGeo, pwrLedMat);
                pwrLed.position.set(-rackWidth/2 + 0.20, 0.02, 0.012);
                bladeGroup.add(pwrLed);

                // 繧｢繧ｯ繧ｻ繧ｹLED (繝√き繝√き縺吶ｋ髱偵＞繝ｩ繝ｳ繝礼ｾ､)
                for(let j=0; j<3; j++) {
                    const actLedMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true });
                    const actLed = new THREE.Mesh(ledGeo, actLedMat);
                    actLed.position.set(-rackWidth/2 + 0.24 + (j * 0.03), 0.02, 0.012);
                    bladeGroup.add(actLed);
                    Meshes.serverLeds.push(actLedMat); 
                }

                rackGroup.add(bladeGroup);

                // 繧ｫ繝｡繝ｩ縺ｮ繧ｿ繝ｼ繧ｲ繝・ヨ諠・ｱ繧剃ｿ晏ｭ・(譛ｺ縺ｮ驟咲ｽｮ縺ｫ蜷医ｏ縺帙※隱ｿ謨ｴ)
                Meshes.serverBlades[label] = {
                    target: new THREE.Vector3(rackX, yPos, rackZ + rackDepth/2),
                    cameraPos: new THREE.Vector3(rackX - 1.0, yPos + 0.1, rackZ + rackDepth/2 + 1.2)
                };
            }

            // 繝ｩ繝・け蜈ｨ菴薙・繧ｫ繝｡繝ｩ繝薙Η繝ｼ
            Meshes.serverBlades['FullRack'] = {
                target: new THREE.Vector3(rackX, rackHeight/2, rackZ),
                cameraPos: new THREE.Vector3(rackX - 2.5, rackHeight/2 + 0.2, rackZ + 2.0)
            };

            scene.add(rackGroup);
        }

        function setupUI() {
            UI.sliderCouchY = document.getElementById('slider-couch-y');
            UI.sliderCouchZ = document.getElementById('slider-couch-z');
            UI.sliderRotorSpeed = document.getElementById('slider-rotor-speed');
            UI.sliderInjectA = document.getElementById('slider-inject-a');
            UI.sliderInjectB = document.getElementById('slider-inject-b');
            UI.btnScanToggle = document.getElementById('btn-scan-toggle');
            UI.btnXrayToggle = document.getElementById('btn-xray-toggle');
            UI.selectDetectorRows = document.getElementById('select-detector-rows');
            UI.btnPatientToggle = document.getElementById('btn-patient-toggle');

            UI.sliderCouchY.addEventListener('input', e => CTCommandBus.execute({ target: 'couch', action: 'moveY', params: { value: parseFloat(e.target.value) } }));
            UI.sliderCouchZ.addEventListener('input', e => CTCommandBus.execute({ target: 'couch', action: 'moveZ', params: { value: parseFloat(e.target.value) } }));
            UI.sliderInjectA.addEventListener('input', e => CTCommandBus.execute({ target: 'injector', action: 'setA', params: { value: parseFloat(e.target.value) } }));
            UI.sliderInjectB.addEventListener('input', e => CTCommandBus.execute({ target: 'injector', action: 'setB', params: { value: parseFloat(e.target.value) } }));
            UI.selectDetectorRows.addEventListener('change', e => CTCommandBus.execute({ target: 'gantry', action: 'setDetectorRows', params: { value: parseInt(e.target.value) } }));

            // 蛻晏屓謠冗判
            renderBatchUI();

            AppState.subscribe(state => {
                document.getElementById('couch-y-val').innerText = state.couch.y.toFixed(0) + '%';
                document.getElementById('couch-z-val').innerText = state.couch.z.toFixed(0) + '%';
                document.getElementById('rotor-speed-val').innerText = state.gantry.rotorSpeed.toFixed(0) + ' rpm';
                document.getElementById('inject-a-val').innerText = state.injector.a.toFixed(0) + '%';
                document.getElementById('inject-b-val').innerText = state.injector.b.toFixed(0) + '%';

                UI.sliderCouchY.value = state.couch.y;
                UI.sliderCouchZ.value = state.couch.z;
                UI.sliderRotorSpeed.value = state.gantry.rotorSpeed;
                UI.sliderInjectA.value = state.injector.a;
                UI.sliderInjectB.value = state.injector.b;
                UI.selectDetectorRows.value = state.gantry.detectorRows;

                if (state.gantry.isScanning) {
                    UI.btnScanToggle.innerText = "Stop Scan";
                    UI.btnScanToggle.classList.replace('bg-green-600', 'bg-red-600');
                    UI.btnScanToggle.classList.replace('hover:bg-green-500', 'hover:bg-red-500');
                } else {
                    UI.btnScanToggle.innerText = "Start Scan";
                    UI.btnScanToggle.classList.replace('bg-red-600', 'bg-green-600');
                    UI.btnScanToggle.classList.replace('hover:bg-red-500', 'hover:bg-green-500');
                }

                if (state.gantry.xrayVisible) {
                    UI.btnXrayToggle.innerText = "Hide X-Ray Beam";
                    UI.btnXrayToggle.className = "w-full bg-yellow-500 hover:bg-yellow-400 text-xs py-1.5 rounded transition font-bold text-black";
                } else {
                    UI.btnXrayToggle.innerText = "Show X-Ray Beam";
                    UI.btnXrayToggle.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
                }

                if (Meshes.xrayBeam) {
                    Meshes.xrayBeam.material.opacity = state.gantry.xrayVisible ? 0.35 : 0.0;
                }

                if (Meshes.patientGroup) {
                    Meshes.patientGroup.visible = state.patientVisible;
                }
                if (state.patientVisible) {
                    UI.btnPatientToggle.innerText = "Hide Patient";
                    UI.btnPatientToggle.className = "w-full bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                } else {
                    UI.btnPatientToggle.innerText = "Show Patient";
                    UI.btnPatientToggle.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition text-gray-400";
                }

                applyStateToMeshes(state);
            });
        }

        function applyStateToMeshes(state) {
            const couchY_min = 0.45;
            const couchY_max = 0.95;
            const targetY = couchY_min + (couchY_max - couchY_min) * (state.couch.y / 100);

            if (Meshes.tabletopGroup) Meshes.tabletopGroup.position.y = targetY;

            if (Meshes.bellows) {
                const baseTop = 0.2;
                const totalBellowsHeight = targetY - baseTop - 0.02;
                const partHeight = totalBellowsHeight / Meshes.bellows.length;

                Meshes.bellows.forEach((mesh, index) => {
                    mesh.scale.y = partHeight / 0.1;
                    mesh.position.y = (index * partHeight) + (partHeight / 2);
                });
            }

            const couchZ_min = 2.6;
            const couchZ_max = -1.0;
            if (Meshes.tabletopGroup) {
                Meshes.tabletopGroup.position.z = couchZ_min + (couchZ_max - couchZ_min) * (state.couch.z / 100);
            }

            if (Meshes.detectorGroup && Meshes.xrayBeam) {
                const ratio = state.gantry.detectorRows / 320.0;
                Meshes.detectorGroup.scale.z = ratio;
                const baseBeamZScale = 0.16;
                Meshes.xrayBeam.scale.z = baseBeamZScale * ratio;
            }

            function updateSyringe(fluidMesh, plungerMesh, percent) {
                const ratio = Math.max(0.01, 1.0 - (percent / 100));
                if (fluidMesh) fluidMesh.scale.y = ratio;
                if (plungerMesh) plungerMesh.position.y = 0.15 - (0.3 * (percent / 100));
            }

            if (Meshes.injector) {
                updateSyringe(Meshes.injector.fluidA, Meshes.injector.plungerA, state.injector.a);
                updateSyringe(Meshes.injector.fluidB, Meshes.injector.plungerB, state.injector.b);
            }
        }

        function updateStateMonitor() {
            // Gantry
            const rpm = Math.round(AppState.gantry.rotorSpeed);
            document.getElementById('monitor-rpm').innerText = rpm + ' rpm';
            document.getElementById('monitor-rpm-bar').style.width = (rpm / 100 * 100) + '%';
            document.getElementById('monitor-mode').innerText = AppState.gantry.currentScanMode.replace(/_/g, ' ').toUpperCase();
            document.getElementById('monitor-rows').innerText = AppState.gantry.detectorRows;

            // Badge Status
            const badge = document.getElementById('status-badge');
            if (AppState.gantry.isScanning) {
                badge.innerText = 'SCANNING';
                badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse';
            } else if (rpm > 0) {
                badge.innerText = 'SPINNING';
                badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
            } else {
                badge.innerText = 'STANDBY';
                badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600 transition-colors duration-300';
            }

            // Couch
            document.getElementById('monitor-couch-y').innerText = Math.round(AppState.couch.y) + '%';
            document.getElementById('monitor-couch-z').innerText = Math.round(AppState.couch.z) + '%';

            // Injector
            const injA = Math.round(AppState.injector.a);
            const injB = Math.round(AppState.injector.b);
            const remainA = 100 - injA;
            const remainB = 100 - injB;

            document.getElementById('monitor-inj-a').innerText = remainA + '%';
            document.getElementById('monitor-inj-b').innerText = remainB + '%';
            document.getElementById('monitor-inj-a-bar').style.width = remainA + '%';
            document.getElementById('monitor-inj-b-bar').style.width = remainB + '%';
        }

        // 譁ｰ隕剰ｿｽ蜉: 繝舌ャ繝ゞI縺ｮ繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ髢｢謨ｰ
        function renderBatchUI() {
            const container = document.getElementById('batch-container');
            const seq = AppState.gantry.scanSequence;
            const activeIdx = AppState.gantry.activeBatchIndex;
            const syncIdx = AppState.gantry.injectorSyncIndex;
            const countdown = AppState.gantry.countdown;
            
            container.innerHTML = '';
            
            seq.forEach((batch, index) => {
                const isActive = index === activeIdx;
                const isRunning = AppState.gantry.isScanning || activeIdx >= 0;
                const mode = batch.mode;
                const delay = batch.delay;
                const isSyncTarget = index === syncIdx;

                // 繧ｫ繝ｼ繝峨・逕滓・
                const card = document.createElement('div');
                let cardClasses = `relative rounded-lg p-2.5 w-36 flex flex-col items-center transition-all duration-300 `;
                if (isActive) {
                    cardClasses += `bg-blue-900/80 border-2 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-110 z-10`;
                } else {
                    cardClasses += `bg-gray-800 border border-gray-600`;
                }
                card.className = cardClasses;

                // 繧ｪ繝ｼ繝舌・繝ｬ繧､繧ｫ繧ｦ繝ｳ繝医ム繧ｦ繝ｳ
                if (isActive && countdown > 0) {
                    const overlay = document.createElement('div');
                    overlay.className = 'absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center z-20 backdrop-blur-[2px]';
                    overlay.innerHTML = `<span class="text-[10px] text-yellow-400 font-bold mb-1 tracking-widest">DELAY</span><span class="text-4xl font-mono text-white font-bold leading-none">${countdown}</span>`;
                    card.appendChild(overlay);
                }
                
                // 繝倥ャ繝繝ｼ (繝ｩ繝吶Ν縺ｨ蜑企勁繝懊ち繝ｳ)
                const header = document.createElement('div');
                header.className = 'text-[10px] text-gray-400 mb-1.5 w-full flex justify-between items-center';
                
                const label = document.createElement('span');
                label.innerText = `Batch ${index + 1}`;
                if (isActive) label.className = 'text-yellow-400 font-bold';
                
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '&times;';
                delBtn.className = 'hover:text-red-400 text-base leading-none transition-colors';
                delBtn.disabled = isRunning || seq.length <= 1; 
                if (delBtn.disabled) delBtn.className += ' opacity-30 cursor-not-allowed';
                delBtn.onclick = () => removeScanBatch(index);
                
                header.appendChild(label);
                header.appendChild(delBtn);
                
                // 繝｢繝ｼ繝蛾∈謚槭・繝ｫ繝繧ｦ繝ｳ
                const select = document.createElement('select');
                select.className = 'w-full bg-gray-900 text-white text-[11px] p-1.5 rounded border border-gray-700 outline-none hover:border-blue-500 transition-colors cursor-pointer';
                select.disabled = isRunning;
                if (select.disabled) select.className += ' opacity-70 cursor-not-allowed';
                select.onchange = (e) => updateBatchData(index, 'mode', e.target.value);
                
                const options = [
                    {val: 'scano', text: 'Scano'},
                    {val: 'dual_scano', text: 'Dual Scano'},
                    {val: '3d_landmark', text: '3D Landmark'},
                    {val: 'helical', text: 'Helical'},
                    {val: 'axial', text: 'Axial'},
                    {val: 'volume', text: 'Volume'},
                    {val: 'dynamic', text: 'Dynamic'},
                    {val: 'real_prep', text: 'Real Prep'}
                ];
                
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.val;
                    option.innerText = opt.text;
                    if (opt.val === mode) option.selected = true;
                    select.appendChild(option);
                });
                
                // Delay蜈･蜉・
                const delayWrapper = document.createElement('div');
                delayWrapper.className = 'w-full flex items-center justify-between mt-2 text-[10px] text-gray-400';
                delayWrapper.innerHTML = '<span>Delay (s)</span>';
                
                const delayInput = document.createElement('input');
                delayInput.type = 'number';
                delayInput.min = '0';
                delayInput.max = '60';
                delayInput.value = delay;
                delayInput.className = 'w-10 bg-gray-900 text-white p-1 rounded border border-gray-700 outline-none text-center';
                delayInput.disabled = isRunning;
                delayInput.onchange = (e) => updateBatchData(index, 'delay', parseInt(e.target.value) || 0);
                
                delayWrapper.appendChild(delayInput);

                // 繧､繝ｳ繧ｸ繧ｧ繧ｯ繧ｿ蜷梧悄險ｭ螳壹・繧ｿ繝ｳ
                const syncBtn = document.createElement('button');
                syncBtn.innerText = isSyncTarget ? 'INJ SYNC: ON' : 'INJ SYNC: OFF';
                syncBtn.className = `w-full mt-2 py-1 rounded text-[9px] font-bold transition-colors ${isSyncTarget ? 'bg-purple-600/80 text-white border border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-gray-900 text-gray-500 border border-gray-700 hover:bg-gray-700'}`;
                syncBtn.disabled = isRunning;
                if (syncBtn.disabled) {
                    syncBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    syncBtn.classList.remove('hover:bg-gray-700');
                }
                syncBtn.onclick = () => setInjectorSync(index);

                card.appendChild(header);
                card.appendChild(select);
                card.appendChild(delayWrapper);
                card.appendChild(syncBtn);
                
                // 谺｡縺ｮ繧ｫ繝ｼ繝峨∈縺､縺ｪ縺千泙蜊ｰ繧｢繧､繧ｳ繝ｳ
                if (index < seq.length - 1) {
                    const arrowWrap = document.createElement('div');
                    arrowWrap.className = 'flex items-center justify-center text-gray-500';
                    arrowWrap.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>';
                    container.appendChild(card);
                    container.appendChild(arrowWrap);
                } else {
                    container.appendChild(card);
                }
            });

            const isRunning = AppState.gantry.isScanning || activeIdx >= 0;

            // 霑ｽ蜉繝懊ち繝ｳ縺ｮ迥ｶ諷区峩譁ｰ
            const addBtn = document.getElementById('btn-add-batch');
            addBtn.disabled = seq.length >= 5 || isRunning;
            if(addBtn.disabled) {
                addBtn.classList.add('opacity-30', 'cursor-not-allowed');
                addBtn.classList.remove('hover:bg-gray-700', 'hover:text-white');
            } else {
                addBtn.classList.remove('opacity-30', 'cursor-not-allowed');
                addBtn.classList.add('hover:bg-gray-700', 'hover:text-white');
            }
            
            // RUN繝懊ち繝ｳ縺ｮ迥ｶ諷区峩譁ｰ
            const runBtn = document.getElementById('btn-run-sequence');
            if (isRunning) {
                runBtn.disabled = false;
                runBtn.onclick = stopAutoSequence; // 螳溯｡御ｸｭ縺ｯ繧ｹ繝医ャ繝励・繧ｿ繝ｳ縺ｫ縺吶ｋ
                
                if (AppState.gantry.cancelRequested) {
                    runBtn.className = 'h-16 px-6 bg-gray-700 text-gray-400 text-xs font-bold rounded-lg border border-gray-600 flex items-center gap-2 transition-all cursor-not-allowed';
                    runBtn.innerHTML = '<div class="w-4 h-4 rounded-full border-2 border-t-red-400 animate-spin"></div> <span class="tracking-widest">STOPPING...</span>';
                    runBtn.disabled = true;
                } else if (countdown > 0) {
                    runBtn.className = 'h-16 px-6 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 tracking-wider';
                    runBtn.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-t-yellow-400 animate-spin"></div> <span class="tracking-widest">DELAY ${countdown}s (STOP)</span>`;
                } else {
                    runBtn.className = 'h-16 px-6 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 tracking-wider';
                    runBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg> STOP SEQUENCE';
                }
            } else {
                runBtn.disabled = false;
                runBtn.onclick = runAutoSequence;
                runBtn.className = 'h-16 px-6 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2 tracking-wider';
                runBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg> RUN SEQUENCE';
            }
        }

        // 驕ｸ謚槭＠縺溘ヰ繝・メ縺縺代う繝ｳ繧ｸ繧ｧ繧ｯ繧ｿ蜷梧悄繧丹N縺ｫ縺吶ｋ (莉悶・OFF)
        function setInjectorSync(index) {
            const current = AppState.gantry.injectorSyncIndex;
            CTCommandBus.execute({ target: 'gantry', action: 'setField', params: { key: 'injectorSyncIndex', value: current === index ? -1 : index } });
        }

        // 繝舌ャ繝√・霑ｽ蜉
        function addScanBatch() {
            if (AppState.gantry.scanSequence.length >= 5) return;
            const newSeq = [...AppState.gantry.scanSequence, {mode: 'helical', delay: 0}];
            CTCommandBus.execute({ target: 'gantry', action: 'setField', params: { key: 'scanSequence', value: newSeq } });
        }

        // 繝舌ャ繝√・蜑企勁
        function removeScanBatch(index) {
            if (AppState.gantry.scanSequence.length <= 1) return;
            const newSeq = [...AppState.gantry.scanSequence];
            newSeq.splice(index, 1);
            CTCommandBus.execute({ target: 'gantry', action: 'setField', params: { key: 'scanSequence', value: newSeq } });
        }

        // 繝舌ャ繝√・繝・・繧ｿ螟画峩 (繝｢繝ｼ繝峨ｄDelay)
        function updateBatchData(index, key, value) {
            const newSeq = [...AppState.gantry.scanSequence];
            newSeq[index] = { ...newSeq[index], [key]: value };
            CTCommandBus.execute({ target: 'gantry', action: 'setField', params: { key: 'scanSequence', value: newSeq } });
            
            if (key === 'mode') {
                showInfoDialog(value);
                if (index === 0) {
                    CTCommandBus.execute({ target: 'gantry', action: 'setField', params: { key: 'currentScanMode', value: value } });
                }
            }
        }

        // 繝輔か繝ｼ繧ｫ繧ｹ・・せ繧ｭ繝｣繝ｳ繝｢繝ｼ繝牙・騾壹・繝繧､繧｢繝ｭ繧ｰ陦ｨ遉ｺ髢｢謨ｰ
        function showInfoDialog(key) {
            if (!key || key === 'none') return;

            const dialog = document.getElementById('info-dialog');
            const titleElem = document.getElementById('info-dialog-title');
            const descElem = document.getElementById('info-dialog-desc');

            const text = Descriptions[key] || 'Description not found.';
            const lines = text.split('\n\n');
            
            titleElem.innerText = lines[0]; // 1陦檎岼繧偵ち繧､繝医Ν縺ｫ
            descElem.innerText = lines[1] || ''; // 2陦檎岼莉･髯阪ｒ隱ｬ譏取枚縺ｫ

            dialog.classList.remove('hidden');
            dialog.classList.remove('opacity-0');
        }

        function hideInfoDialog() {
            const dialog = document.getElementById('info-dialog');
            dialog.classList.add('hidden');
            // 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ縺ｮ驕ｸ謚樒憾諷九ｒ隗｣髯､ (Focus縺ｮ縺ｿ)
            document.getElementById('select-focus').value = "";
        }

        function handleFocusChange(value) {
            if (!value) return;

            // X邱夂ｮ｡逅・・繝・ぅ繝・け繧ｿ縺ｮ譎ゅ・荳ｭ霄ｫ繧定ｦ九○繧九◆繧√ぎ繝ｳ繝医Μ繧貞濠騾乗・蛹・
            if (value === 'XrayTube' || value === 'Detector') {
                setGantryOpacity(true);
            } else if (value === 'Gantry' || value === 'TouchPanel') {
                setGantryOpacity(false); 
            }

            setCameraView('focus_' + value);
            showInfoDialog(value);
        }

        function toggleScan() {
            const isScan = !AppState.gantry.isScanning;
            CTCommandBus.execute({ target: 'gantry', action: 'setScanning', params: { value: isScan } });

            new TWEEN.Tween(AppState.gantry)
                .to({ rotorSpeed: isScan ? 100 : 0 }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => AppState.notify())
                .start();
        }

        function setScanMode(mode) {
            CTCommandBus.execute({ target: 'gantry', action: 'setField', params: { key: 'scanMode', value: mode } });
        }

        function setCameraView(viewType) {
            // 繝輔か繝ｼ繧ｫ繧ｹ莉･螟悶・繧ｫ繝｡繝ｩ繝薙Η繝ｼ縺ｫ蛻・ｊ譖ｿ繧上▲縺溷ｴ蜷医・繝繧､繧｢繝ｭ繧ｰ繧帝國縺・
            if (!viewType.startsWith('focus_')) {
                hideInfoDialog();
            }

            new TWEEN.Tween(camera.position)
                .to(getCameraTarget(viewType).pos, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();

            new TWEEN.Tween(controls.target)
                .to(getCameraTarget(viewType).lookAt, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();
        }

        function getCameraTarget(type) {
            // 邨ｱ蜷医ヵ繧ｩ繝ｼ繧ｫ繧ｹ逕ｨ縺ｮ繧ｫ繝｡繝ｩ蜃ｦ逅・
            if (type.startsWith('focus_')) {
                const label = type.replace('focus_', '');
                
                // 1. 繧ｵ繝ｼ繝舌・繝ｩ繝・け蜀・・讀懃ｴ｢
                if (Meshes.serverBlades && Meshes.serverBlades[label]) {
                    return { pos: Meshes.serverBlades[label].cameraPos, lookAt: Meshes.serverBlades[label].target };
                }
                
                // 2. 縺昴・莉悶・繧ｳ繝ｳ繝昴・繝阪Φ繝医・讀懃ｴ｢
                const focusTargets = {
                    // 菫ｮ豁｣: 譛ｺ縺ｮ菴咲ｽｮ繧貞・菴鍋噪縺ｫ +2 縺ｻ縺ｩ縺壹ｉ縺励◆縺溘ａ繧ｫ繝｡繝ｩ繧る｣蜍・
                    'Injector': { cameraPos: new THREE.Vector3(-2.8, 1.6, 2.8), target: new THREE.Vector3(-1.5, 1.3, 1.8) },
                    'Gantry': { cameraPos: new THREE.Vector3(0, 2.0, 4.0), target: new THREE.Vector3(0, 1.2, 0) },
                    'Couch': { cameraPos: new THREE.Vector3(2.5, 1.8, 3.5), target: new THREE.Vector3(0, 0.8, 2.0) },
                    'TouchPanel': { cameraPos: new THREE.Vector3(1.2, 1.6, 1.0), target: new THREE.Vector3(0.8, 1.55, 0.4) },
                    'XrayTube': { cameraPos: new THREE.Vector3(0, 2.0, 1.2), target: new THREE.Vector3(0, 1.72, 0) },
                    'Detector': { cameraPos: new THREE.Vector3(0, 0.5, 1.5), target: new THREE.Vector3(0, 0.68, 0) },
                    'ConsoleDisplay': { cameraPos: new THREE.Vector3(5.0, 1.6, 0.5), target: new THREE.Vector3(6.1, 1.4, -0.2) },
                    'OperationSwitcher': { cameraPos: new THREE.Vector3(5.2, 1.1, 0.2), target: new THREE.Vector3(6.0, 0.78, 0.0) }
                };

                if (focusTargets[label]) {
                    return { pos: focusTargets[label].cameraPos, lookAt: focusTargets[label].target };
                }
            }

            switch (type) {
                case 'operator':
                    return { pos: new THREE.Vector3(7.0, 1.5, 0), lookAt: new THREE.Vector3(0, 1.2, 0) };
                case 'patient':
                    return { pos: new THREE.Vector3(0, 1.3, 4.0), lookAt: new THREE.Vector3(0, 1.2, 0) };
                case 'injector':
                    return { pos: new THREE.Vector3(-3.0, 1.6, 2.5), lookAt: new THREE.Vector3(-1.8, 1.3, 1.8) };
                case 'gantryTop':
                    return { pos: new THREE.Vector3(0, 2.02, 0.45), lookAt: new THREE.Vector3(0, 1.0, 1.5) };
                case 'gantrySide':
                    return { pos: new THREE.Vector3(-0.82, 1.2, 0.45), lookAt: new THREE.Vector3(0, 1.0, 1.5) };
                case 'free':
                default:
                    return { pos: new THREE.Vector3(4, 3, 5), lookAt: new THREE.Vector3(0, 0.5, 0) };
            }
        }

        function togglePatient() {
            CTCommandBus.execute({ target: 'simulator', action: 'setPatientVisible', params: { value: !AppState.patientVisible } });
        }

        function toggleXRay() {
            const isVisible = !AppState.gantry.xrayVisible;
            CTCommandBus.execute({ target: 'gantry', action: 'setXrayVisible', params: { value: isVisible } });

            if (isVisible) setGantryOpacity(true);
        }

        function setGantryOpacity(isTranslucent) {
            if (Meshes.materials) {
                const opacity = isTranslucent ? 0.2 : 1.0;

                Meshes.materials.gantry.transparent = isTranslucent;
                Meshes.materials.gantry.opacity = opacity;
                Meshes.materials.gantry.depthWrite = !isTranslucent;
                Meshes.materials.gantry.needsUpdate = true;

                Meshes.materials.base.transparent = isTranslucent;
                Meshes.materials.base.opacity = opacity;
                Meshes.materials.base.depthWrite = !isTranslucent;
                Meshes.materials.base.needsUpdate = true;

                Meshes.materials.tunnel.transparent = isTranslucent;
                Meshes.materials.tunnel.opacity = isTranslucent ? 0.35 : 1.0;
                Meshes.materials.tunnel.transmission = isTranslucent ? 0.9 : 0.0;
                Meshes.materials.tunnel.depthWrite = !isTranslucent;
                Meshes.materials.tunnel.needsUpdate = true;

                Meshes.materials.accessories.forEach(mat => {
                    mat.transparent = isTranslucent;
                    mat.opacity = opacity;
                    mat.depthWrite = !isTranslucent;
                    mat.needsUpdate = true;
                });
            }

            const btnOpq = document.getElementById('btn-gantry-opaque');
            const btnTrn = document.getElementById('btn-gantry-trans');

            if (isTranslucent) {
                btnTrn.className = "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                btnOpq.className = "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
            } else {
                btnOpq.className = "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                btnTrn.className = "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
            }
        }

        // 繧ｭ繝｣繝ｳ繧ｻ繝ｫ蜿ｯ閭ｽ縺ｪ Wait 髢｢謨ｰ
        function wait(ms) {
            return new Promise(resolve => {
                const interval = 100;
                let elapsed = 0;
                const timer = setInterval(() => {
                    elapsed += interval;
                    if (AppState.gantry.cancelRequested || elapsed >= ms) {
                        clearInterval(timer);
                        resolve();
                    }
                }, interval);
            });
        }

        function tweenPromise(target, to, duration, easing = TWEEN.Easing.Quadratic.InOut) {
            return new Promise(resolve => {
                const tween = new TWEEN.Tween(target)
                    .to(to, duration)
                    .easing(easing)
                    .onUpdate(() => {
                        AppState.notify();
                        if (AppState.gantry.cancelRequested) {
                            tween.stop();
                            resolve(); // 繧ｭ繝｣繝ｳ繧ｻ繝ｫ譎ゅ・蜊ｳ蠎ｧ縺ｫ隗｣豎ｺ縺励※谺｡縺ｸ・医お繝ｩ繝ｼ蜃ｦ逅・畑・・
                        }
                    })
                    .onComplete(resolve)
                    .start();
            });
        }

        let isSequenceRunning = false;

        // 繧ｷ繝ｼ繧ｱ繝ｳ繧ｹ縺ｮ荳ｭ譁ｭ隕∵ｱ・
        function stopAutoSequence() {
            if (!isSequenceRunning) return;
            CTSequenceService.setCancelRequested(true);
        }

        async function runAutoSequence() {
            if (isSequenceRunning) return;
            isSequenceRunning = true;
            CTSequenceService.setCancelRequested(false);

            // 迥ｶ諷九・繝ｪ繧ｻ繝・ヨ
            CTSequenceService.resetInitialHardwareState();
            if (AppState.gantry.xrayVisible) toggleXRay();
            if (AppState.gantry.isScanning) toggleScan();

            // 1. 蟇晏床縺ｮ荳頑・
            await tweenPromise(AppState.couch, { y: 80 }, 2000);

            const seq = AppState.gantry.scanSequence;

            // 繝舌ャ繝∝・逅・Ν繝ｼ繝・
            for (let i = 0; i < seq.length; i++) {
                if (AppState.gantry.cancelRequested) break;

                const batch = seq[i];
                const mode = batch.mode;
                const delay = batch.delay || 0;
                const isSyncTarget = (AppState.gantry.injectorSyncIndex === i);
                
                // 迴ｾ蝨ｨ螳溯｡御ｸｭ縺ｮ繝舌ャ繝√う繝ｳ繝・ャ繧ｯ繧ｹ繧呈峩譁ｰ
                CTSequenceService.setActiveBatchIndex(i);
                CTSequenceService.setCurrentScanMode(mode);

                // --- Delay蜃ｦ逅・(繧ｫ繧ｦ繝ｳ繝医ム繧ｦ繝ｳ) ---
                if (delay > 0) {
                    for(let d = delay; d > 0; d--) {
                        if (AppState.gantry.cancelRequested) break;
                        CTSequenceService.setCountdown(d);
                        await wait(1000);
                    }
                    CTSequenceService.setCountdown(0);
                }

                if (AppState.gantry.cancelRequested) break;

                // 蜷梧悄險ｭ螳壹＆繧後※縺・ｌ縺ｰ縲√せ繧ｭ繝｣繝ｳ髢句ｧ九→蜷梧凾縺ｫ騾蠖ｱ蜑､豕ｨ蜈･
                if (isSyncTarget) {
                    tweenPromise(AppState.injector, { a: 100 }, 4000);
                }

                const isScano = mode === 'scano' || mode === 'dual_scano';
                const isVolume = mode === 'volume' || mode === 'dynamic' || mode === 'real_prep';
                const isHelicalLike = mode === 'helical' || mode === '3d_landmark';

                if (isScano) {
                    // --- 繧ｹ繧ｭ繝｣繝弱げ繝ｩ繝 (蝗櫁ｻ｢蛛懈ｭ｢ ・・騾｣邯夂ｧｻ蜍・ ---
                    new TWEEN.Tween(Meshes.rotor.rotation).to({ z: 0 }, 1000).start();
                    await wait(1000);
                    if (AppState.gantry.cancelRequested) break;
                    
                    await tweenPromise(AppState.couch, { z: 80 }, 1500); 
                    if (AppState.gantry.cancelRequested) break;

                    toggleXRay();
                    await tweenPromise(AppState.couch, { z: 20 }, 4000, TWEEN.Easing.Linear.None);
                    if (AppState.gantry.xrayVisible) toggleXRay();

                } else {
                    // 蝗櫁ｻ｢繧剃ｼｴ縺・せ繧ｭ繝｣繝ｳ
                    if (!AppState.gantry.isScanning) {
                        toggleScan();
                        await wait(2000);
                    }
                    if (AppState.gantry.cancelRequested) break;

                    if (isHelicalLike) {
                        // --- 繝倥Μ繧ｫ繝ｫ / 3D Landmark ---
                        await tweenPromise(AppState.couch, { z: 80 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        toggleXRay();
                        await tweenPromise(AppState.couch, { z: 20 }, 5000, TWEEN.Easing.Linear.None);
                        if (AppState.gantry.xrayVisible) toggleXRay();

                    } else if (isVolume) {
                        // --- 繝懊Μ繝･繝ｼ繝邉ｻ (縺昴・蝣ｴ縺ｧ蛛懈ｭ｢) ---
                        // 菫ｮ豁｣: Z=70% (莠ｺ菴楢・驛ｨ) 縺ｫ遘ｻ蜍輔☆繧・
                        await tweenPromise(AppState.couch, { z: 70 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        toggleXRay();
                        await wait(4000);
                        if (AppState.gantry.xrayVisible) toggleXRay();

                    } else if (mode === 'axial') {
                        // --- 繧｢繧ｭ繧ｷ繝｣繝ｫ (繧ｹ繝・ャ繝・ ---
                        await tweenPromise(AppState.couch, { z: 80 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        const steps = 4;
                        const startZ = 80;
                        const endZ = 20;
                        const stepDist = (startZ - endZ) / steps;

                        for (let step = 0; step < steps; step++) {
                            if (AppState.gantry.cancelRequested) break;
                            toggleXRay();
                            await wait(1000); 
                            if (AppState.gantry.xrayVisible) toggleXRay();

                            if (step < steps - 1 && !AppState.gantry.cancelRequested) {
                                const nextZ = startZ - (stepDist * (step + 1));
                                await tweenPromise(AppState.couch, { z: nextZ }, 800, TWEEN.Easing.Quadratic.InOut);
                                await wait(200);
                            }
                        }
                    }
                }
                
                await wait(1000);
            }

            // --- 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｨ騾蜃ｺ蜃ｦ逅・---
            
            // X邱壹′荳・′荳ON縺ｪ繧画ｶ医☆
            if (AppState.gantry.xrayVisible) {
                toggleXRay();
            }

            CTSequenceService.setActiveBatchIndex(-1);
            CTSequenceService.setCountdown(0);

            // 繝ｭ繝ｼ繧ｿ繝ｼ縺悟屓縺｣縺ｦ縺・ｌ縺ｰ蛛懈ｭ｢
            if (AppState.gantry.isScanning) {
                toggleScan();
                await wait(2000);
            }

            // 蟇晏床騾蜃ｺ
            await tweenPromise(AppState.couch, { z: 0 }, 2000);
            await tweenPromise(AppState.couch, { y: 0 }, 2000);

            // 迥ｶ諷九・蠕ｩ蜈・
            CTSequenceService.setCurrentScanMode(AppState.gantry.scanSequence[0].mode);
            CTSequenceService.setCancelRequested(false);

            isSequenceRunning = false;
            renderBatchUI(); // 繝懊ち繝ｳ縺ｮ陦ｨ遉ｺ繧帝壼ｸｸ縺ｫ謌ｻ縺・
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate(time) {
            requestAnimationFrame(animate);
            TWEEN.update(time);
            const delta = clock.getDelta();

            if (Meshes.rotor && AppState.gantry.rotorSpeed > 0) {
                const radPerSec = (AppState.gantry.rotorSpeed * Math.PI * 2) / 60;
                Meshes.rotor.rotation.z += radPerSec * delta;
                AppState.gantry.angle = Meshes.rotor.rotation.z % (Math.PI * 2);
            }

            if (mixer) {
                mixer.update(delta);
            }

            // 繧ｵ繝ｼ繝舌・縺ｮ繧｢繧ｯ繧ｻ繧ｹ繝ｩ繝ｳ繝励ｒ繝ｩ繝ｳ繝繝縺ｫ轤ｹ貊・＆縺帙ｋ貍泌・
            if (Meshes.serverLeds) {
                Meshes.serverLeds.forEach(mat => {
                    if (Math.random() > 0.85) {
                        mat.opacity = Math.random();
                    }
                });
            }

            controls.update();
            renderer.render(scene, camera);
        }


