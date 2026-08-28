import { LogOut } from "lucide-react";
import { Button } from "@/components/form-controls";
import { PageHeader } from "@/components/page-header";
import { Badge, SectionCard } from "@/components/ui";
import { getMaterials, getRecords, getStaffs } from "@/lib/api";
import { formatNumber } from "@/lib/format";

export default function SettingsPage() {
  const records = getRecords();
  const admin = getStaffs().find((staff) => staff.role === "admin");

  const stats = [
    { label: "登録済みの生産記録", value: `${formatNumber(records.length)} 件` },
    { label: "品目マスタ", value: `${getMaterials().length} 件` },
    { label: "作業者マスタ", value: `${getStaffs().length} 名` },
  ];

  return (
    <>
      <PageHeader label="加工記録管理" title="設定" hideSearch />

      <SectionCard title="ログイン中のアカウント">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold">
              {admin?.name ?? "未ログイン"}
              {admin ? <Badge tone="accent">管理者</Badge> : null}
            </p>
            <p className="mt-1 font-mono text-sm text-fg-muted">{admin?.username}</p>
          </div>
          <Button variant="secondary" className="sm:w-40">
            <LogOut size={18} aria-hidden />
            ログアウト
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="CSV出力の文字コード">
        <fieldset>
          <legend className="sr-only">CSV出力の文字コード</legend>
          <div className="flex flex-col gap-3 sm:flex-row">
            {[
              { value: "utf8", label: "UTF-8（BOM付き）", hint: "Excel・Googleスプレッドシート向け" },
              { value: "sjis", label: "Shift-JIS", hint: "既存の社内ツール向け" },
            ].map((option, index) => (
              <label
                key={option.value}
                className="flex flex-1 cursor-pointer items-start gap-3 rounded-xl border border-line bg-card-2 px-4 py-3 has-checked:border-accent/60"
              >
                <input
                  type="radio"
                  name="csv-encoding"
                  value={option.value}
                  defaultChecked={index === 0}
                  className="mt-1 size-4 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="block text-base font-bold">{option.label}</span>
                  <span className="block text-sm text-fg-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </SectionCard>

      <SectionCard title="AIチェック">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-base font-bold">異常値の確認ダイアログ</p>
            <p className="mt-1 text-sm text-fg-muted">
              直近5日間の同品目の平均から大きく外れた重量が入力されたとき、保存前に確認を促します。入力をブロックすることはありません。
            </p>
          </div>
          <Badge tone="accent">稼働中</Badge>
        </div>
      </SectionCard>

      <SectionCard title="データの状況" flush>
        <dl className="border-t border-line-soft">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between gap-4 border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7"
            >
              <dt className="text-base text-fg-muted">{stat.label}</dt>
              <dd className="tnum text-base font-bold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <p className="px-2 text-sm text-fg-faint">
        ※ 設定の保存は Rails 側の API 接続後に対応します。
      </p>
    </>
  );
}
