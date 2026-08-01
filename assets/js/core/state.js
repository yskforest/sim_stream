const AppState = {
    couch: { y: 0, z: 0 },
    gantry: {
        isScanning: false,
        rotorSpeed: 0,
        angle: 0,
        xrayVisible: false,
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
    patientModelId: "rp_posed_00178_29",
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
    SCON: "System Control Node. Central control and scan orchestration.",
    DCON: "Data Control Node. Manages scan data routing and transfer.",
    RTM: "Real Time Monitor. Displays real-time reconstruction and status.",
    IDD: "Image Data Disk. Stores reconstructed image datasets.",
    RDD: "Raw Data Disk. Stores projection/raw acquisition data.",
    SAC: "Scan Array Controller. Coordinates detector/gantry timing.",
    FullRack: "Console rack containing major compute and storage nodes.",
    Injector: "Contrast injector used for timed injection control.",
    Gantry: "CT gantry containing tube, detector, and rotating assembly.",
    Couch: "Patient table used for vertical and longitudinal positioning.",
    TouchPanel: "Local touch panel for operator-side controls.",
    XrayTube: "X-ray tube that emits radiation during scan.",
    Detector: "Detector array that receives transmitted X-rays.",
    ConsoleDisplay: "Console display for scan configuration and monitoring.",
    OperationSwitcher: "Operation switch controls key scan operations.",
    helical: "Helical scan mode.",
    axial: "Axial scan mode.",
    scano: "Scano (topogram) mode.",
    dual_scano: "Dual scano mode.",
    "3d_landmark": "3D landmark mode.",
    volume: "Volume scan mode.",
    dynamic: "Dynamic scan mode.",
    real_prep: "Real prep mode.",
};
const UI = {};
const Meshes = {};
let scene, camera, renderer, controls, mixer, clock;

if (window.CTStore) {
    window.CTStore.bindState(AppState);
}
if (typeof window !== "undefined") {
    window.AppState = AppState;
}
