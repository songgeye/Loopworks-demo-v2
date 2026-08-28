import { getCompanyTotals } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { EmptyState, SectionCard } from "./ui";

/** 取引先（持込元）ごとの累計受入重量（全期間）をランキング表示する */
export function CompanyIntakeCard() {
  const companyTotals = getCompanyTotals();

  return (
    <SectionCard title="持込元別の累計受入重量（全期間）" flush>
      {companyTotals.length === 0 ? (
        <EmptyState message="持込元の登録がありません。" />
      ) : (
        <ul className="border-t border-line-soft xl:columns-2 xl:gap-x-6">
          {companyTotals.map((company) => (
            <li
              key={company.companyId}
              className="border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7 xl:break-inside-avoid"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="truncate text-lg font-bold">{company.companyName}</p>
                <p className="shrink-0">
                  <span className="tnum text-xl font-bold text-accent">
                    {formatNumber(company.totalKg)}
                  </span>
                  <span className="ml-1 text-sm text-fg-muted">kg</span>
                  <span className="ml-3 text-sm text-fg-faint">{company.count}件</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
