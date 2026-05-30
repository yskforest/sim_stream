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
