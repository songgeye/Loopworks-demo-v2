# Loopworks フロントエンド

加工記録管理のフロントエンド。React 19 / Next.js 15（App Router）/ TypeScript / Tailwind CSS v4。

## 起動

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

Rails が 3000 番を使っているので、開発サーバーは別ポートで起動してください。

```bash
PORT=3001 npm run dev --prefix frontend
```

## 画面

| パス | 画面 | 内容 |
|---|---|---|
| `/` | ホーム | 今日の累計重量・記録件数、最近の記録、品目別累計 |
| `/records` | 記録 | 日付範囲・品目・作業者・キーワードでの絞り込み、CSV出力、ページ送り |
| `/records/new` | 新しい記録 | 複数品目のまとめ入力、異常値の確認ダイアログ、メモ・写真 |
| `/records/[id]` | 記録の詳細 | 1件の内容と直近平均との比較 |
| `/summary` | 集計 | 品目別の今月／前月比較、作業者別実績 |
| `/summary/print` | 出荷サマリー | 1日分を1枚に収めた印刷用ビュー |
| `/master` | マスタ | 品目マスタ・作業者マスタ（使用中は削除不可） |
| `/settings` | 設定 | アカウント、CSVの文字コード、AIチェックの状態 |

## データ層

Rails 側にまだ JSON API が無いため、いまはモックデータで動いています。

- `src/lib/types.ts` — `db/schema.rb` に対応する型（`materials` / `staffs` / `production_records`）
- `src/lib/mock-data.ts` — 表示確認用のデータ。`TODAY` で「今日」を固定している
- `src/lib/api.ts` — 画面が呼ぶ取得関数。**API 接続時はこのファイルの中身を `fetch` に差し替えるだけ**で、画面側の変更は不要

### 「今日」を固定している理由

`new Date()` から日付を取ると、サーバー描画とブラウザ描画で値がずれて hydration mismatch になります。
モックの間は `mock-data.ts` の `TODAY` を基準日にしています。API 接続後は不要です。

## 未接続の部分

以下は見た目とフロント側のロジックのみで、保存は Rails の API 待ちです。

- 生産記録の登録・編集・削除
- マスタの追加・削除（画面内の state だけ更新され、リロードで戻ります）
- 設定の保存、ログイン／ログアウト
- CSV の Shift-JIS 出力（フロントは UTF-8 BOM 付きのみ。Shift-JIS は Rails 側での出力を想定）
