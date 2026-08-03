# CT 3D Simulator システム設計・アーキテクチャ仕様書

## 1. 設計原則
- **UIと外部I/Fの同一化**: UI操作および外部APIからの制御は、すべて単一の `Command Bus` 経路を経由して同一のロジックで実行する。
- **ドメインの独立性**: 仮想HWシミュレータ（Domain）と表示部（Presentation: 3D描画 / UIパネル）を完全に分離し、相互参照を排除する。
- **設定と実装の分離**: 検出器列数や回転速度制限などの機種差分は `ProfileService`（設定層）および `CTModelsConfig` / `CTModelRegistry`（モデル管理層）に切り出し、HWロジックと分離する。
- **単一状態管理 (Single Source of Truth)**: 全システム状態を `AppState` に一元管理し、`CTStore` の Pub/Sub 機構により画面・3Dモデルへ変更を伝播する。

---

## 2. アーキテクチャ概要 (コンポーネント図)

システム全体のコンポーネント関係およびレイヤ境界を以下に示します。

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer (表示層)"]
        UIPanels["UI Panels (HTML/CSS)"]
        View3D["Three.js 3D View / WebGL Canvas"]
        DistortionPass["OpenCV Fisheye Distortion Pass\n(GLSL ShaderMaterial + Gamma 2.2)"]
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
        ModelRegistry["CTModelRegistryService"]
    end

    subgraph Domain["Domain & State Layer (ドメイン・状態層)"]
        Gantry["GantrySim"]
        Couch["CouchSim"]
        Injector["InjectorSim"]
        Camera["CameraSim (Virtual Camera)"]
        Store["CTStore"]
        State["AppState (distortion, patientOffset, etc.)"]
        Profile["CTProfileService"]
        ModelsConfig["CTModelsConfig"]
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
    CommandBus -->|Manage models| ModelRegistry
    CommandBus -->|dispatch| Store
    CommandBus -->|add log| LogService

    View3D -->|Render Scene to RenderTarget| DistortionPass
    DistortionPass -->|Render Distorted Frame| View3D
    VideoStreamService -->|Frame capture| View3D
    VideoStreamService -->|Encode & Stream| StreamGateway
    StreamGateway -->|RTSP / HTTP Stream| ExtClient["External Monitor / Player"]

    Store -->|Manages| State
    State -.->|Notify change| UIPanels
    State -.->|Update models/camera/distortion| View3D
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
        +onDistortionParamInput()
        +onDistortionPresetChange(presetKey)
        +resetDistortionParamsUI()
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
        +startStream(params) Object
        +stopStream() Object
        +getStreamUrl() Object
        +setDistortion(params) Object
        +getState() Object
    }

    class CTModelRegistryService {
        +init(modelsConfig)
        +spawnModelInstance(id, options)
        +updateInstanceTransform(id, transform)
        +removeInstance(id)
    }

    CTExternalGateway ..> CTCommandBus : execute
    UIController ..> CTCommandBus : execute
    CTCommandBus ..> GantrySim : invoke
    CTCommandBus ..> CouchSim : invoke
    CTCommandBus ..> InjectorSim : invoke
    CTCommandBus ..> CameraSim : invoke
    CTCommandBus ..> CTModelRegistryService : invoke
```

---

## 4. コントロールフローとシーケンス図

### 4.1 UI操作シーケンス (コンソール/操作画面)

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

### 4.2 外部API操作シーケンス (遠隔制御)

```mermaid
sequenceDiagram
    autonumber
    actor Client as 外部コンソール / Client
    participant Gateway as CTExternalGateway
    participant Protocol as CTProtocolV1
    participant Bus as CTCommandBus
    participant HW as GantrySim
    participant Store as CTStore / AppState

    Client->>Gateway: send({ requestId: "req-101", target: "gantry", action: "setScanning", params: { value: true } })
    Gateway->>Protocol: validateCommand(command)
    Protocol-->>Gateway: { valid: true }
    Gateway->>Bus: execute(command)
    Bus->>HW: setScanning(true)
    HW->>Store: update("gantry", "isScanning", true)
    Bus-->>Gateway: { success: true, state }
    Gateway->>Protocol: buildSuccess(requestId, payload)
    Protocol-->>Gateway: Response Envelope
    Gateway-->>Client: Response Envelope
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

## 5. カメラ歪曲シェーダーパイプライン設計

### 5.1 数学モデル（OpenCV Fisheye / Kannala-Brandt モデル）
標準のピンホールカメラ像 $(x, y)$ と魚眼歪曲像 $(x_d, y_d)$ の関係：
$$\theta = \arctan(r), \quad r = \sqrt{x^2 + y^2}$$
$$\theta_d = \theta (1 + k_1 \theta^2 + k_2 \theta^4 + k_3 \theta^6 + k_4 \theta^8)$$

ポストプロセス GLSL フラグメントシェーダーでは、画面の歪曲画素 $(u, v)$ から逆算するため、ニュートン・ラフソン法（Newton-Raphson method, 6回反復）で $\theta$ を解きます：
$$f(\theta) = \theta (1 + k_1 \theta^2 + k_2 \theta^4 + k_3 \theta^6 + k_4 \theta^8) - \theta_d = 0$$

解いた $\theta$ から理想的なピンホール半径 $r = \tan(\theta)$ を求め、元画像テクスチャ座標 $uv_{\text{src}}$ を参照します。

