# CT 3D Simulator

Webブラウザ上で動作するCT装置（ガントリ・寝台・インジェクタ）の3Dリアルタイムシミュレータです。  
UI操作と外部APIからの遠隔操作を同一の制御基盤（Command Bus）で共通処理します。

---

## 1. 概要
- **目的**: CT装置操作の試験・検証用仮想ハードウェア（HW）の提供
- **特徴**: 
  - Three.jsによる3D空間表示とリアルタイム制御
  - **OpenCV 魚眼レンズカメラ歪曲シミュレーション**（Kannala-Brandt モデル $k_1..k_4$ 歪曲・焦点・光学中心・ガンマ補正）
  - **3Dモデルレジストリ＆9-DOFトランスフォーム制御**（動的GLB/画像モデル読み込み・位置/回転/拡大縮小管理）
  - コンソールUIと外部API (`window.CTExternalGateway`) の同一制御経路化
  - UIや実機接続の変更に柔軟に対応できるアダプター設計

---

## 2. 使い方

### 2.1 セットアップ（外部ライブラリの取得）
初回起動時、または外部ライブラリを更新・再取得する場合は、Git Bash (Windows) または Linux / macOS ターミナルで `setup.sh` を実行します。
Three.js 本体・必須アドオン (OrbitControls, GLTFLoader)、Tailwind CSS 等を `assets/vendor/` へ自動ダウンロードします。
```bash
bash setup.sh
```

### 2.2 起動方法
HTTPサーバー（`npx serve` や Live Server など）を立ち上げ、ブラウザで `index.html` にアクセスします。
```bash
npx serve .
```

### 2.3 動作検証コマンド
外部I/Fプロトコルおよび動作を自動検証します。
```bash
node scripts/verify-external-interface.js
```

### 2.4 リアルタイム動画配信サーバーの起動 (HTTP MJPEG / RTSP)
`http://127.0.0.1:8080/live/ct-camera.mjpg` で外部ブラウザやVLCプレイヤーから閲覧する場合は、ストリーミングサーバーを起動します。
```bash
node scripts/stream-server.js
```

### 2.5 外部APIでの操作例
ブラウザのコンソールや外部アプリケーションから直接操作が可能です。
```javascript
// スキャン開始
window.CTExternalGateway.send({ target: 'gantry', action: 'setScanning', params: { value: true } });

// 寝台Z軸移動 (65mm)
window.CTExternalGateway.send({ target: 'couch', action: 'moveZ', params: { value: 65 } });

// カメラ魚眼歪曲パラメータ設定 (OpenCV Fisheye)
window.CTExternalGateway.send({
  target: 'camera',
  action: 'setDistortion',
  params: { enabled: true, k1: 0.20, k2: 0.05, fx: 1.0, fy: 1.0, cx: 0.5, cy: 0.5, zoom: 1.0 }
});

// 患者モデル切り替えおよびトランスフォーム設定
window.CTExternalGateway.send({
  target: 'simulator',
  action: 'setPatientPosition',
  params: { x: 0, y: -0.1, z: 0.45, rotX: -90, rotY: 0, rotZ: 0 }
});

// 状態変更のリアルタイム購読
window.CTExternalGateway.subscribe((event) => console.log('状態更新:', event.payload));
```

---

## 3. 設計（アーキテクチャ）

UIと外部通信アダプターが同一の `CTCommandBus` を介してHWシミュレータを制御し、`AppState` の変更がUIと3D表示へ自動伝播します。

```mermaid
flowchart LR
    UI["UI Panels"] --> BUS["CTCommandBus"]
    EXT["CTExternalGateway"] --> BUS
    BUS --> HW["HW Simulators\n(Gantry / Couch / Injector / Camera)"]
    HW --> ST["AppState / CTStore"]
    ST -.-> UI
    ST -.-> View["3D View (Three.js)\n+ Distortion ShaderPass"]
```

---

## 4. 関連ドキュメント (`docs/`)

詳細な仕様および設計は以下のドキュメントを参照してください。

| ドキュメント | 内容 |
| :--- | :--- |
| 📄 **[01_requirements.md](docs/01_requirements.md)** | 要求仕様書（機能要件、カメラ歪曲仕様、非機能要件、受け入れ基準） |
| 📄 **[02_architecture_design.md](docs/02_architecture_design.md)** | システム設計書（アーキテクチャ、カメラ歪曲シェーダー、モデルレジストリ、UIパネル設計、UML図） |
| 📄 **[03_external_api_spec.md](docs/03_external_api_spec.md)** | 外部API仕様書（通信プロトコル、電文構造、カメラ歪曲・モデル操作API、エラー一覧） |
