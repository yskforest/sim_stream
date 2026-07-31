# CT Simulator UI 再設計書

- 文書ID: CTSIM-UI-DESIGN-001
- 版数: 1.2
- 更新日: 2026-05-31

## 1. 目的
UIを以下4分類で整理し、実コンソール接続時に置換しやすい構成を維持する。
- 各HWシミュレータの状態モニタ
- コンソールアプリの簡易実装
- HW設定
- 3Dシミュレータ操作・表示設定

## 2. パネル構成
- Console (`panel-console`)
  - スキャン開始/停止、バッチ編集、シーケンス実行
- HW STATE MONITOR (`panel-monitor`)
  - ガントリ・寝台・インジェクタ・直近結果表示
- HW設定 (`panel-hw-config`)
  - Detector Rows、Couch Y/Z、Injector A/B
- 3D表示・操作 (`panel-3d-config`)
  - フォーカス、カメラ、透過、X線、患者表示
- Command Log (`panel-command-log`)
  - コマンド履歴

## 3. 表示仕様
- 初期表示: Console / HW Monitor
- 初期非表示: HW設定 / 3D表示・操作 / Command Log
- ツールバーで個別表示切替
- 排他表示ではなく同時表示可能
- 各パネルは縮小・非表示可能

## 4. レスポンシブ仕様
- 横長/縦長とも4隅配置を維持
- パネルサイズは画面幅に応じて縮小
- 3D表示領域を維持するため、中央重なり配置はしない

## 5. 実装責務
- `index.html`: パネル定義と操作要素
- `assets/css/ct-simulator.css`: レイアウト、表示制御
- `assets/js/adapters/ui/ui-controller.js`: イベント処理、状態反映

## 6. 外部連携との関係
- UI操作は `CTCommandBus.execute()` を利用
- 外部操作も同一コマンド経路を利用
- UIは制御基盤の一つのクライアント実装として機能