### 5.2 ガンマ補正 (sRGB Gamma 2.2 Transfer)
Three.js の `WebGLRenderTarget` 内のフレームバッファは線形色空間（Linear Color Space）で記録されているため、シェーダー出力時にガンマ補正を適用します：
```glsl
vec4 texColor = texture2D(tDiffuse, uv_src);
gl_FragColor = vec4(pow(texColor.rgb, vec3(1.0 / 2.2)), texColor.a);
```
これにより、魚眼レンズ歪曲適用時も通常描画と同等の正しく明るい発色を実現します。

---

## 6. 状態管理と状態遷移 (ステートマシン図 & AppState)

### 6.1 ガントリ (GantrySim) スキャン動作のステートマシン

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

### 6.2 仮想カメラ映像配信のステートマシン

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

### 6.3 状態管理 (`AppState` スキーマ)

全コンポーネントが参照・更新する単一状態オブジェクト `AppState` の構造定義：

| プロパティパス | 型 | 初期値 | 説明 |
| :--- | :--- | :--- | :--- |
| `gantry.isScanning` | `boolean` | `false` | スキャン中フラグ |
| `gantry.rotorSpeed` | `number` | `0` | 架台回転速度 (rpm) |
| `gantry.detectorRows` | `number` | `320` | マルチスライス検出器列数 |
| `gantry.xrayVisible` | `boolean` | `false` | X線ビーム表示フラグ |
| `couch.y` | `number` | `0` | 寝台上下位置 (%) |
| `couch.z` | `number` | `0` | 寝台前後位置 (%) |
| `injector.a` | `number` | `0` | 造影剤残量 (%) |
| `injector.b` | `number` | `0` | 生理食塩水残量 (%) |
| `patientVisible` | `boolean` | `true` | 患者モデル表示フラグ |
| `patientModelId` | `string` | `"patient_dennis"` | アクティブな患者GLBモデルID |
| `patientOffset` | `object` | `{ x:0, y:-0.1, z:0.45, rotX:-90, rotY:0, rotZ:0 }` | 患者モデルの9-DOFトランスフォーム |
| `distortion` | `object` | `{ enabled:false, k1:0.1, k2:0.05, k3:0, k4:0, fx:1, fy:1, cx:0.5, cy:0.5, zoom:1 }` | OpenCV魚眼カメラ歪曲パラメータ |

---

## 7. 実装ディレクトリとモジュール構成

ソースコードのディレクトリ構成とモジュールの対応関係です。

```text
assets/js/
  ├── core/                           # ドメイン・アプリケーションコア
  │   ├── main.js                     # アプリケーション基盤エントリーポイント & ポストプロセス歪曲シェーダー
  │   ├── state.js                    # AppState (状態管理実体)
  │   ├── store.js                    # CTStore (AppStateへのアクセサーラッパー)
  │   ├── hw/                         # 仮想HWドメインシミュレータ
  │   │   ├── gantry-sim.js           # ガントリ制御ロジック
  │   │   ├── couch-sim.js            # 寝台制御ロジック
  │   │   ├── injector-sim.js         # インジェクタ制御ロジック
  │   │   └── camera-sim.js           # 仮想カメラ・歪曲制御ロジック
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
  │   │   └── ui-controller.js        # DOMイベントハンドラ・画面同期・歪曲UIハンドラ
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

## 8. UI構成・表示仕様

### 8.1 パネル構成と役割
操作画面は以下の5パネルで構成され、将来実コンソール画面へ接続する際にも各パネル単位で容易に換装できる設計としています。

- **Console (`panel-console`)**: スキャン開始/停止、バッチ編集、シーケンス実行
- **HW STATE MONITOR (`panel-monitor`)**: ガントリ・寝台・インジェクタ・直近結果表示
- **HW設定 (`panel-hw-config`)**: Detector Rows、Couch Y/Z、Injector A/B 設定
- **3D表示・操作 (`panel-3d-config`)**: フォーカス、カメラ、透過、X線、患者表示、患者モデル選択/9-DOF、カメラ歪曲設定、カメラ配信設定
- **Command Log (`panel-command-log`)**: コマンド実行履歴表示

---

## 9. 仮想カメラ映像配信アーキテクチャ詳細

### 9.1 配信方式とプロトコル構成

| 方式 | コーデック | 通信プロトコル | 技術スタック・伝送方式 |
| :--- | :--- | :--- | :--- |
| **MJPEG Stream** | MJPEG (JPEG連番) | HTTP (`multipart/x-mixed-replace`) | HTMLCanvasElement `.toDataURL('image/jpeg')` または Blob 転送 |
| **H.264 Stream (RTSP)** | H.264 / AVC | RTSP (または WebSocket-RTSP ゲートウェイ) | `MediaRecorder` API (`video/mp4;codecs=avc1` / `video/webm`) ＋ RTSP リレー |
| **H.264 Stream (HTTP)** | H.264 | HTTP (HLS / Low-Latency HLS) | MediaSource Extensions (MSE) / HLS.js 互換セグメント生成 |

---

## 10. 検証方針
- **構文チェック**: `node --check`
- **外部I/Fプロトコル検証**: `node scripts/verify-external-interface.js`
- **映像配信検証**:
  - MJPEG over HTTP ストリームのブラウザ再生確認
  - RTSP ストリーム (VLC メディアプレイヤー / ffmpeg での受信確認)
- **カメラ歪曲検証**:
  - OpenCV Fisheye パラメータ計算と sRGB ガンマ 2.2 補正後のレンダリング結果の目視およびキャプチャ確認
