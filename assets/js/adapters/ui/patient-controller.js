// 患者モデル制御
function togglePatient() {
    CTCommandBus.execute({
        source: "ui-console",
        target: "simulator",
        action: "setPatientVisible",
        params: { value: !AppState.patientVisible },
    });
}

async function changePatientGlbModel(modelId) {
    AppState.patientModelId = modelId;
    if (window.CTModelRegistry && window.Meshes && window.Meshes.patientGroup) {
        // 既存のプライマリ患者オブジェクトをクリア
        while (Meshes.patientGroup.children.length > 0) {
            Meshes.patientGroup.remove(Meshes.patientGroup.children[0]);
        }
        var instance = await CTModelRegistry.spawnModelInstance(modelId, {
            instanceId: "patient_primary",
            attachTo: "couch",
            visible: AppState.patientVisible
        });
        var obj = instance.sceneObject;
        obj.position.set(0, 0.05, 0.2);
        Meshes.patientGroup.add(obj);
        Meshes.patientGroup.visible = AppState.patientVisible;
    }
}

async function spawnCustomGlbFromInput() {
    var inputEl = document.getElementById("input-add-glb-path");
    if (!inputEl || !inputEl.value.trim()) return;
    var path = inputEl.value.trim();
    var modelId = path.split("/").pop().replace(".glb", "") || "custom_glb";

    if (window.CTModelsConfig) {
        window.CTModelsConfig.registerModel({ id: modelId, path: path, category: "prop", attachTo: "couch" });
    }

    try {
        await CTModelRegistry.spawnModelInstance(modelId, { path: path, attachTo: "couch" });
        alert("Successfully spawned model: " + modelId);
        inputEl.value = "";
    } catch (err) {
        alert("Failed to load GLB from path: " + path);
    }
}
