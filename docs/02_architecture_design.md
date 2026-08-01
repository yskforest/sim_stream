# CT 3D Simulator システム設計・アーキテクチャ仕様書

## 1. 設計原則
- **UIと外部I/Fの同一化**: UI操作および外部APIからの制御は、すべて単一の `Command Bus` 経路を経由して同一のロジックで実行する。
- **ドメインの独立性**: 仮想HWシミュレータ（Domain）と表示部（Presentation: 3D描画 / UIパネル）を完全に分離し、相互参照を排除する。
- **設定と実装の分離**: 検出器列数や回転速度制限などの機種差分は `ProfileService`（設定層）に切り出し、HWロジックと分離する。
- **単一状態管理 (Single Source of Truth)**: 全システム状態を `AppState` に一元管理し、`CTStore` の Pub/Sub 機構により画面・3Dモデルへ変更を伝播する。

---

## 2. アーキテクチャ概要 (コンポーネント図)

システム全体のコンポーネント関係およびレイヤ境界を以下に示します。

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer (表示層)"]
        UIPanels["UI Panels (HTML/CSS)"]
        View3D["Three.js 3D View / WebGL Canvas"]
    end

    subgraph Adapter["Adapter Layer (接続層)"]
        UIAdapter["UIController"]
        ExtGateway["CTExternalGateway"]
        Protocol["CTProtocolV1"]
        StreamGateway["StreamGateway (HTTP/RTSP Adapter)"]
    end

    subgraph Application["Application Layer (応用層)"]
        CommandBus["CTCommandBus"]
        LogService["CTCommandLogService"]
        SeqService["CTSequenceService"]
        VideoStreamService["VideoStreamService"]
    end

    subgraph Domain["Domain & State Layer (ドメイン・状態層)"]
        Gantry["GantrySim"]
        Couch["CouchSim"]
        Injector["InjectorSim"]
        Camera["CameraSim (Virtual Camera)"]
        Store["CTStore"]
        State["AppState"]
        Profile["CTProfileService"]
    end

    %% 接続関係
    UIPanels -->|DOM Events| UIAdapter
    UIAdapter -->|execute command| CommandBus
    ExtGateway -->|validate| Protocol
    ExtGateway -->|execute command| CommandBus
    
    CommandBus -->|Check rules| Profile
    CommandBus -->|Control| Gantry
    CommandBus -->|Control| Couch
    CommandBus -->|Control| Injector
    CommandBus -->|Control stream/params| Camera
    CommandBus -->|Control stream| VideoStreamService
    CommandBus -->|dispatch| Store
    CommandBus -->|add log| LogService

    VideoStreamService -->|Frame capture| View3D
    VideoStreamService -->|Encode & Stream| StreamGateway
    StreamGateway -->|RTSP / HTTP Stream| ExtClient["External Monitor / Player"]

    Store -->|Manages| State
    State -.->|Notify change| UIPanels
    State -.->|Update models/camera| View3D
