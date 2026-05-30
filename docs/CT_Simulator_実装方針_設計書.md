# CT 3D Simulator 実装方針・設計書

- 文書ID: CTSIM-DESIGN-001
- 作成日: 2026-05-30
- 対象仕様: `docs/CT_Simulator_要求仕様書.md`
- 対象実装: `index.html`, `assets/js/core/state.js`, `assets/js/core/main.js`

## 1. 目的
要求仕様（HWシミュレータ部 / 3D空間表示 / UI部 / コンソールアプリ連携）を満たすため、既存実装を段階的に再構成する。

## 2. 現状整理
- 現在は `main.js` に描画・UI・シーケンス・状態反映が集約。
- `state.js` はAppState定義中心。
- UI操作と内部状態は連動済みだが、外部コマンドI/F層が未分離。
- UI置換可能性を担保する境界（API/Controller層）が未定義。

## 3. 目標アーキテクチャ

### 3.1 レイヤ構成
1. Domain Layer（HWシミュレータ核）
- 各HW（Gantry/Couch/Injector）の状態・制約・遷移ルール

2. Application Layer（コマンド実行）
- コマンド受付、バリデーション、実行、結果生成
- UI操作と外部操作の共通入口

3. Adapter Layer（接続）
- UI Adapter: DOMイベントをコマンドへ変換
- External Adapter: 外部コンソール連携（将来はWebSocket等）

4. Presentation Layer（3D + UI）
- Three.js描画
- 監視UI表示

### 3.2 単一状態モデル
- すべての操作は同じState Storeを更新する。
- 3D描画/UI表示/外部応答はStoreから派生して更新する。

## 4. ディレクトリ設計（目標）

```text
assets/
  js/
    app/
      bootstrap.js
    core/
      store.js
      events.js
      commands/
        command-bus.js
        gantry-commands.js
        couch-commands.js
        injector-commands.js
      hw/
        gantry-sim.js
        couch-sim.js
        injector-sim.js
      services/
        sequence-service.js
    adapters/
      ui/
        ui-controller.js
        ui-bindings.js
      external/
        external-gateway.js
        protocol-v1.js
    view/
      scene-builder.js
      mesh-bindings.js
      camera-controller.js
      monitor-view.js
```

補足:
- 既存 `assets/js/core/main.js` は段階的に縮小し、最終的に `bootstrap.js` へ置換。
- 互換のため、移行期間は既存ファイルを薄い委譲レイヤとして残す。

## 5. モジュール責務

### 5.1 HWシミュレータ（core/hw）
- GantrySim: `startScan`, `stopScan`, `setRotorSpeed`, `setXrayVisible`, `setDetectorRows`
- CouchSim: `moveToY`, `moveToZ`
- InjectorSim: `setA`, `setB`, `startInject`, `stopInject`
- すべて同期/非同期結果を統一フォーマットで返す。

### 5.2 コマンドバス（core/commands）
- 入力: `{ target, action, params, requestId, source }`
- 出力: `{ requestId, success, state, error? }`
- sourceは `ui | external` を想定。

### 5.3 State Store（core/store）
- AppStateの唯一の更新ポイント
- `dispatch(command)` と `subscribe(listener)` を提供

### 5.4 描画バインディング（view）
- Store更新を購読し、Mesh/Camera/UI monitorへ反映
- 描画反映ロジックとビジネスロジックを分離

### 5.5 外部連携（adapters/external）
- 初期はダミーGateway（ローカル呼び出し）
- 後続でWebSocket/MessageChannelへ差し替え可能にする

## 6. 外部コマンドI/F 設計方針（草案）

### 6.1 コマンド共通形式
```json
{
  "requestId": "uuid",
  "target": "gantry|couch|injector",
  "action": "startScan",
  "params": {}
}
```

### 6.2 応答共通形式
```json
{
  "requestId": "uuid",
  "success": true,
  "state": {
    "gantry": {},
    "couch": {},
    "injector": {}
  },
  "error": null
}
```

### 6.3 エラー分類
- `VALIDATION_ERROR`
- `INVALID_STATE`
- `TARGET_NOT_FOUND`
- `INTERNAL_ERROR`

## 7. 段階移行計画

### Phase 1: 安全分離（表示維持）
- `store.js` を追加し、既存AppStateアクセスを委譲
- 受け入れ: 現状UI操作と3D表示が変わらない

### Phase 2: HWシミュレータ化
- Gantry/Couch/Injectorの操作関数を `core/hw` へ移動
- 受け入れ: UI操作が全て command経由で反映される

### Phase 3: UI Adapter化
- DOMイベント処理を `adapters/ui` に分離
- 受け入れ: `main.js` からUIハンドラ削減、機能同等

### Phase 4: 外部連携口追加
- `external-gateway.js` でコマンド受付APIを公開
- 受け入れ: UIを使わずコマンド注入で状態変更できる

### Phase 5: 監視・品質強化
- コマンドログ、構文チェック、回帰テストの整備
- 受け入れ: 主要ユースケースの自動確認が可能

## 8. テスト方針
- 静的: `node --check` でJS構文確認
- 手動E2E:
1. 3D初期表示
2. Camera切替
3. Couch/Injector操作反映
4. Scan開始停止
5. Batch実行
6. 外部コマンドでgantry/couch/injector制御

## 9. リスクと対策
- リスク: 分割時にグローバル依存が崩れる
- 対策: Phaseごとに小分け変更、委譲層を残して置換

- リスク: UI置換時に状態不整合
- 対策: Command Busを唯一の更新経路に固定

## 10. 実装開始順（推奨）
1. `core/store.js` 追加（既存AppStateの薄いラップ）
2. `core/commands/command-bus.js` 追加
3. Gantry/Couch/Injector command実装
4. UIイベントのcommand化
5. external-gateway追加

## 11. 完了定義
- 要求仕様 5.1〜5.4 を満たす実装と受け入れ確認が完了していること。
- UI有無に関係なく、HWシミュレータが同一挙動で操作可能であること。
