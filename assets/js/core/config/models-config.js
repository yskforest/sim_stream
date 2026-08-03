var getPatientConfig = function (key, fallback) {
    if (typeof window !== "undefined" && window.CTConfigService && typeof window.CTConfigService.get === "function") {
        return window.CTConfigService.get("patient." + key, fallback);
    }
    return fallback;
};

const CTModelsConfig = {
    models: [
        {
            id: getPatientConfig("defaultModelId", "default_patient"),
            name: getPatientConfig("defaultModelName", "3D Patient (Male Posed 170cm)"),
            path: getPatientConfig("defaultModelPath", "./assets/glb/rp_posed_00178_29.glb"),
            category: "patient",
            attachTo: "couch",
            transform: {
                position: getPatientConfig("defaultPosition", [0, -0.24, 0.45]),
                rotation: getPatientConfig("defaultRotation", [-97, 0, 0]),
                targetHeight: getPatientConfig("targetHeight", 1.7)
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

    getDefaultPatientId() {
        const patientModel = this.models.find(m => m.category === "patient") || this.models[0];
        return patientModel ? patientModel.id : null;
    },

    getDefaultPatientModel() {
        return this.getModel(this.getDefaultPatientId());
    },

    getPatientModels() {
        return this.models.filter(m => m.category === "patient" || !m.category);
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