```

---

## 3. モジュール設計とインターフェース (クラス/モジュール図)

主要なモジュール、公開メソッド、および相互参照関係を定義します。

```mermaid
classDiagram
    class CTExternalGateway {
        +send(command) Object
        +getState() Object
        +subscribe(onStateChange) Function
        +diagnostics Object
    }

    class CTProtocolV1 {
        +validateCommand(command) Object
        +buildSuccess(requestId, payload) Object
        +buildError(requestId, error) Object
    }

    class UIController {
        +setup()
        +teardown()
        +renderBatchQueue()
        +renderMonitor()
        +renderCommandLog()
    }

    class CTCommandBus {
        +execute(command) Object
    }

    class GantrySim {
        +setScanning(boolean) Object
        +setDetectorRows(number) Object
        +setXrayVisible(boolean) Object
        +setRotorSpeed(number) Object
        +setField(key, value) Object
    }



    class CouchSim {
        +moveToY(value) Object
        +moveToZ(value) Object
    }

    class InjectorSim {
        +setContrastA(value) Object
        +setSalineB(value) Object
    }

    class CameraSim {
        +setTransform(position, lookAt)
        +setFov(fov)
        +getState() Object
    }

    class VideoStreamService {
        +start(config) Object
        +stop() Object
        +getStatus() Object
    }

    class StreamGateway {
        +broadcastFrame(frameData)
        +subscribeFrames(listener) Function
    }

    class CTStore {
        +bindState(state)
        +getState() AppState
        +dispatch(command) Object
        +subscribe(listener) Function
    }

    class AppState {
        +gantry Object
        +couch Object
        +injector Object
        +camera Object
        +patientVisible boolean
        +update(scope, key, value)
        +subscribe(listener)
        +notify()
    }

    class CTCommandLogService {
        +add(entry)
        +list() Array
        +clear()
        +subscribe(listener) Function
        +exportJson() String
    }

    class CTSequenceService {
        +setCancelRequested(value) Object
        +setActiveBatchIndex(value) Object
        +setCurrentScanMode(value) Object
        +setCountdown(value) Object
        +resetInitialHardwareState()
        +finalizeState(defaultMode)
    }

    class CTModelsConfig {
        +defaultPatientId String
        +models Array
        +registerModel(modelDef) Boolean
        +getModel(id) Object
        +getAllModels() Array
    }

    class CTModelRegistry {
        +loadGLTF(path) Promise
        +spawnModelInstance(modelId, options) Promise
        +removeInstance(instanceId) Boolean
        +setInstanceVisibility(instanceId, visible)
        +updateInstanceTransform(instanceId, transform)
        +getAllInstances() Array
    }

    CTExternalGateway ..> CTProtocolV1 : uses
    CTExternalGateway ..> CTCommandBus : delegates to
    UIController ..> CTCommandBus : delegates to
    CTCommandBus --> GantrySim : invokes
    CTCommandBus --> CouchSim : invokes
    CTCommandBus --> InjectorSim : invokes
    CTCommandBus --> CameraSim : invokes
    CTCommandBus --> VideoStreamService : invokes
    VideoStreamService --> StreamGateway : delegates
    CTCommandBus --> CTStore : dispatches
    CTCommandBus --> CTCommandLogService : logs
    CTStore --> AppState : manages
    CTSequenceService ..> CTCommandBus : delegates to
    CTModelRegistry ..> CTModelsConfig : reads config
    CameraSim --> VideoStreamService : delegates stream
```

---

## 4. 制御フローとシーケンス

### 4.1 外部APIからのコマンド実行シーケンス

外部コンソール（JavaScript / Console App）から `CTExternalGateway` 経由でコマンドが発行され、状態が更新されるまでの流れです。

```mermaid
sequenceDiagram
    autonumber
    actor ExtApp as 外部コンソール/Client
    participant ExtGateway as CTExternalGateway
    participant Protocol as CTProtocolV1
    participant Bus as CTCommandBus
    participant HW as GantrySim / CouchSim / InjectorSim
    participant Store as CTStore / AppState
    participant Log as CTCommandLogService
    participant UI as UI Panel / 3D View

    ExtApp->>ExtGateway: send(command)
    ExtGateway->>Protocol: validateCommand(command)
    Protocol-->>ExtGateway: { valid: true }
    ExtGateway->>Bus: execute(normalizedCommand)
    
    alt ターゲットがHWシミュレータ
        Bus->>HW: moveToZ(val) / setScanning(bool)
        HW->>Store: state.update(scope, key, val)
        Store->>UI: notify() / Pub-Sub更新
        HW-->>Bus: { success: true, state }
    else ターゲットがストア直接変更
        Bus->>Store: dispatch({ type: "set", ... })
        Store->>UI: notify() / Pub-Sub更新
        Store-->>Bus: { success: true, state }
    end

    Bus->>Log: add({ source: "external", command, result })
    Bus-->>ExtGateway: result
    ExtGateway->>Protocol: buildSuccess(requestId, payload)
    Protocol-->>ExtGateway: Response Envelope
    ExtGateway-->>ExtApp: Response Envelope
