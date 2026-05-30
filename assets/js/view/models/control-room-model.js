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

