const AppState = {
    couch: { y: 0, z: 0 },
    gantry: {
        isScanning: false,
        rotorSpeed: 0,
        angle: 0,
        xrayVisible: false,
        isTranslucent: false,
        detectorRows: 320,
        scanSequence: [
            { mode: "scano", delay: 0 },
            { mode: "helical", delay: 3 },
        ],
        activeBatchIndex: -1,
        currentScanMode: "scano",
        injectorSyncIndex: -1,
        countdown: 0,
        cancelRequested: false,
    },
    injector: { a: 0, b: 0 },
    patientVisible: true,
    patientModelId: (typeof CTModelsConfig !== "undefined" && typeof CTModelsConfig.getDefaultPatientId === "function") ? CTModelsConfig.getDefaultPatientId() : null,
    patientOffset: { x: 0, y: -0.1, z: 0.45, rotX: -90, rotY: 0, rotZ: 0 },
    useGlbPatient: true,
    customGlbModels: [],

    listeners: [],
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter((cb) => cb !== callback);
        };
    },
    update(key, subKey, value) {
        if (this[key] && this[key][subKey] !== undefined) {
            this[key][subKey] = value;
            this.notify();
        }
    },
    notify() {
        this.listeners.forEach((cb) => cb(this));
    },
};

const Descriptions = {
    SCON: "System Control Node\n\nシステム制御ノード。全体制御およびスキャンシークエンスのオーケストレーションを行います。",
    DCON: "Data Control Node\n\nデータ制御ノード。スキャンデータのルーティングと転送を管理します。",
    RTM: "Real Time Monitor\n\nリアルタイムモニター。リアルタイムの再構成画像およびシステムステータスを表示します。",
    IDD: "Image Data Disk\n\n画像データディスク。再構成された画像データセットを保存します。",
    RDD: "Raw Data Disk\n\n生データディスク。収集された投影データおよび生データを保存します。",
    SAC: "Scan Array Controller\n\nスキャンアレイコントローラー。検出器およびガントリの制御タイミングを調整します。",
    FullRack: "Console BOX (Full Rack)\n\nコンソールラック。主要な計算ノードおよびストレージノードを格納しています。",
    Injector: "Contrast Injector\n\n造影剤注入装置。タイマ制御による造影剤の自動注入を行います。",
    Gantry: "CT Gantry\n\nCT架台。X線管球、検出器、および回転アセンブリを搭載しています。",
    Couch: "Patient Couch\n\n患者寝台。上下(Y軸)および前後(Z軸)のポジショニングを行います。",
    TouchPanel: "CT Touch Panel\n\n操作用タッチパネル。架台横での直接操作およびポジショニングに使用します。",
    XrayTube: "X-ray Tube\n\nX線管球。スキャン中に制御されたX線波形を照射します。",
    Detector: "Detector Array\n\n検出器アレイ。透過したX線量をマルチスライスで検出します。",
    ConsoleDisplay: "Console Display\n\nコンソールディスプレイ。スキャン条件の設定および監視を行います。",
    OperationSwitcher: "Operation Switcher\n\n操作切り替えスイッチ。スキャン制御モード等の手動切り替えを行います。",
    helical: "Helical Scan\n\nヘリカルスキャン（螺旋走査）モード。",
    axial: "Axial Scan\n\nアクシャルスキャン（軸位走査）モード。",
    scano: "Scano Mode\n\nスキャノ（位置決め像）モード。",
    dual_scano: "Dual Scano Mode\n\nデュアルスキャノ（正面・側面位置決め像）モード。",
    "3d_landmark": "3D Landmark Mode\n\n3Dランドマーク設定モード。",
    volume: "Volume Scan Mode\n\nボリュームスキャンモード。",
    dynamic: "Dynamic Scan Mode\n\nダイナミックスキャンモード。",
    real_prep: "Real Prep Mode\n\nリアルタイムプレップモード。",
};
const UI = (typeof window !== "undefined" && window.UI) || {};
const Meshes = (typeof window !== "undefined" && window.Meshes) || {};
let scene, camera, renderer, controls, mixer, clock;

if (window.CTStore) {
    window.CTStore.bindState(AppState);
}
if (typeof window !== "undefined") {
    window.AppState = AppState;
    window.UI = UI;
    window.Meshes = Meshes;
}