```

### 4.2 UI操作からのコマンド実行シーケンス

操作画面（UIパネル）上のボタンクリックやスライダー操作からコマンドが発行される流れです。

```mermaid
sequenceDiagram
    autonumber
    actor User as 操作ユーザー
    participant UIPanel as UI Panel (HTML)
    participant UIController as UIController
    participant Bus as CTCommandBus
    participant HW as CouchSim
    participant Store as CTStore / AppState
    participant UI as UI Update

    User->>UIPanel: 寝台Z軸スライダー操作 (val=65)
    UIPanel->>UIController: DOM Input Event
    UIController->>Bus: execute({ target: "couch", action: "moveZ", params: { value: 65 }, source: "ui" })
    Bus->>HW: moveToZ(65)
    HW->>Store: update("couch", "z", 65)
    Store->>UIController: Subscriber Notification (State Change)
    UIController->>UIPanel: 画面表示更新 (モニタ数値)
    Store->>UI: 3Dモデル位置アニメーション更新
    Bus-->>UIController: { success: true }
```

### 4.3 仮想カメラ映像配信シーケンス (カメラストリーミング)

`target: "camera"`, `action: "startStream"` が実行されてから動画ストリームが送出されるまでのシーケンスです。

```mermaid
sequenceDiagram
    autonumber
    actor Client as 外部プレイヤー / RTSP Client
    participant Gateway as CTExternalGateway
    participant Bus as CTCommandBus
    participant StreamSvc as VideoStreamService
    participant Canvas as Three.js WebGL Canvas
    participant StreamGw as StreamGateway (RTSP/HTTP)

    Client->>Gateway: send({ target: "camera", action: "startStream", params: { codec: "h264", protocol: "rtsp" } })
    Gateway->>Bus: execute(command)
    Bus->>StreamSvc: startStream(config)
    StreamSvc->>StreamGw: initStream(codec, protocol)
    StreamGw-->>StreamSvc: { streamUrl: "rtsp://localhost:8554/live/ct-cam" }
    StreamSvc-->>Bus: { success: true, streamUrl }
    Bus-->>Gateway: Response Envelope (streamUrl)
    Gateway-->>Client: Response Envelope

    loop フレームキャプチャ＆配信ループ (例: 30 FPS)
        StreamSvc->>Canvas: captureFrame() / MediaRecorder Chunk
        Canvas-->>StreamSvc: Raw Frame / Encoded Chunk
        StreamSvc->>StreamGw: publish(chunk)
        StreamGw-->>Client: RTSP / HTTP Stream Data
    end
```

---

## 5. 状態管理と状態遷移 (ステートマシン図)

### 5.1 ガントリ (GantrySim) スキャン動作のステートマシン

ガントリスキャンの内部状態および制御ルールを図示します。

```mermaid
stateDiagram-v2
    [*] --> Idle : 初期化

    state Idle {
        [*] --> Ready
        Ready --> Rotating : setRotorSpeed(speed > 0)
        Rotating --> Ready : setRotorSpeed(0)
    }

    Idle --> Scanning : setScanning(true)
    
    state Scanning {
        [*] --> XrayOff
        XrayOff --> XrayOn : setXrayVisible(true)
        XrayOn --> XrayOff : setXrayVisible(false)
    }

    Scanning --> Idle : setScanning(false)
```

### 5.2 仮想カメラ映像配信のステートマシン

```mermaid
stateDiagram-v2
    [*] --> Stopped : 初期化

    Stopped --> Streaming : startStream({ codec, protocol })
    
    state Streaming {
        [*] --> Capturing
        Capturing --> Encoding : Frame captured
        Encoding --> Transmitting : Chunk encoded
        Transmitting --> Capturing : Loop (FPS)
    }

    Streaming --> Stopped : stopStream()
    Streaming --> Error : Capture/Network failure
    Error --> Stopped : Reset
