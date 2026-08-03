const CTModelRegistry = {
    cache: new Map(),
    loadedInstances: new Map(), // instanceId -> { sceneObject, modelId, attachTo, transform }
    instanceCounter: 0,
    loader: null,

    getLoader() {
        if (!this.loader && typeof THREE !== "undefined" && THREE.GLTFLoader) {
            this.loader = new THREE.GLTFLoader();
        }
        return this.loader;
    },

    async loadGLTF(path) {
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }
        const loader = this.getLoader();
        if (!loader) {
            throw new Error("GLTFLoader is not available.");
        }

        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => {
                    this.cache.set(path, gltf);
                    resolve(gltf);
                },
                undefined,
                (err) => {
                    console.error("Failed to load GLTF model:", path, err);
                    reject(err);
                }
            );
        });
    },

    textureLoader: null,

    getTextureLoader() {
        if (!this.textureLoader && typeof THREE !== "undefined") {
            this.textureLoader = new THREE.TextureLoader();
        }
        return this.textureLoader;
    },

    async loadImageTexture(path) {
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }
        const loader = this.getTextureLoader();
        if (!loader) {
            throw new Error("TextureLoader is not available.");
        }

        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (texture) => {
                    this.cache.set(path, texture);
                    resolve(texture);
                },
                undefined,
                (err) => {
                    console.error("Failed to load image texture:", path, err);
                    reject(err);
                }
            );
        });
    },

    async spawnModelInstance(modelId, customOptions = {}) {
        const config = window.CTModelsConfig ? window.CTModelsConfig.getModel(modelId) : null;
        const modelDef = config || {
            id: modelId,
            name: modelId,
            path: customOptions.path || `./assets/glb/${modelId}.glb`,
            type: customOptions.type || "glb",
            category: "patient",
            attachTo: "couch",
            transform: { position: [0, 0, 0.1], rotation: [-90, 0, 180], scale: [1.0, 1.0, 1.0], targetHeight: 1.7 }
        };

        const path = customOptions.path || modelDef.path;
        const modelType = customOptions.type || modelDef.type || (path.match(/\.(png|jpg|jpeg|webp|bmp)$/i) ? "image" : "glb");

        let sceneObj;

        if (modelType === "image") {
            const texture = await this.loadImageTexture(path);
            const aspect = (texture.image && texture.image.width && texture.image.height)
                ? texture.image.width / texture.image.height
                : 1.0;
            const planeGeo = new THREE.PlaneGeometry(aspect, 1.0);
            const planeMat = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                roughness: 0.4
            });
            sceneObj = new THREE.Mesh(planeGeo, planeMat);
            sceneObj.castShadow = true;
            sceneObj.receiveShadow = true;
        } else {
            const gltf = await this.loadGLTF(path);
            sceneObj = gltf.scene.clone(true);
        }

        // 1. 回転（姿勢）の設定を適用 (Rot X, Y, Z)
        const rotationDeg = customOptions.rotation || modelDef.transform?.rotation || [-90, 0, 0];
        sceneObj.rotation.set(
            THREE.MathUtils.degToRad(rotationDeg[0] || 0),
            THREE.MathUtils.degToRad(rotationDeg[1] || 0),
            THREE.MathUtils.degToRad(rotationDeg[2] || 0)
        );

        // 2. 拡大・縮小の設定を適用 (Scale X, Y, Z)
        let scale = customOptions.scale || modelDef.transform?.scale;
        
        // GLB 3Dモデルの場合、モデル本来のサイズを考慮して身長170cm (1.7m) に自動アジャスト
        if (modelType === "glb") {
            const bboxRotated = new THREE.Box3().setFromObject(sceneObj);
            const sizeRotated = new THREE.Vector3();
            bboxRotated.getSize(sizeRotated);
            const maxRotatedDim = Math.max(sizeRotated.x, sizeRotated.y, sizeRotated.z);
            const targetHeight = customOptions.targetHeight || modelDef.transform?.targetHeight || 1.7;
            let autoScale = 1.0;
            if (maxRotatedDim > 0.001) {
                autoScale = targetHeight / maxRotatedDim;
            }
            if (!scale || (scale[0] === 1.0 && scale[1] === 1.0 && scale[2] === 1.0)) {
                scale = [autoScale, autoScale, autoScale];
            } else {
                scale = [scale[0] * autoScale, scale[1] * autoScale, scale[2] * autoScale];
            }
        } else if (!scale) {
            scale = [1.0, 1.0, 1.0];
        }
        sceneObj.scale.set(scale[0], scale[1], scale[2]);

        // 3. 位置 (Pos X, Y, Z) の設定 & 床面 (Y=0.0m) への最下面密着自動整列
        const defaultPos = customOptions.position || modelDef.transform?.position || [0, 0, 0.45];
        let finalPos = [...defaultPos];

        if (modelType === "glb") {
            const bboxFinal = new THREE.Box3().setFromObject(sceneObj);
            const minY = bboxFinal.min.y;
            const surfaceTargetY = (modelDef.attachTo === "couch" || modelDef.category === "patient") ? 0.06 : 0.0;
            finalPos[1] = defaultPos[1] + (surfaceTargetY - minY);
        }

        sceneObj.position.set(finalPos[0], finalPos[1], finalPos[2]);

        sceneObj.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        const instanceId = customOptions.instanceId || `${modelId}_${++this.instanceCounter}`;
        const attachTo = customOptions.attachTo || modelDef.attachTo || "couch";

        const instanceData = {
            instanceId,
            modelId,
            type: modelType,
            sceneObject: sceneObj,
            attachTo,
            transform: {
                position: finalPos,
                rotation: rotationDeg,
                scale: scale
            },
            visible: customOptions.visible !== false
        };

        sceneObj.visible = instanceData.visible;
        this.loadedInstances.set(instanceId, instanceData);

        // 3Dシーングラフへの追加 (寝台グループまたは世界空間window.scene)
        const meshesObj = (typeof window !== "undefined" && window.Meshes) || (typeof Meshes !== "undefined" ? Meshes : null);
        const couchParent = (meshesObj && (meshesObj.patientGroup || meshesObj.tabletopGroup)) || null;

        if (attachTo === "couch" && couchParent) {
            couchParent.add(sceneObj);
        } else if (typeof window.scene !== "undefined") {
            window.scene.add(sceneObj);
        }

        return instanceData;
    },

    removeInstance(instanceId) {
        const instance = this.loadedInstances.get(instanceId);
        if (!instance) return false;

        if (instance.sceneObject && instance.sceneObject.parent) {
            instance.sceneObject.parent.remove(instance.sceneObject);
        }
        this.loadedInstances.delete(instanceId);
        return true;
    },

    setInstanceVisibility(instanceId, visible) {
        const instance = this.loadedInstances.get(instanceId);
        if (instance && instance.sceneObject) {
            instance.visible = visible;
            instance.sceneObject.visible = visible;
        }
    },

    updateInstanceTransform(instanceId, transform) {
        const instance = this.loadedInstances.get(instanceId);
        if (!instance || !instance.sceneObject) return;

        if (transform.position) {
            instance.sceneObject.position.set(...transform.position);
            instance.transform.position = transform.position;
        }
        if (transform.rotation) {
            instance.sceneObject.rotation.set(
                THREE.MathUtils.degToRad(transform.rotation[0] || 0),
                THREE.MathUtils.degToRad(transform.rotation[1] || 0),
                THREE.MathUtils.degToRad(transform.rotation[2] || 0)
            );
            instance.transform.rotation = transform.rotation;
        }
        if (transform.scale) {
            instance.sceneObject.scale.set(...transform.scale);
            instance.transform.scale = transform.scale;
        }
    },

    getAllInstances() {
        return Array.from(this.loadedInstances.values());
    }
};

if (typeof window !== "undefined") {
    window.CTModelRegistry = CTModelRegistry;
}
