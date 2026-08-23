# Loopworks 実装仕様書 v2

対象読者: **Claude Code(実装エージェント)**
最終更新: 2026-08-21
前版: `loopworks_implementation_spec_v1.md`

> **v1 からの変更点**
> - 確認事項 A / B / C / D / E / F / G が確定。在庫機能が実装範囲に入った
> - 取引の方向を確定(自社は**仕入**側)。テーブル命名を確定
> - 買取伝票の `status` を廃止(その場で計量完了するため不要)
> - 出荷機能を新規追加(T4)
> - 通知を WeCom から**メール主体 + LINE 補助**へ変更(T6)
> - 認証方式を確定(独自ドメイン取得 + Cookie セッション)

---

## 0. 遵守事項（実装者向け）

1. **§2 の実装禁止範囲に着手しないこと。**
2. **仕様に書かれていない項目を推測で埋めないこと。** 不明点が出たら実装を止め、質問すること。
3. **1タスク = 1ブランチ = 1PR。** まとめてコミットしない。
4. **各タスクにテストを付けること。** 受け入れ基準を各タスクに記載している。
5. **既存の ERB 画面と既存モデルを壊さないこと。**
6. **マイグレーションは可逆にすること。**

---

## 1. 業務の全体像（確定）

```
[持込元 = 仕入先]
    │  廃品を持ち込む。自社で計量した重量伝票を持参することがある
    ▼
[買取伝票 purchase_slips]  1回の搬入 = 1枚
    │  その場で計量し、カテゴリ（マテリアル）ごとに分類する
    ▼
[生産記録 production_records]  梱包単位。1件 = 1マテリアル
    │
    ▼  在庫が増える (PURCHASE_IN)
[在庫 inventory_movements]
    │
    ▼  在庫が減る (SHIPMENT_OUT)
[出荷 shipments]
    │  別の回収業者へ売却する
    ▼
[売却先 = 販売先]
```

**確定した前提**

| 項目 | 内容 |
|---|---|
| 取引の方向 | 自社は**仕入**側。持ち込まれたものを買い取って在庫にする |
| 出庫の発生 | 別の回収業者へ**売却したとき** |
| 加工の変換 | **なし**。分解や精錬による重量変換は行わない。カテゴリへ分類するのみ |
| 廃棄 | **発生する**。分類時に在庫にならない不要物が出る。システム上で記録する（§4.4） |
| 計量のタイミング | **その場で完結**する。翌日にまたがない |
| 在庫の単位 | **kg** のみ。梱包数は管理しない |
| 同一カテゴリの複数梱包 | 頻繁に発生する。**その場で合算表示できること**が要件 |

---

## 2. ★ 実装禁止範囲（仕様未確定）

| 機能 | 未確定の理由 |
|---|---|
| **締め後の編集申請・承認フロー** | 仕様が固まっていない。今回は管理者の直接編集で対応する（§9-2） |
| **実地棚卸の機能** | 実施するかどうか不明。`ADJUSTMENT` による手動調整のみ実装する |
| **AI 異常検知の統計・傾向分析** | 段階1（ルールベース）のみ実装する |

---

## 3. 共通仕様

### 3.1 認証とドメイン

**ドメインが必要な理由は認証であり、通知ではない。** メール送信に独自ドメインは不要。

フロントとAPIが別サイト扱いになると、セッション Cookie に `SameSite=None` が必要になり、
**Safari の既定設定で遮断される。** 現場のスマートフォン利用を想定する以上、これは実運用で必ず問題になる。

**採用する構成（優先順）**

| # | 構成 | 費用 | 判断 |
|---|---|---|---|
| 1 | 会社の既存ドメインにサブドメインを2つ切る | 0円 | **第一候補** |
| 2 | 開発者が独自ドメインを取得する | 年1,500円程度 | 1 が通らない場合 |
| 3 | Next.js の rewrites で API をプロキシする | 0円 | ドメインが一切使えない場合のみ |

```
フロント:  https://app.example.co.jp
API:      https://api.example.co.jp
```

同一サイト扱いになるため Cookie は `SameSite=Lax` で動作する。

**構成3を採る場合の追加要件**

```js
// next.config.js
async rewrites() {
  return [{ source: "/api/:path*", destination: process.env.RAILS_ORIGIN + "/api/:path*" }];
}
```

