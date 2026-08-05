import Link from "next/link";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard, StatCard } from "@/components/ui";
import {
  currentMonth,
  getMonthlyTotals,
  getStaffTotals,
  previousMonth,
} from "@/lib/api";
import { formatDelta, formatMonthLabel, formatNumber } from "@/lib/format";

export default function SummaryPage() {
  const thisMonth = currentMonth();
  const lastMonth = previousMonth();

  const thisMonthTotals = getMonthlyTotals(thisMonth);
  const lastMonthTotals = getMonthlyTotals(lastMonth);
  const lastMonthByMaterial = new Map(
    lastMonthTotals.map((total) => [total.materialId, total.totalKg]),
  );

  const thisMonthSum = thisMonthTotals.reduce((sum, t) => sum + t.totalKg, 0);
  const lastMonthSum = lastMonthTotals.reduce((sum, t) => sum + t.totalKg, 0);

  const staffTotals = getStaffTotals({
    from: `${thisMonth}-01`,
    to: `${thisMonth}-31`,
  });
  const staffMax = Math.max(...staffTotals.map((t) => t.totalKg), 1);

  return (
    <>
      <PageHeader label="加工記録管理" title="集計">
        <Link
          href="/summary/print"
          className="flex h-12 items-center gap-2 rounded-xl border border-line bg-card-2 px-5 text-base font-bold transition-colors hover:border-accent/50"
        >
          <Printer size={18} aria-hidden />
          出荷サマリー
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={`${formatMonthLabel(thisMonth)}の合計`}
          value={thisMonthSum}
          unit="kg"
          highlight
        />
        <StatCard
          label={`${formatMonthLabel(lastMonth)}の合計`}
          value={lastMonthSum}
          unit="kg"
        />
        <StatCard
          label="前月比"
          value={formatDelta(thisMonthSum, lastMonthSum)}
          unit=""
          highlight={thisMonthSum >= lastMonthSum}
        />
      </div>

      <SectionCard title="品目別の月次比較" flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-125 border-t border-line-soft text-base">
            <thead>
              <tr className="text-left text-sm text-fg-muted">
                <th scope="col" className="px-6 py-3 font-bold sm:px-7">
                  品目
                </th>
                <th scope="col" className="px-4 py-3 text-right font-bold">
                  {formatMonthLabel(thisMonth)}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-bold">
                  {formatMonthLabel(lastMonth)}
                </th>
                <th scope="col" className="px-6 py-3 text-right font-bold sm:px-7">
                  前月比
                </th>
              </tr>
            </thead>
            <tbody>
              {thisMonthTotals.map((total) => {
                const previous = lastMonthByMaterial.get(total.materialId) ?? 0;
                const up = total.totalKg >= previous;
                return (
                  <tr key={total.materialId} className="border-t border-line-soft">
                    <th scope="row" className="px-6 py-4 text-left font-bold sm:px-7">
                      {total.materialName}
                    </th>
                    <td className="tnum px-4 py-4 text-right font-bold text-accent">
                      {formatNumber(total.totalKg)}
                      <span className="ml-1 text-sm font-normal text-fg-muted">kg</span>
                    </td>
                    <td className="tnum px-4 py-4 text-right text-fg-muted">
                      {formatNumber(previous)}
                      <span className="ml-1 text-sm">kg</span>
                    </td>
                    <td
                      className={`tnum px-6 py-4 text-right font-bold sm:px-7 ${
                        up ? "text-accent" : "text-danger"
                      }`}
                    >
                      {formatDelta(total.totalKg, previous)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <th scope="row" className="px-6 py-4 text-left font-bold sm:px-7">
                  合計
                </th>
                <td className="tnum px-4 py-4 text-right font-bold text-accent">
                  {formatNumber(thisMonthSum)}
                  <span className="ml-1 text-sm font-normal text-fg-muted">kg</span>
                </td>
                <td className="tnum px-4 py-4 text-right text-fg-muted">
                  {formatNumber(lastMonthSum)}
                  <span className="ml-1 text-sm">kg</span>
                </td>
                <td className="tnum px-6 py-4 text-right font-bold sm:px-7">
                  {formatDelta(thisMonthSum, lastMonthSum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      <SectionCard title={`作業者別の実績（${formatMonthLabel(thisMonth)}）`} flush>
        <ul className="border-t border-line-soft">
          {staffTotals.map((total) => (
            <li
              key={total.staffId}
              className="border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="truncate text-lg font-bold">{total.staffName}</p>
                <p className="shrink-0">
                  <span className="tnum text-xl font-bold text-accent">
                    {formatNumber(total.totalKg)}
                  </span>
                  <span className="ml-1 text-sm text-fg-muted">kg</span>
                  <span className="ml-3 text-sm text-fg-faint">{total.count}件</span>
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-card-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(total.totalKg / staffMax) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}
