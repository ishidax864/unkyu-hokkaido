# 運休北海道 - JR北海道の運休予測サービス

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**AIが天候や運行状況からJR北海道の運休リスクをリアルタイムで予測。北海道の通勤・通学を支える運行予報士。**

## 特徴

- ⚡ **リアルタイム予測**: 気象データとJR公式情報から運休リスクを即座に算出
- 🔮 **先読み機能**: 数時間先〜1週間先までの予測に対応
- 🚌 **代替ルート提案**: 高速バス、地下鉄、タクシーなど、状況に応じた最適ルートを提案
- ⏰ **時刻シフト提案**: 運休回避のための最適な出発時刻をアドバイス
- 📊 **詳細な根拠表示**: 予測の理由を明確に提示し、信頼性を担保
- ❄️ **北海道特化**: 吹雪・大雪など北海道特有の気象条件に最適化

## 機能

- 🚃 **運休リスク予測** - 気象データから運休確率を計算
- 📊 **週間予測グラフ** - 5日先までのリスク推移
- 🌤️ **リアル天気連携** - Open-Meteo APIで最新気象データ取得
- 📱 **PWA対応** - ホーム画面に追加してアプリのように使用可能
- 🔔 **プッシュ通知** - 高リスク時の通知（Pro版）
- 📤 **SNSシェア** - X/LINE/クリップボードへ共有

## デモ

デプロイ先は`.env.local`の`NEXT_PUBLIC_SITE_URL`で設定されます。

デフォルト: `https://unkyu-ai.vercel.app`（環境変数未設定時）

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Weather API**: Open-Meteo (無料・APIキー不要)
- **Deployment**: Vercel

## ローカル開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start
```

http://localhost:3000 でアクセス

## 環境変数

`.env.example` をコピーして `.env.local` を作成：

```bash
cp .env.example .env.local
```

| 変数 | 説明 | 必須 |
|------|------|------|
| `NEXT_PUBLIC_SITE_URL` | 本番サイトURL | 本番のみ |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | オプション |

## デプロイ

### Vercel (推奨)

1. [Vercel](https://vercel.com) にサインアップ
2. GitHubリポジトリを接続
3. 環境変数を設定
4. デプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/unkyu-ai)

## セキュリティ

- ✅ CSP (Content Security Policy)
- ✅ XSS保護ヘッダー
- ✅ レート制限 (60req/min)
- ✅ 入力バリデーション
- ✅ HTTPS強制 (HSTS)
- ✅ クリックジャッキング対策

## ディレクトリ構成

```
運休AI/
├── app/                    # Next.js App Router
│   ├── api/               # APIルート
│   ├── error.tsx          # エラーページ
│   ├── layout.tsx         # ルートレイアウト
│   ├── loading.tsx        # ローディング
│   ├── not-found.tsx      # 404ページ
│   ├── page.tsx           # メインページ
│   └── sitemap.ts         # サイトマップ
├── components/            # Reactコンポーネント
├── lib/                   # ユーティリティ・ロジック
│   ├── prediction-engine.ts  # 予測エンジン
│   ├── weather.ts         # 天気API
│   ├── validation.ts      # 入力バリデーション
│   └── ...
├── public/                # 静的アセット
│   ├── icons/            # PWAアイコン
│   ├── manifest.json     # PWAマニフェスト
│   └── sw.js             # Service Worker
└── middleware.ts          # レート制限など
```

## ライセンス

MIT License

## 免責事項

このサービスは参考情報を提供するものであり、実際の運行状況についてはJR北海道の公式発表をご確認ください。
 