- ブラウザから見て同一オリジンになるため CORS 設定は不要になる
- **ただし xlsx のダウンロードはプロキシを経由させないこと。** レスポンスサイズの制限に当たる。
  ActiveStorage に保存し、署名付き URL を返して直接ダウンロードさせること
  （署名付き URL は Cookie を必要としないため、別オリジンでも動作する）

**共通事項**

- 既存の Devise セッション Cookie をそのまま流用する。JWT へは移行しない
- **localStorage にトークンを保存する実装をしないこと**

**CSRF**

```
GET /api/v1/csrf   → { "token": "..." }
```

Next.js は状態変更リクエストに `X-CSRF-Token` ヘッダを付与する。
Rails は `protect_from_forgery with: :exception` を維持する。

**CORS**（構成1・2の場合のみ必要）

```ruby
# config/initializers/cors.rb
Rack::Cors.new do
  allow do
    origins ENV.fetch("FRONTEND_ORIGIN")
    resource "/api/*",
      headers: :any,
      methods: %i[get post patch put delete options],
      credentials: true,
      expose: ["Content-Disposition"]
  end
end
```

`origins "*"` は `credentials: true` と併用できない。必ず環境変数で指定すること。
`expose: ["Content-Disposition"]` は xlsx のファイル名取得に必須（§T1-5）。

### 3.2 API 規約

- ベースパス `/api/v1`。未認証時は `401`
- 日時は **ISO 8601 + オフセット付き**（`2026-08-21T14:32:00+09:00`）
- 重量は数値型。文字列にしない
- 一覧は Kaminari でページネーションし、`meta` を同梱する

```json
{ "data": [ ... ], "meta": { "current_page": 1, "total_pages": 12, "total_count": 238 } }
```

```json
{ "errors": [ { "field": "actual_kg", "message": "..." } ] }
```

### 3.3 ★ タイムゾーン（必須）

**`Time.now` および `Date.today` を使用してはならない。**
コンテナの既定タイムゾーンは UTC のため、`config.time_zone` を設定していても9時間ズレる。

```ruby
# .rubocop.yml
Rails/TimeZone:
  Enabled: true
```

必ず `Time.zone.now` / `Time.zone.today` を使い、CI で機械的に検出すること。

### 3.4 業務日の定義（確定）

**締め時刻は 00:00。ただし設定値として外出しすること。**

```ruby
# config/initializers/business_day.rb
BUSINESS_DAY_CUTOFF_HOUR = ENV.fetch("BUSINESS_DAY_CUTOFF_HOUR", "0").to_i
```

```ruby
# app/models/concerns/business_day.rb
module BusinessDay
  module_function

  def current
    from(Time.zone.now)
  end

  def from(time)
    (time.in_time_zone - BUSINESS_DAY_CUTOFF_HOUR.hours).to_date
  end
end
```

**この値をハードコードしないこと。** 深夜作業が常態化した場合、
`BUSINESS_DAY_CUTOFF_HOUR=3` への変更だけで解消できる状態を保つ。

---

## 4. データモデル（確定）

### 4.1 取引先

持込元（仕入先）と売却先（販売先）の**両方**が存在する。
既存の `companies` を流用し、役割をフラグで持つ。

```ruby
add_column :companies, :supplier, :boolean, null: false, default: false
add_column :companies, :buyer,    :boolean, null: false, default: false
add_index  :companies, :supplier
add_index  :companies, :buyer
```

- 1社が両方の役割を持つ場合がありうるため、排他にしないこと
- 既存データは全件 `supplier: true` として移行する（現状はすべて持込元）
- 既存の `Purchaser`（担当者）は `companies` に属する担当者として維持する

### 4.2 買取伝票

```ruby
create_table :purchase_slips do |t|
  t.references :company,  null: false, foreign_key: true
  t.references :contact,  null: true,  foreign_key: { to_table: :purchasers }
  t.datetime :received_at, null: false
  t.string   :slip_no
  t.decimal  :declared_total_kg, precision: 10, scale: 2
  t.text     :note
  t.datetime :deleted_at
  t.timestamps
end
add_index :purchase_slips, :deleted_at
add_index :purchase_slips, [:company_id, :received_at]
```

```ruby
add_reference :production_records, :purchase_slip, null: true, foreign_key: true
```

**`status` カラムは持たない。** その場で計量が完結するため、
伝票の作成時点で差分が確定する。段階的なステータス管理は不要。

**★ Null 許容の設計意図（変更禁止）**

