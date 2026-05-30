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

