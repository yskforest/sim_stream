(function attachMeshFactory(global) {
    var factory = {};

    factory.createLogoTexture = function(text, fontStr, color, width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.font = fontStr;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
        
        var texture = new THREE.CanvasTexture(canvas);
        if (global.renderer && global.renderer.capabilities) {
            texture.anisotropy = global.renderer.capabilities.getMaxAnisotropy();
        }
        return texture;
    };

    factory.createGantryControlPanel = function(x, y, z) {
        var group = new THREE.Group();
        group.position.set(x, y, z);

        var bezel = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.42, 0.015),
            new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.6 })
        );
        bezel.position.z = 0.0075;
        bezel.castShadow = true;
        group.add(bezel);

        var screenMat = new THREE.MeshBasicMaterial({ color: 0x181a1f });
        var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), screenMat);
        screen.position.set(0, 0.07, 0.016);
        group.add(screen);

        var uiMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
        var head = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), uiMat);
        head.position.set(0, 0.11, 0.017);
        group.add(head);
        
        var body = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.10), uiMat);
        body.position.set(0, 0.03, 0.017);
        group.add(body);

        var dpadGroup = new THREE.Group();
        dpadGroup.position.set(0, -0.11, 0.016);
        var btnGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.005, 24);
        btnGeo.rotateX(Math.PI / 2);
        var btnMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

        var positions = [[0, 0.04], [0, -0.04], [-0.04, 0], [0.04, 0], [0, 0]];
        for (var i=0; i<positions.length; i++) {
            var btn = new THREE.Mesh(btnGeo, btnMat);
            btn.position.set(positions[i][0], positions[i][1], 0);
            btn.castShadow = true;
            dpadGroup.add(btn);
        }
        group.add(dpadGroup);

        return group;
    };

    factory.createButton = function(w, h, d, color) {
        var btnGeo = new THREE.BoxGeometry(w, h, d);
        var btnMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
        return new THREE.Mesh(btnGeo, btnMat);
    };

    factory.createCarbonFiberTexture = function() {
        var canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1e2025';
        ctx.fillRect(0, 0, 128, 128);

        var size = 16;
        for (var y = 0; y < 128; y += size) {
            for (var x = 0; x < 128; x += size) {
                var isEven = ((x / size) + (y / size)) % 2 === 0;
                ctx.fillStyle = isEven ? '#2a2e36' : '#14161a';
                ctx.fillRect(x, y, size, size);

                ctx.strokeStyle = isEven ? '#3a404c' : '#0a0b0d';
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (isEven) {
                    ctx.moveTo(x, y); ctx.lineTo(x + size, y + size);
                } else {
                    ctx.moveTo(x + size, y); ctx.lineTo(x, y + size);
                }
                ctx.stroke();
            }
        }

        var texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 40);
        if (global.renderer && global.renderer.capabilities) {
            texture.anisotropy = global.renderer.capabilities.getMaxAnisotropy();
        }
        return texture;
    };

    factory.createFloorTileTexture = function() {
        var canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, 0, 512, 512);

        // Subtle medical epoxy/vinyl micro-granule noise texture (No conflicting grid lines)
        for (var i = 0; i < 4000; i++) {
            var nx = Math.random() * 512;
            var ny = Math.random() * 512;
            var alpha = Math.random() * 0.06;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,' + alpha + ')' : 'rgba(71,85,105,' + alpha + ')';
            ctx.fillRect(nx, ny, 2 + Math.random() * 3, 2 + Math.random() * 3);
        }

        var texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(12, 12);
        if (global.renderer && global.renderer.capabilities) {
            texture.anisotropy = global.renderer.capabilities.getMaxAnisotropy();
        }
        return texture;
    };

    factory.createContactShadowTexture = function() {
        var canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        var ctx = canvas.getContext('2d');

        var grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);

        var texture = new THREE.CanvasTexture(canvas);
        return texture;
    };

    factory.createContactShadowPlane = function(w, h, opacity) {
        var shadowTex = factory.createContactShadowTexture();
        var geo = new THREE.PlaneGeometry(w, h);
        var mat = new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            opacity: typeof opacity === 'number' ? opacity : 0.6,
            depthWrite: false
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.002;
        return mesh;
    };

    factory.createWaterPhantomMesh = function() {
        var group = new THREE.Group();
        group.name = "WaterPhantom";

        // Outer Acrylic Cylinder
        var acrylicMat = new THREE.MeshPhysicalMaterial({
            color: 0xe6f7ff,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            metalness: 0.0,
            transmission: 0.85,
            ior: 1.49,
            thickness: 0.04
        });
        var outerCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 32), acrylicMat);
        outerCyl.rotation.z = Math.PI / 2;
        outerCyl.castShadow = true;
        group.add(outerCyl);

        // Inner Water Core
        var waterMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.2,
            transparent: true,
            opacity: 0.5
        });
        var innerWater = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.33, 32), waterMat);
        innerWater.rotation.z = Math.PI / 2;
        group.add(innerWater);

        // Internal Calibration Pins & Contrast Inserts (Bone / Air / Polyethylene plugs)
        var pinMatBone = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        var pinMatAir = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        var pinMatMetal = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });

        var angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        var mats = [pinMatBone, pinMatAir, pinMatBone, pinMatMetal];
        for (var i = 0; i < 4; i++) {
            var pinGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.30, 16);
            var pin = new THREE.Mesh(pinGeo, mats[i]);
            pin.rotation.z = Math.PI / 2;
            var r = 0.055;
            pin.position.set(0, Math.sin(angles[i]) * r, Math.cos(angles[i]) * r);
            group.add(pin);
        }

        // Metal Mounting Bracket
        var bracketMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
        var bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.26), bracketMat);
        bracket.position.set(-0.16, -0.04, 0);
        bracket.castShadow = true;
        group.add(bracket);

        return group;
    };

    factory.createRoundedBox = function(width, height, depth, radius, material) {
        var shape = new THREE.Shape();
        var x = -width / 2, y = -depth / 2;
        shape.moveTo(x, y + radius);
        shape.lineTo(x, y + depth - radius);
        shape.quadraticCurveTo(x, y + depth, x + radius, y + depth);
        shape.lineTo(x + width - radius, y + depth);
        shape.quadraticCurveTo(x + width, y + depth, x + width, y + depth - radius);
        shape.lineTo(x + width, y + radius);
        shape.quadraticCurveTo(x + width, y, x + width - radius, y);
        shape.lineTo(x + radius, y);
        shape.quadraticCurveTo(x, y, x, y + radius);

        var geo = new THREE.ExtrudeGeometry(shape, {
            depth: height, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.015, bevelThickness: 0.015
        });
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, -height / 2, 0);
        var mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    };

    global.CTMeshFactory = factory;
})(typeof window !== "undefined" ? window : this);