- `production_records.purchase_slip_id` が NULL → 伝票に紐づかない記録。**許容する**
- `purchase_slips.declared_total_kg` が NULL → 伝票はあるが先方計量値がない。**許容する**

全取引先が重量伝票を出すわけではない。この2段階の Null 許容が要件の中核である。
`null: false` に変更してはならない。

### 4.3 在庫移動

**在庫を残高カラムで持ってはならない。** 更新競合・修正時の巻き戻し・履歴喪失で破綻する。

```ruby
create_table :inventory_movements do |t|
  t.references :material, null: false, foreign_key: true
  t.integer  :movement_type, null: false
  t.decimal  :quantity_kg, precision: 12, scale: 2, null: false  # 符号付き
  t.datetime :occurred_at, null: false
  t.references :source, polymorphic: true, null: true
  t.text     :note
  t.references :created_by, null: false, foreign_key: { to_table: :users }
  t.timestamps
end
add_index :inventory_movements, [:material_id, :occurred_at]
```

```ruby
enum movement_type: {
  opening:      0,   # 期首在庫（+）
  purchase_in:  1,   # 買取による入庫（+）
  shipment_out: 2,   # 出荷による出庫（−）
  adjustment:   3,   # 手動調整（±）
  disposal_out: 4    # 在庫からの廃棄（−）
}
```

`disposal_out` は**在庫として計上済みのものを後から廃棄する**場合に使う。
搬入時の分類で発生する廃棄は在庫に入らないため、この区分は使わない（§4.4）。

**加工の変換に伴う出庫（`production_out`）は存在しない。** 確認事項D の回答により、
分解や精錬による重量変換は行わないことが確定している。実装しないこと。

**現在庫の算出**

```ruby
InventoryMovement.group(:material_id).sum(:quantity_kg)
```

- 「同じカテゴリの複数梱包を合算したい」はこの集計で自動的に満たされる
- 任意時点の在庫は `where(occurred_at: ..date)` で求まる
- **日次スナップショットは実装しないこと。** 現時点の件数では不要

**★ 整合性の要件**

生産記録・出荷の作成/更新/削除と、在庫移動の生成/打ち消しは**同一トランザクション**で行う。

- **モデルのコールバックに書かないこと。** `paranoia` の論理削除時に `destroy` コールバックが
  期待どおり発火せず、在庫だけ残る事故が起きる
- サービスオブジェクト（`app/services/`）に集約し、そこから明示的に呼ぶこと
- 削除時は在庫移動を物理削除せず、**逆符号の `adjustment` を追加**して打ち消す

### 4.4 廃棄の扱い（確定）

搬入されたものを分類する際、在庫にならない不要物が発生する。
**廃棄を独立した機能として作らず、マテリアルの一区分として扱う。**

```ruby
add_column :materials, :category, :integer, null: false, default: 0
```

```ruby
enum category: { stock: 0, disposal: 1 }
```

- `stock`: 在庫として計上し、出荷の対象になる（鉄スクラップ、銅線など）
- `disposal`: 廃棄区分。在庫に計上しない（木くず、プラスチック、土砂など）
- 既存のマテリアルは全件 `stock` として移行する

**この設計を採る理由（変更しないこと）**

現場の作業は「分別してそれぞれの箱に入れる」であり、廃棄はその箱のひとつでしかない。
専用の入力欄を別に設けると、現場の動作とシステムの入力が食い違う。
マテリアルの一区分にすることで、**登録フォームの変更がほぼ不要になり**、
廃棄量の集計も既存の集計ロジックがそのまま使える。

**動作要件**

1. `disposal` 区分のマテリアルで生産記録を登録できる
2. **`disposal` 区分の生産記録は `inventory_movements` を生成しない**（在庫に入らない）
3. **差分計算には `disposal` 区分も含める**（§T3-2）。
   含めないと、廃棄分がそのまま差分として誤検知される
4. 在庫一覧には `stock` 区分のみを表示する
5. 出荷で選択できるのは `stock` 区分のみ
6. 廃棄量の集計（期間別・区分別）を xlsx と画面に出す

**★ 差分計算との関係（最重要）**

持ち込み 100kg を 鉄60 / 銅30 / 廃棄10 に分類した場合:

```
先方申告        100.0 kg
自社実測合計    100.0 kg  ← 鉄60 + 銅30 + 廃棄10（廃棄を含める）
差分              0.0 kg  ← 正しい
```

