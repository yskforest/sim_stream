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
        Meshes.patientGroup.add(obj);
        Meshes.patientGroup.visible = AppState.patientVisible;

        // スポーン直後の実際の初期トランスフォーム（Y位置補正等を含む）を AppState および UI にロード
        if (instance && instance.transform && window.AppState) {
            var pos = instance.transform.position || [0, -0.1, 0.45];
            var rot = instance.transform.rotation || [-90, 0, 0];
            window.AppState.patientOffset = {
                x: pos[0],
                y: pos[1],
                z: pos[2],
                rotX: rot[0],
                rotY: rot[1],
                rotZ: rot[2]
            };
            syncAllPatientTransformUI();
        }
    }
}

function updatePatientGlbSelectOptions() {
    if (typeof document === "undefined") return;
    var selectEl = document.getElementById("select-patient-glb");
    if (!selectEl) return;

    var models = (window.CTModelsConfig && typeof window.CTModelsConfig.getAllModels === "function")
        ? window.CTModelsConfig.getAllModels()
        : [];

    selectEl.innerHTML = "";
    models.forEach(function (m) {
        var opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name || (m.id + " (" + (m.path || "").split("/").pop() + ")");
        if (window.AppState && window.AppState.patientModelId === m.id) {
            opt.selected = true;
        }
        selectEl.appendChild(opt);
    });
}

async function spawnCustomGlbFromInput() {
    var inputEl = document.getElementById("input-add-glb-path");
    if (!inputEl || !inputEl.value.trim()) return;
    var path = inputEl.value.trim();
    var modelId = path.split("/").pop().replace(".glb", "") || "custom_glb";

    if (window.CTModelsConfig) {
        window.CTModelsConfig.registerModel({
            id: modelId,
            name: "Custom GLB: " + modelId,
            path: path,
            category: "patient",
            attachTo: "couch"
        });
        updatePatientGlbSelectOptions();
    }

    try {
        await CTModelRegistry.spawnModelInstance(modelId, { path: path, attachTo: "couch" });
        alert("Successfully spawned model: " + modelId);
        inputEl.value = "";
    } catch (err) {
        alert("Failed to load GLB from path: " + path);
    }
}

function _updatePatientTransform(key, valStr) {
    if (!window.AppState) return;
    if (!window.AppState.patientOffset) {
        window.AppState.patientOffset = { x: 0, y: -0.1, z: 0.45, rotX: -90, rotY: 0, rotZ: 0 };
    }
    if (!key) return syncAllPatientTransformUI();
    
    var val = parseFloat(valStr);
    if (isNaN(val)) return;
    
    window.AppState.patientOffset[key] = val;
    syncAllPatientTransformUI();
    
    var po = window.AppState.patientOffset;
    if (window.CTModelRegistry) {
        window.CTModelRegistry.updateInstanceTransform("patient_primary", {
            position: [po.x, po.y, po.z],
            rotation: [po.rotX, po.rotY, po.rotZ]
        });
    }
}

function onPatientPosSliderChange(key) {
    var el = document.getElementById("slider-patient-pos-" + key);
    if (el) _updatePatientTransform(key, el.value);
}

function onPatientPosInputChange(key) {
    var el = document.getElementById("input-patient-pos-" + key);
    if (el) _updatePatientTransform(key, el.value);
}

function syncAllPatientTransformUI() {
    if (!window.AppState || !window.AppState.patientOffset) return;
    var po = window.AppState.patientOffset;
    var keys = ["x", "y", "z", "rotX", "rotY", "rotZ"];
    keys.forEach(function (k) {
        var input = document.getElementById("input-patient-pos-" + k);
        var slider = document.getElementById("slider-patient-pos-" + k);
        var val = po[k];
        if (input) input.value = k.startsWith("rot") ? val.toFixed(0) : val.toFixed(2);
        if (slider) slider.value = String(val);
    });
}

function resetPatientPositionUI() {
    if (!window.AppState) return;
    window.AppState.patientOffset = { x: 0, y: -0.1, z: 0.45, rotX: -90, rotY: 0, rotZ: 0 };
    syncAllPatientTransformUI();

    var po = window.AppState.patientOffset;
    if (window.CTModelRegistry) {
        window.CTModelRegistry.updateInstanceTransform("patient_primary", {
            position: [po.x, po.y, po.z],
            rotation: [po.rotX, po.rotY, po.rotZ]
        });
    }
}

if (typeof window !== "undefined") {
    window.syncAllPatientTransformUI = syncAllPatientTransformUI;
    window.updatePatientGlbSelectOptions = updatePatientGlbSelectOptions;

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", updatePatientGlbSelectOptions);
        } else {
            updatePatientGlbSelectOptions();
        }
    }
}
