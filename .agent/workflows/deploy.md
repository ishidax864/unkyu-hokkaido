---
description: 開発環境と本番環境の使い分けワークフロー
---

# 開発・本番ブランチワークフロー

## ブランチ構成

| ブランチ | 用途 | Vercel |
|---------|------|--------|
| `main` | 本番環境 | **Production** (自動デプロイ) |
| `develop` | 開発・検証環境 | **Preview** (自動デプロイ、プレビューURL発行) |

## 運用ルール

### 「開発環境で作業して」と言われたら
// turbo-all

1. developブランチに切り替え
```bash
cd /Users/shota/運休AI && git checkout develop
```

2. 作業を行う

3. 作業が終わったらコミット＆プッシュ
```bash
git add -A && git commit -m "作業内容" && git push origin develop
```

4. Vercelが自動でPreview URLを発行 → そこで動作確認

---

### 「本番にデプロイして」と言われたら
// turbo-all

1. mainにマージ
```bash
cd /Users/shota/運休AI && git checkout main && git merge develop && git push origin main
```

2. Vercelが自動でProductionデプロイ

3. developブランチを最新に同期
```bash
git checkout develop && git merge main
```

---

### 「新しい機能を試したい」と言われたら

1. developから機能ブランチを作成
```bash
cd /Users/shota/運休AI && git checkout develop && git checkout -b feature/機能名
```

2. 作業後、developにマージ
```bash
git checkout develop && git merge feature/機能名 && git push origin develop
```

---

## 注意事項
- **本番環境（main）に直接pushしない** — 必ずdevelop経由
- Preview URLは `https://unkyu-ai-<hash>.vercel.app` 形式
- Supabaseは本番と共有（データ分離が必要になったら別途検討）