廃棄を差分計算から除外すると実測合計が 90.0 kg となり、
**差分 −10kg として誤ったアラートが出る。** 必ず全区分を合算すること。
一方で在庫は 鉄60 / 銅30 のみが増える。**差分計算と在庫計上で対象範囲が異なる点に注意。**

### 4.5 出荷

```ruby
create_table :shipments do |t|
  t.references :company, null: false, foreign_key: true   # buyer: true の会社
  t.datetime :shipped_at, null: false
  t.string   :slip_no
  t.text     :note
  t.datetime :deleted_at
  t.timestamps
end

create_table :shipment_items do |t|
  t.references :shipment, null: false, foreign_key: true
  t.references :material, null: false, foreign_key: true
  t.decimal  :quantity_kg, precision: 12, scale: 2, null: false
  t.timestamps
end
```

- 1回の出荷で複数マテリアルを出せる
- `shipment_items` 1件につき `shipment_out` の在庫移動を1件生成する
- 出荷先は `companies.buyer = true` の会社のみ選択可能とする

**在庫がマイナスになる場合の扱い**

- 登録は**許可する**が、**警告を表示**する
- 期首在庫の登録漏れや記録漏れで一時的にマイナスになりうるため、ブロックしない
- マイナス在庫のマテリアルは在庫一覧で強調表示する

---

## 5. タスク一覧

T1 と T2 は独立。T3 → T4 の順序は固定（在庫の入庫が先）。

| # | 内容 | 依存 |
|---|---|---|
| T1 | xlsx エクスポート | なし |
| T2 | 編集制限と監査ログ | なし |
| T3 | 買取伝票と差分記録 | なし |
| T4 | 在庫管理と出荷 | T3 |
| T5 | 期首在庫と調整 | T4 |
| T6 | メール通知 | T1 |

---

### T1: xlsx エクスポート

#### T1-1. gem

```ruby
gem "caxlsx"
gem "caxlsx_rails"
```

#### T1-2. エンドポイント

```
GET /api/v1/production_records.xlsx
```

クエリパラメータ（すべて任意）: `from` / `to` / `material_id` / `worker_id` / `company_id`

```ruby
def index
  @records = ProductionRecord
               .includes(:material, :worker, purchase_slip: :company)
               .filtered(filter_params)
               .order(recorded_at: :desc)

  respond_to do |format|
    format.json { render json: ProductionRecordResource.collection(@records) }
    format.xlsx do
      response.headers["Content-Disposition"] =
        ActionDispatch::Http::ContentDisposition.format(
          disposition: "attachment", filename: export_filename
        )
    end
  end
end
```

- **`includes` を必ず付けること。** N+1 が起きると1万行のエクスポートが実用に耐えない
- ファイル名は `ActionDispatch::Http::ContentDisposition.format` を通すこと。
  日本語を含むため、手書きの `"attachment; filename=..."` では文字化けする
- ファイル名規約: `生産記録_20260801-20260821.xlsx`

#### T1-3. テンプレート

`app/views/api/v1/production_records/index.xlsx.axlsx`

| シート | 内容 |
|---|---|
| 生産記録 | 明細 |
| 品目別集計 | マテリアル別の合計重量・件数 |
| 作業者別集計 | 作業者別の合計重量・件数 |

「生産記録」シートの列:

| 列 | ヘッダ | 型 | 書式 |
|---|---|---|---|
| A | 記録日時 | 日付 | `yyyy/mm/dd hh:mm` |
| B | マテリアル | 文字列 | — |
| C | 作業者 | 文字列 | — |
| D | 持込元 | 文字列 | — |
| E | 実測kg | 数値 | `#,##0.0` |

書式要件:

- 1行目ヘッダを固定（`sheet.sheet_view.pane`）+ オートフィルタ
- 最終行に合計行。**値の直書きではなく `=SUM(E2:En)` の数式**を入れる
- 列幅を内容に合わせて設定

**★ タイムゾーンの注意（必須）**

caxlsx は Time を Excel のシリアル値へ変換する際、UTC のままシリアル化して9時間ズレる事故が起きやすい。
`recorded_at` は明示的にローカル時刻へ変換してから渡し、
**生成した xlsx を読み戻して日時が JST であることをテストで検証すること。**

#### T1-4. CORS

§3.1 のとおり。`expose: ["Content-Disposition"]` を忘れないこと。

#### T1-5. Next.js のダウンロード処理

