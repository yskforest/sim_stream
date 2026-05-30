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