```

---

## 6. 実装ディレクトリとモジュール構成

ソースコードのディレクトリ構成とモジュールの対応関係です。

```text
assets/js/
  ├── core/                           # ドメイン・アプリケーションコア
  │   ├── main.js                     # アプリケーション基盤エントリーポイント
  │   ├── state.js                    # AppState (状態管理実体)
  │   ├── store.js                    # CTStore (AppStateへのアクセサーラッパー)
  │   ├── hw/                         # 仮想HWドメインシミュレータ
  │   │   ├── gantry-sim.js           # ガントリ制御ロジック
  │   │   ├── couch-sim.js            # 寝台制御ロジック
  │   │   ├── injector-sim.js         # インジェクタ制御ロジック
  │   │   └── camera-sim.js           # 仮想カメラ制御ロジック
  │   ├── commands/
  │   │   └── command-bus.js          # コマンドバス（UI/外部共通の実行経路）
  │   ├── config/
  │   │   └── models-config.js        # 3Dモデル定義・登録管理
  │   ├── services/
  │   │   ├── sequence-service.js     # バッチシーケンス実行制御
  │   │   ├── command-log-service.js  # コマンド実行ログ管理
  │   │   ├── model-registry.js       # GLTFモデルローダ・インスタンス管理
  │   │   └── video-stream-service.js # 映像ストリーミング制御サービス
  │   └── profile/
  │       ├── default-profile.js      # 標準HWプロファイル
  │       └── profile-service.js      # 機種差分プロファイルサービス
  ├── adapters/                       # 外部接続・UIアダプター
  │   ├── ui/
  │   │   └── ui-controller.js        # DOMイベントハンドラ・画面同期
  │   ├── external/
  │   │   ├── protocol-v1.js          # 通信プロトコル検証・レスポンス生成
  │   │   └── external-gateway.js     # 外部公開API Gateway (window.CTExternalGateway)
  │   └── video/                      # 映像配信アダプター
  │       ├── canvas-capturer.js      # Canvasフレームキャプチャ・エンコーダー
  │       └── stream-gateway.js       # RTSP / HTTP ストリーミング転送アダプター
  └── view/models/                    # Presentation (Three.js 3D表現)
      ├── room-model.js               # 検査室・壁・床
      ├── gantry-model.js             # ガントリ3Dモデル
      ├── injector-model.js           # インジェクタ3Dモデル
      ├── control-room-model.js       # 操作室
      └── server-rack-model.js        # サーバーラック
```

---

## 7. UI構成・表示仕様

### 7.1 パネル構成と役割
操作画面は以下の5パネルで構成され、将来実コンソール画面へ接続する際にも各パネル単位で容易に換装できる設計としています。

- **Console (`panel-console`)**: スキャン開始/停止、バッチ編集、シーケンス実行
- **HW STATE MONITOR (`panel-monitor`)**: ガントリ・寝台・インジェクタ・直近結果表示
- **HW設定 (`panel-hw-config`)**: Detector Rows、Couch Y/Z、Injector A/B 設定
- **3D表示・操作 (`panel-3d-config`)**: フォーカス、カメラ、透過、X線、患者表示、カメラ配信設定
- **Command Log (`panel-command-log`)**: コマンド実行履歴表示

---

## 8. 仮想カメラ映像配信アーキテクチャ詳細

### 8.1 配信方式とプロトコル構成

| 方式 | コーデック | 通信プロトコル | 技術スタック・伝送方式 |
| :--- | :--- | :--- | :--- |
| **MJPEG Stream** | MJPEG (JPEG連番) | HTTP (`multipart/x-mixed-replace`) | HTMLCanvasElement `.toDataURL('image/jpeg')` または Blob 転送 |
| **H.264 Stream (RTSP)** | H.264 / AVC | RTSP (または WebSocket-RTSP ゲートウェイ) | `MediaRecorder` API (`video/mp4;codecs=avc1` / `video/webm`) ＋ RTSP リレー |
| **H.264 Stream (HTTP)** | H.264 | HTTP (HLS / Low-Latency HLS) | MediaSource Extensions (MSE) / HLS.js 互換セグメント生成 |

---

## 9. 検証方針
- **構文チェック**: `node --check`
- **外部I/Fプロトコル検証**: `node scripts/verify-external-interface.js`
- **映像配信検証**:
  - MJPEG over HTTP ストリームのブラウザ再生確認
  - RTSP ストリーム (VLC メディアプレイヤー / ffmpeg での受信確認)