**`<a href>` でのダウンロードは実装しないこと。**

```ts
export async function downloadProductionRecordsXlsx(params: URLSearchParams) {
  const res = await fetch(
    `${API_BASE}/api/v1/production_records.xlsx?${params}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("エクスポートに失敗しました");

  const blob = await res.blob();
  const filename =
    parseContentDisposition(res.headers.get("Content-Disposition")) ??
    "production_records.xlsx";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

`parseContentDisposition` は **`filename*=UTF-8''...`（RFC 5987 形式）を優先**して解釈し、
`decodeURIComponent` を通すこと。`filename=` のみを見る実装では日本語が化ける。

UI: ダウンロード中はボタンを非活性化。失敗時はトースト表示。
レスポンスの `Content-Type` を見て JSON エラーと Blob を分岐すること。

#### T1-6. 受け入れ基準

- [ ] 絞り込み条件が反映される
- [ ] 生成した xlsx を読み戻すと記録日時が JST として解釈される
- [ ] 実測kg のセルが数値型である
- [ ] 合計行が数式として入っており Excel 上で再計算される
- [ ] 日本語ファイル名でダウンロードされる
- [ ] 1,000件のエクスポートで N+1 が発生しない
- [ ] 未認証時に `401` が返る

---

### T2: 編集制限と監査ログ

#### T2-1. 業務日ロジック

§3.4 の `BusinessDay` を追加する。

```ruby
# app/models/production_record.rb
def business_date
  BusinessDay.from(recorded_at)
end

def editable_by?(user)
  return true if user.admin?
  business_date == BusinessDay.current
end
```

#### T2-2. サーバ側の権限チェック

**UI の非活性化のみに依存してはならない。** 3層で防御する。

1. コントローラ: 更新・削除の前に `editable_by?` を検証し `403`
2. モデル: `before_update` / `before_destroy` で検証
3. Next.js: ボタンの非活性化（UX のため）

```json
{ "errors": [ { "field": null, "message": "前日以前の記録は編集できません。管理者へ修正を依頼してください。" } ] }
```

#### T2-3. `editable` フラグ

**Next.js 側で日付判定を行わせないこと。** レスポンスにサーバの判定結果を含める。

```json
{ "id": 1043, "recorded_at": "2026-08-21T14:32:00+09:00", "actual_kg": 22.0, "editable": true }
```

#### T2-4. `?period=today`

```
GET /api/v1/production_records?period=today
```

サーバ側で `BusinessDay.current` から範囲を決定する。

#### T2-5. 監査ログ

`paper_trail` を導入する。自前実装は不可。

- 対象: `ProductionRecord` / `PurchaseSlip` / `Shipment` / `InventoryMovement`
- `paranoia` と併用するため、`destroy` が `update` として記録されることを確認すること
- 管理者向けの参照 API: `GET /api/v1/production_records/:id/versions`

**締め後の編集は、管理者が直接行う。** 申請・承認フローは実装しないこと（§9-2）。

#### T2-6. 受け入れ基準

- [ ] 一般ユーザーが当日の記録を編集できる
- [ ] 一般ユーザーが前日の記録を編集しようとすると `403`
- [ ] 管理者は前日以前の記録を編集できる
- [ ] `BUSINESS_DAY_CUTOFF_HOUR=3` を設定すると 02:00 時点で前日扱いになる
- [ ] `Time.now` / `Date.today` がコードベースに存在しない
- [ ] 編集操作が `versions` に記録される
- [ ] 一覧 API のレスポンスに `editable` が含まれる

---

### T3: 買取伝票と差分記録

#### T3-1. テーブル

§4.1 / §4.2 のとおり。

#### T3-2. 差分の算出

**差分値をカラムに保存してはならない。** 生産記録の修正時に更新漏れが起き、必ず不整合になる。

```ruby
# app/models/purchase_slip.rb

# 廃棄区分を含む全ての生産記録を合算する（§4.4）
def actual_total_kg
  production_records.sum(:actual_kg)
end

def variance_kg
  return nil if declared_total_kg.nil?
  actual_total_kg - declared_total_kg
end

def variance_rate
  return nil if declared_total_kg.nil? || declared_total_kg.zero?
  (variance_kg / declared_total_kg * 100).round(2)
end
```

**★ `actual_total_kg` から `disposal` 区分を除外してはならない。**
除外すると廃棄分がそのまま差分として誤検知される。
在庫計上の対象は `stock` 区分のみだが、**差分計算の対象は全区分**である。
この2つを混同しないこと。

