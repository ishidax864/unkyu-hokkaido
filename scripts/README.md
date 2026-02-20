# scripts/ ディレクトリ

開発・検証に使用したスクリプト群です。用途ごとに分類します。

## 🚀 本番・運用スクリプト

| ファイル | 用途 |
|---------|------|
| `dry-run-crawler.ts` | クローラーのドライラン（本番DB書き込みなし） |
| `fetch-jr-status.ts` | JR公式ページからの状態取得テスト |
| `check-crawler-health.ts` | クローラー実行状態の確認 |
| `inspect-schema.ts` | Supabaseスキーマ確認 |
| `db-integrity-check.ts` | DB整合性チェック |
| `restore-db-schema.sql` | DBスキーマの復元SQL |

## 🧪 バックテスト・精度評価

| ファイル | 用途 |
|---------|------|
| `run-backtest.ts` | メインバックテスト実行 |
| `run-comprehensive-backtest-2000.ts` | 2000件大規模バックテスト |
| `run-comprehensive-validation-300.ts` | 300件検証 |
| `run-optimization-backtest.ts` | パラメータ最適化バックテスト |
| `backtest-accuracy.ts` | 精度計算 |
| `backtest-300.ts` | 300件バックテスト |
| `analyze-accuracy.ts` | 精度分析レポート生成 |
| `analyze-backtest-failures.ts` | 失敗ケース分析 |
| `generate-ground-truth-2000.ts` | グラウンドトゥルースデータ生成 |
| `generate-2k-dataset.ts` | 2000件データセット生成 |
| `generate-5k-dataset.ts` | 5000件データセット生成 |

## 🔧 デバッグ・一時調査

> これらは特定の不具合調査に使った一時スクリプトです。削除しても問題ありません。

| ファイル | 用途 |
|---------|------|
| `debug-*.ts` | 特定ケースのデバッグ |
| `reproduce-*.ts` | 不具合再現 |
| `check-*.ts` | 各機能の動作確認 |
| `verify-*.ts` | 修正後の動作検証 |
| `diagnose-*.ts` | 問題診断 |
| `tune-*.ts` | パラメータ調整実験 |

## 🤖 機械学習（Python）

| ファイル | 用途 |
|---------|------|
| `train_model.py` | 基本モデルの学習 |
| `train_advanced_models.py` | 高度なモデルの学習 |
| `export_to_onnx.py` | ONNXフォーマットへのエクスポート |
| `export_route_map.py` | 路線マップのエクスポート |
| `prune-onnx.js` | ONNXモデルの最適化 |

> **注意**: 現在のシステムはONNXモデルを使用していません（予測エンジンがルールベースに変更された）。Pythonスクリプト・`lib/backtest/` の `.pkl` ファイルはアーカイブ目的で残しています。

## `lib/backtest/` データファイル

バックテスト用のデータセット・モデルファイル群。本番ビルドには含まれません。
`.gitignore` でトラッキング対象から外すことを推奨します（大きな `.pkl` ファイルがあるため）。
