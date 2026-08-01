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

    global.CTMeshFactory = factory;
})(typeof window !== "undefined" ? window : this);