- **符号**: プラス = 先方の申告が過小（自社実測の方が重い）
- 差分は**必ず伝票単位の合計**で比較する。梱包単位で按分しない
- `declared_total_kg` が NULL のとき、差分系の値はすべて `null` を返す。**`0` を返さないこと**
- 一覧では N+1 を避けるため集計クエリまたは DB ビューを使うこと

#### T3-3. API

```
GET    /api/v1/purchase_slips
POST   /api/v1/purchase_slips
GET    /api/v1/purchase_slips/:id
PATCH  /api/v1/purchase_slips/:id
GET    /api/v1/companies/:id/variances
```

```json
{
  "id": 1043,
  "slip_no": "A-1043",
  "company": { "id": 7, "name": "〇〇株式会社" },
  "contact": { "id": 12, "name": "山田" },
  "received_at": "2026-08-21T09:15:00+09:00",
  "declared_total_kg": 63.5,
  "actual_total_kg": 65.7,
  "variance_kg": 2.2,
  "variance_rate": 3.46,
  "variance_alert": true,
  "material_subtotals": [
    { "material": { "id": 3, "name": "鉄スクラップ" }, "quantity_kg": 60.5, "count": 3 },
    { "material": { "id": 8, "name": "銅線" }, "quantity_kg": 5.2, "count": 1 }
  ],
  "production_records": [ ... ],
  "editable": true
}
```

**`material_subtotals` は必須。** 同一カテゴリが複数梱包で持ち込まれるため、
その場で合算した値を見せることが要件（確認事項E）。

#### T3-4. 差分アラート

- 閾値は設定値（既定 3.0%）
- `variance_rate` の**絶対値**が閾値を超えたとき `variance_alert: true`

**★ 表示文言の制約（重要）**

差分アラートの文言は、**システムが取引先の意図を断定する表現にしないこと。**
計量器の精度差、水分量、付着物でも差分は発生する。

- 実装してよい: 「差分率が閾値を超えています」「直近5回中4回で同方向の差分が出ています」
- 実装してはならない: 「過少申告の疑いがあります」「不正の可能性」など意図を断定する表現

事実の提示に留め、判断は人に委ねる。取引先との関係に直結するため厳守すること。

#### T3-5. 伝票写真

`has_one_attached :slip_image`。JPEG / PNG / HEIC / PDF、上限 10MB。
サムネイル生成は行わない。

#### T3-6. 生産記録の登録フォーム

**現場が毎日触る唯一の画面。最も作り込みが必要。**

- 買取伝票の選択は**任意**（未選択を許容）
- 直近の伝票を候補として提示する
- 伝票の新規作成も同じ画面から行える
- **入力中の伝票について、マテリアル別の小計と総合計をリアルタイム表示する**（確認事項E）
- 先方申告値が入力済みなら、差分もリアルタイムに表示する
- 連続登録を想定し、登録後はマテリアルと伝票の選択を保持したままフォームをクリアする
- スマートフォン入力を前提とし、タップ領域を大きく取る。数値入力は `inputmode="decimal"`

#### T3-7. 受け入れ基準

- [ ] 伝票を作成せずに生産記録を登録できる
- [ ] `declared_total_kg` を空欄のまま伝票を作成できる
- [ ] `declared_total_kg` が NULL のとき差分系の値がすべて `null` で返る
- [ ] 1つの伝票に複数の生産記録を紐づけられる
- [ ] 同一マテリアルの複数梱包が `material_subtotals` で合算される
- [ ] 紐づく生産記録を編集すると差分が自動的に再計算される
- [ ] 差分率の絶対値が閾値を超えると `variance_alert: true`
- [ ] `disposal` 区分の生産記録が `actual_total_kg` に含まれる
- [ ] 鉄60 / 銅30 / 廃棄10 を登録したとき、先方申告100kg に対する差分が 0 になる
- [ ] 伝票一覧で N+1 が発生しない

---

### T4: 在庫管理と出荷

#### T4-1. テーブル

§4.3 / §4.5 のとおり。

#### T4-2. サービスオブジェクト

在庫移動の生成はすべてサービスオブジェクトに集約する。
**モデルのコールバックに書かないこと。**

