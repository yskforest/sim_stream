const CTModelsConfig = {
    defaultPatientId: "rp_posed_00178_29",
    models: [
        {
            id: "rp_posed_00178_29",
            name: "3D Patient (Male Posed 170cm)",
            path: "./assets/glb/rp_posed_00178_29.glb",
            category: "patient",
            attachTo: "couch",
            transform: {
                position: [0, 0, 0.45], // 天板上の最適中央位置
                rotation: [-90, 0, 0],   // ユーザー参照画像と100%一致する仰臥位（胸上・背中着地・頭奥・足手前）
                targetHeight: 1.7       // 身長 170cm (1.7m)
            }
        }
    ],

    registerModel(modelDef) {
        if (!modelDef.id || !modelDef.path) {
            console.error("Invalid model definition", modelDef);
            return false;
        }
        const existingIndex = this.models.findIndex(m => m.id === modelDef.id);
        if (existingIndex >= 0) {
            this.models[existingIndex] = { ...this.models[existingIndex], ...modelDef };
        } else {
            this.models.push({
                name: modelDef.id,
                category: "prop",
                attachTo: "couch",
                transform: { position: [0, 0, 0.45], rotation: [-90, 0, 0], targetHeight: 1.7 },
                ...modelDef
            });
        }
        return true;
    },

    getModel(id) {
        return this.models.find(m => m.id === id);
    },

    getAllModels() {
        return [...this.models];
    }
};

if (typeof window !== "undefined") {
    window.CTModelsConfig = CTModelsConfig;
}
