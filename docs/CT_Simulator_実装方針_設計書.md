# CT 3D Simulator 実装方針・設計書

- 文書ID: CTSIM-DESIGN-001
- 版数: 1.2
- 更新日: 2026-05-31
- 対応要求: [CT_Simulator_要求仕様書.md](/x:/ctcode/three_ct/docs/CT_Simulator_要求仕様書.md)

## 1. 設計原則
- UIと外部I/Fは同じCommand Busを使う
- HWシミュレータと表示（3D/UI）を分離する
- 機種変更に備えて設定（profile）とモデル実装を分離する

## 2. レイヤ構成
- Domain (`core/hw`)
  - Gantry/Couch/Injector の状態制御
- Application (`core/commands`, `core/services`)
  - コマンド実行、シーケンス、ログ
- Adapter (`adapters/ui`, `adapters/external`)
  - UIイベントと外部I/Fをアプリ層へ接続
- Presentation (`view/models`, `index.html`, `css`)
  - 3D表示とUI表示

## 3. 実装ディレクトリ
```text
assets/js/
  core/
    main.js
    state.js
    store.js
    hw/{gantry-sim,couch-sim,injector-sim}.js
    commands/command-bus.js
    services/{sequence-service,command-log-service}.js
    profile/{default-profile,profile-service}.js
  adapters/
    ui/ui-controller.js
    external/{protocol-v1,external-gateway}.js
  view/models/
    {room,gantry,injector,control-room,server-rack}-model.js
```

## 4. 制御フロー
1. UIまたは外部I/Fがコマンド発行
2. Command Busが検証して対象HWへ委譲
3. AppStateを更新
4. UI/3D/ログへ反映

## 5. UI配置・表示仕様（最新）
- 初期表示: Console / HW Monitor
- 初期非表示: HW設定 / 3D表示・操作 / Command Log
- 縦長表示でも4隅配置を維持
- 各UIは同時表示可能、縮小/非表示可能

## 6. 実装フェーズ（履歴）
1. 基盤分離（state/store導入）
2. HWシミュレータ分離
3. UI Adapter化
4. 外部I/F統合
5. コマンドログ・検証強化

## 7. 検証方針
- 構文: `node --check`（主要JS）
- I/F: `node scripts/verify-external-interface.js`
- 手動E2E
  - 3D表示
  - UI操作（寝台/ガントリ/インジェクタ）
  - バッチ実行
  - 外部コマンド反映