```
app/services/inventory/record_purchase.rb    生産記録 → purchase_in
app/services/inventory/record_shipment.rb    出荷     → shipment_out
app/services/inventory/reverse.rb            打ち消し（逆符号の adjustment）
```

- 生産記録・出荷の作成/更新/削除と在庫移動は**同一トランザクション**
- 削除時は在庫移動を物理削除せず、逆符号の `adjustment` で打ち消す
- 更新時は「打ち消し + 再登録」とし、既存行を書き換えない（履歴を残すため）

#### T4-3. 在庫 API

```
GET /api/v1/inventories                    マテリアル別の現在庫
GET /api/v1/inventories/:material_id/movements   在庫移動の履歴
```

```json
{
  "as_of": "2026-08-21T23:59:59+09:00",
  "data": [
    {
      "material": { "id": 3, "name": "鉄スクラップ" },
      "opening_kg": 1200.0,
      "purchase_in_kg": 842.3,
      "shipment_out_kg": -520.0,
      "adjustment_kg": 0.0,
      "stock_kg": 1522.3,
      "negative": false
    }
  ]
}
```

- `as_of` パラメータで任意時点の在庫を取得できるようにする
- `stock_kg` が負のとき `negative: true` とし、フロントで強調表示する

#### T4-4. 出荷 API

```
GET    /api/v1/shipments
POST   /api/v1/shipments
GET    /api/v1/shipments/:id
PATCH  /api/v1/shipments/:id
DELETE /api/v1/shipments/:id
```

- 出荷先は `companies.buyer = true` の会社のみ選択可能
- 1回の出荷で複数マテリアルを指定できる
- 在庫がマイナスになる場合も**登録は許可し、警告を返す**

```json
{ "warnings": [ { "message": "鉄スクラップの在庫がマイナスになります（-12.5kg）" } ] }
```

#### T4-5. 受け入れ基準

- [ ] 生産記録を登録すると `purchase_in` の在庫移動が生成される
- [ ] **`disposal` 区分の生産記録では在庫移動が生成されない**
- [ ] 在庫一覧に `disposal` 区分のマテリアルが表示されない
- [ ] 出荷のマテリアル選択肢に `disposal` 区分が出ない
- [ ] 生産記録を削除すると逆符号の `adjustment` で打ち消される（物理削除されない）
- [ ] 生産記録を更新すると打ち消し + 再登録が行われ、履歴が残る
- [ ] 出荷を登録すると `shipment_out` が生成され、在庫が減る
- [ ] 同一マテリアルの複数の生産記録が在庫一覧で合算される
- [ ] 在庫がマイナスになる出荷を登録でき、警告が返る
- [ ] `as_of` で過去時点の在庫を取得できる
- [ ] 在庫移動の生成が失敗したとき、生産記録も保存されない（トランザクション）

---

### T5: 期首在庫と調整

#### T5-1. 期首在庫の一括登録

リリース時点で、システム外に存在する在庫を登録する必要がある。

```
POST /api/v1/inventory_movements/import
```

- 管理者のみ実行可能
- xlsx / CSV をアップロードする。列: `マテリアル名` / `重量kg` / `備考`
- **取り込み前にプレビューを返す**（未登録マテリアルの検出、合計の確認）
- 確定操作で `opening` の在庫移動を一括生成する
- `occurred_at` は運用開始基準日を指定する
- **`opening` の登録は原則1回。**2回目以降は警告を返す（ブロックはしない）

#### T5-2. 手動調整

システム上の在庫が実態より多い場合・少ない場合の両方が発生しうる。

```
POST /api/v1/inventory_movements
```

- 管理者のみ実行可能
- `movement_type: "adjustment"`、`quantity_kg` は**正負どちらも受け付ける**
- `note` を**必須**とする。理由の記録がない調整は許可しない
- 誤登録の訂正は逆符号の `adjustment` で行う。物理削除は不可

#### T5-3. 受け入れ基準

- [ ] xlsx をアップロードするとプレビューが返り、確定操作で `opening` が生成される
- [ ] 未登録のマテリアル名を含むファイルは、確定前にエラーとして検出される
- [ ] 一般ユーザーは期首在庫の登録も手動調整もできない（`403`）
- [ ] `adjustment` で正負どちらの調整も登録できる
- [ ] `note` が空の `adjustment` は `422` で拒否される
- [ ] 2回目の `opening` 登録で警告が返る

---

### T6: メール通知

#### T6-1. 方式の決定理由（変更しないこと）

