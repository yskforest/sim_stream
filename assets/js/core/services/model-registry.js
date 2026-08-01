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

    async spawnModelInstance(modelId, customOptions = {}) {
        const config = window.CTModelsConfig ? window.CTModelsConfig.getModel(modelId) : null;
        const modelDef = config || {
            id: modelId,
            name: modelId,
            path: `./assets/glb/${modelId}.glb`,
            category: "patient",
            attachTo: "couch",
            transform: { position: [0, 0, 0.1], rotation: [-90, 0, 180], targetHeight: 1.7 }
        };

        const path = customOptions.path || modelDef.path;
        const gltf = await this.loadGLTF(path);
        const clonedScene = gltf.scene.clone(true);

        // 1. 回転（姿勢）の設定を適用
        const rotationDeg = customOptions.rotation || modelDef.transform?.rotation || [-90, 0, 0];
        clonedScene.rotation.set(
            THREE.MathUtils.degToRad(rotationDeg[0] || 0),
            THREE.MathUtils.degToRad(rotationDeg[1] || 0),
            THREE.MathUtils.degToRad(rotationDeg[2] || 0)
        );

        // 2. 回転適用後のバウンディングボックスから「身長 170cm (1.7m)」を精密アジャスト
        const bboxRotated = new THREE.Box3().setFromObject(clonedScene);
        const sizeRotated = new THREE.Vector3();
        bboxRotated.getSize(sizeRotated);
        // 主長（頭〜足）の寸法
        const maxRotatedDim = Math.max(sizeRotated.x, sizeRotated.y, sizeRotated.z);

        const targetHeight = customOptions.targetHeight || modelDef.transform?.targetHeight || 1.7;
        let autoScaleFactor = 1.0;
        if (maxRotatedDim > 0.001) {
            autoScaleFactor = targetHeight / maxRotatedDim;
        }

        const scale = customOptions.scale || [autoScaleFactor, autoScaleFactor, autoScaleFactor];
        clonedScene.scale.set(...scale);

        // 3. スケール適用後の最下面 (minY) を計算し、寝台表面 (Y=0.06m) に最下部（背中）を隙間なく密着整列
        const bboxFinal = new THREE.Box3().setFromObject(clonedScene);
        const minY = bboxFinal.min.y;

        const defaultPos = customOptions.position || modelDef.transform?.position || [0, 0, 0.95];
        const surfaceTargetY = 0.06;
        const adjustedY = defaultPos[1] + (surfaceTargetY - minY);

        clonedScene.position.set(defaultPos[0], adjustedY, defaultPos[2]);

        clonedScene.traverse((child) => {
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
            sceneObject: clonedScene,
            attachTo,
            transform: {
                position: [defaultPos[0], adjustedY, defaultPos[2]],
                rotation: rotationDeg,
                scale: scale
            },
            visible: customOptions.visible !== false
        };

        clonedScene.visible = instanceData.visible;
        this.loadedInstances.set(instanceId, instanceData);

        // 3Dシーングラフへの追加 (寝台グループまたはScene)
        if (typeof window.scene !== "undefined") {
            if (attachTo === "couch" && window.Meshes && window.Meshes.tabletopGroup) {
                window.Meshes.tabletopGroup.add(clonedScene);
            } else if (attachTo === "couch" && window.Meshes && window.Meshes.patientGroup) {
                window.Meshes.patientGroup.add(clonedScene);
            } else {
                window.scene.add(clonedScene);
            }
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
