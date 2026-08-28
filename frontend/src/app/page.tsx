import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { CompanyIntakeCard } from "@/components/company-intake-card";
import { PageHeader } from "@/components/page-header";
import { RecordList } from "@/components/record-list";
import { EmptyState, SectionCard, StatCard } from "@/components/ui";
import { getDailySummary, getMaterialTotals, getRecentRecords, TODAY } from "@/lib/api";
import { formatNumber } from "@/lib/format";

export default function HomePage() {
  const summary = getDailySummary();
  const recent = getRecentRecords(4);
  const totals = getMaterialTotals({ from: TODAY, to: TODAY }).filter((t) => t.count > 0);
  const maxKg = Math.max(...totals.map((t) => t.totalKg), 1);

  return (
    <>
      <PageHeader label="加工記録管理" title="ホーム" />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="今日の累計重量" value={summary.totalKg} unit="kg" highlight />
        <StatCard label="今日の記録件数" value={summary.count} unit="件" icon={FileText} />
      </div>

      <Link
        href="/records/new"
        className="lw-glow flex items-center justify-center gap-3 rounded-card bg-accent px-6 py-5 text-xl font-bold text-ink transition-colors hover:bg-accent-soft sm:py-6 sm:text-2xl"
      >
        <Plus size={26} strokeWidth={3} aria-hidden />
        新しい記録を入力
      </Link>

      <SectionCard
        title="最近の記録"
        action={{ href: "/records", label: "すべて見る" }}
        flush
      >
        {recent.length > 0 ? (
          <RecordList records={recent} />
        ) : (
          <EmptyState message="まだ記録がありません。" />
        )}
      </SectionCard>

      <SectionCard title="本日の品目別累計" flush>
        {totals.length > 0 ? (
          <ul className="border-t border-line-soft">
            {totals.map((total) => (
              <li
                key={total.materialId}
                className="border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="truncate text-lg font-bold">{total.materialName}</p>
                  <p className="shrink-0">
                    <span className="tnum text-xl font-bold text-accent">
                      {formatNumber(total.totalKg)}
                    </span>
                    <span className="ml-1 text-sm text-fg-muted">kg</span>
                    <span className="ml-3 text-sm text-fg-faint">{total.count}件</span>
                  </p>
                </div>
                {/* 品目ごとの構成比を横バーで示す */}
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-card-2"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(total.totalKg / maxKg) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="本日の記録はまだありません。" />
        )}
      </SectionCard>

      <CompanyIntakeCard />
    </>
  );
}
