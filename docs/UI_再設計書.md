# CT Simulator UI再設計書

- 文書ID: CTSIM-UI-DESIGN-001
- 作成日: 2026-05-31
- 対象: `index.html`, `assets/js/adapters/ui/ui-controller.js`, `assets/js/core/commands/command-bus.js`, `assets/js/adapters/external/*`

## 1. 目的
UIを以下4分類で整理し、責務分離と拡張性を高める。

1. 各HWシミュレータの状態モニタ
2. コンソールアプリの簡易実装
3. HWの設定
4. 3Dシミュレータとしての操作・表示設定

加えて、コンソールアプリ簡易実装は「実コンソール連携時の通信制御」を模擬し、HWを直接操作せず、必ずコマンド送信で制御する。

## 2. UI情報設計

### 2.1 A. 各HWシミュレータの状態モニタ
目的: 観測専用。操作は持たない。

表示項目:
- Gantry: `isScanning`, `rotorSpeed`, `currentScanMode`, `detectorRows`, `xrayVisible`
- Couch: `y`, `z`, `movingState`
- Injector: `a`, `b`, `injectingState`
- System: `lastCommandSource`, `lastCommandResult`, `errorCode`

要件:
- AppState購読で自動更新
- 1秒以内反映
- 色とバッジで状態を識別

### 2.2 B. コンソールアプリの簡易実装
目的: 実コンソールの代替UIとして、通信的にHWを制御する。

原則:
- UIは `CTCommandBus.execute()` のみ呼ぶ
- HWシミュレータ（gantry/couch/injector）を直接変更しない
- `source: 'ui-console'` を付与する

機能:
- Scan開始/停止
- Batch作成/編集/削除
- Sequence実行/停止
- Injector同期指定

通信模擬:
- 送信コマンドをログ表示（request）
- 応答結果をログ表示（response）
- 失敗時はエラーコード表示

### 2.3 C. HWの設定
目的: 機種/プロファイル差分を設定する。

機能:
- Detector Rows選択
- 可動域（Couch Y/Z, Injector A/B）の上限下限表示
- プロファイル適用状態表示

要件:
- `CTProfileService` からUI入力範囲を動的生成
- 実行中に変更不可な設定はUIでdisable

### 2.4 D. 3Dシミュレータ操作・表示設定
目的: 3Dの見え方・操作性を制御する。

機能:
- カメラ視点切替（free/operator/patient/injector/focus）
- ガントリ透過/不透過
- X線表示ON/OFF
- 患者モデル表示ON/OFF
- フォーカスターゲット選択

要件:
- 3D表示制御はView層関数を呼ぶ
- 状態値はAppStateに保持して再現可能にする

## 3. レイヤ責務

- UI View (`index.html`): 表示と入力
- UI Controller (`ui-controller.js`): DOMイベントをコマンドへ変換
- Command Bus (`command-bus.js`): コマンド検証・ディスパッチ
- HW Sim (`core/hw/*.js`): 状態遷移と制御
- External Gateway: 実コンソール接続時のコマンド入口

禁止事項:
- UIから `AppState.* = ...` 直接代入
- UIから `core/hw` を直接呼び出し

## 4. コマンド契約（UI簡易コンソール）

基本形式:
```json
{
  "source": "ui-console",
  "target": "gantry|couch|injector",
  "action": "...",
  "params": {}
}
```

レスポンス形式:
```json
{
  "requestId": "...",
  "success": true,
  "state": {},
  "error": null
}
```

## 5. 画面構成（提案）

1. 左カラム: コンソール簡易実装（操作中心）
2. 右上: HW状態モニタ（観測専用）
3. 右下: HW設定 + 3D表示設定
4. 下部: Command Log（request/response）

## 6. 実装ステップ

Phase UI-1:
- `index.html` を4分類に再配置
- セクションIDを整理（`panel-monitor`, `panel-console`, `panel-hw-config`, `panel-3d-config`）

Phase UI-2:
- `ui-controller.js` でイベントをカテゴリ別に分割
- `executeConsoleCommand()` を追加し `source: 'ui-console'` を統一

Phase UI-3:
- Command Log表示を追加（最新N件）
- 失敗時のUI通知を追加

Phase UI-4:
- 実行中disableルールを統一
- 要件テスト（表示、コマンド、3D反映、エラー表示）

## 7. 受け入れ基準

- UIが4分類で明確に分かれている
- 簡易コンソール操作が全てコマンド経由で実行される
- UI直接代入なしでHW状態が更新される
- 実行結果がモニタとログの両方に反映される
- 実コンソール接続時に同じコマンド契約を流用できる