LINE Messaging API は**通数が「送信人数 × メッセージ数」でカウント**され、
無料プランは月200通、ライトプランは月額5,000円で月5,000通。

想定件数（1日28件 × 受信者3人 = 月約2,520通）では、
**都度通知を LINE で行うと無料枠を大幅に超過し、ライトプランでも上限に近い。**

したがって以下とする。

| 用途 | 手段 | 頻度 |
|---|---|---|
| 日次サマリ | **メール**（xlsx 添付） | 1日1回 |
| 差分アラート | **メール** | 発生時 |
| （将来）緊急通知 | LINE Messaging API | 異常時のみ |

**今回のスコープはメールのみ。LINE は実装しないこと。**

#### T6-2. 日次サマリメール

- ActiveJob + Sidekiq の定期実行（`sidekiq-cron` 等）
- 送信時刻は設定可能とする（既定 18:00 JST）
- 本文: 当日の登録件数、マテリアル別の合計重量、差分アラートの件数
- **添付: T1 で生成する xlsx をそのまま流用する。** 生成ロジックを二重に書かないこと
- 宛先は設定画面から変更できるようにする

#### T6-3. 差分アラートメール

- `variance_alert` が true になった伝票について、その場で送信する
- **送信失敗が伝票の保存を失敗させてはならない。** `after_commit` で ActiveJob に積む
- 冪等とすること（同一伝票で二重送信しない）
- `notification_logs` に送信結果を保存し、失敗時は指数バックオフで最大3回再試行する

#### T6-4. 受け入れ基準

- [ ] 日次サマリメールに xlsx が添付され、Excel で開ける
- [ ] メール送信が失敗しても伝票の保存は成功する
- [ ] 同一伝票のアラートが二重送信されない
- [ ] 送信結果が `notification_logs` に記録される
- [ ] 宛先を設定画面から変更できる

---

## 6. 画面仕様

| 画面 | 内容 |
|---|---|
| 生産記録 一覧 | 絞り込み、Excel出力、編集ロック表示 |
| 生産記録 登録フォーム | §T3-6。**最重要画面** |
| 買取伝票 詳細 | 先方申告 / 自社実測 / 差分、マテリアル別小計、内訳 |
| 在庫一覧 | マテリアル別の現在庫。期首・入庫・出庫・調整の内訳。マイナス在庫を強調 |
| 出荷 登録 | 売却先、出荷日、マテリアルごとの数量。在庫マイナス時に警告 |
| 期首在庫 取り込み | ファイルアップロード → プレビュー → 確定 |

ワイヤーフレームは別添を参照。

---

## 7. 非機能要件

| 項目 | 基準 |
|---|---|
| 一覧 API のレスポンス | 500ms 以内 |
| xlsx エクスポート（1万行） | 10秒以内 |
| N+1 クエリ | 発生させない。`bullet` を development に導入して検証 |
| テスト | 新規追加したモデル・サービス・コントローラを網羅 |

---

## 8. 実装しないこと（再掲）

- 残渣・不要物の記録（§9-1 の確定待ち）
- 締め後の編集申請・承認フロー（§9-2）
- 実地棚卸の機能（`adjustment` の手動調整のみ）
- 加工の変換に伴う出庫（`production_out`）
- 在庫の日次スナップショット
- LINE 通知
- AI 異常検知の統計・傾向分析（ルールベースのみ）
- `config.api_only = true` への切り替え
- 既存 ERB 画面の削除

---

## 9. 残る確認事項

### 9-1. 廃棄の扱い（確定済み）

マテリアルに `category`（`stock` / `disposal`）を持たせ、廃棄を区分のひとつとして扱う。
詳細は §4.4 を参照。**差分計算には含め、在庫計上からは除外する。**

### 9-2. 締め後の編集フロー（今回は実装しない）

「許可をもらって編集を許可したい」という要望があるが、仕様が固まっていない。
申請・承認フローは独立した機能であり、実装量は T2 の2倍以上になる。

**今回は管理者が直接編集し、`paper_trail` に記録する方式で運用する。**
実際に運用してみて、申請フローが本当に必要か判断してから着手すること。

### 9-3. 実地棚卸（今回は実装しない）

実施の有無が不明なため、`adjustment` による手動調整のみ実装する。
棚卸のワークフロー（カウント入力 → 差異一覧 → 一括調整）が必要になった場合は、
`adjustment` の上に載せる形で後から追加できる。設計変更は不要。
