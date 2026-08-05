import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { getMaterialTotals, getStaffTotals, TODAY } from "@/lib/api";
import { formatDateWithWeekday, formatNumber } from "@/lib/format";

type SearchParams = Promise<{ date?: string }>;

/**
 * 出荷サマリーの印刷用ビュー。
 * 紙に出すことが前提なので、画面上でも白い用紙として見せる。
 */
export default async function PrintSummaryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { date = TODAY } = await searchParams;
  const totals = getMaterialTotals({ from: date, to: date }).filter((t) => t.count > 0);
  const staffTotals = getStaffTotals({ from: date, to: date }).filter((t) => t.count > 0);
  const totalKg = totals.reduce((sum, t) => sum + t.totalKg, 0);
  const totalCount = totals.reduce((sum, t) => sum + t.count, 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/summary"
          className="flex h-12 items-center rounded-xl border border-line bg-card-2 px-5 text-base font-bold transition-colors hover:border-accent/50"
        >
          集計へ戻る
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-card bg-white p-8 text-black print:rounded-none print:p-0">
        <header className="flex items-end justify-between border-b-2 border-black pb-3">
          <div>
            <p className="text-sm">Loopworks 出荷サマリー</p>
            <h1 className="mt-1 text-2xl font-bold">{formatDateWithWeekday(date)}</h1>
          </div>
          <p className="text-right text-sm">
            記録件数 {totalCount} 件
            <br />
            合計 <span className="tnum text-lg font-bold">{formatNumber(totalKg)}</span> kg
          </p>
        </header>

        <h2 className="mt-6 mb-2 text-lg font-bold">品目別合計</h2>
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-black text-left">
              <th scope="col" className="py-2 font-bold">
                品目
              </th>
              <th scope="col" className="py-2 text-right font-bold">
                件数
              </th>
              <th scope="col" className="py-2 text-right font-bold">
                重量 (kg)
              </th>
            </tr>
          </thead>
          <tbody>
            {totals.map((total) => (
              <tr key={total.materialId} className="border-b border-neutral-300">
                <th scope="row" className="py-2 text-left font-normal">
                  {total.materialName}
                </th>
                <td className="tnum py-2 text-right">{total.count}</td>
                <td className="tnum py-2 text-right font-bold">
                  {formatNumber(total.totalKg)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <th scope="row" className="py-2 text-left font-bold">
                合計
              </th>
              <td className="tnum py-2 text-right font-bold">{totalCount}</td>
              <td className="tnum py-2 text-right font-bold">{formatNumber(totalKg)}</td>
            </tr>
          </tfoot>
        </table>

        <h2 className="mt-6 mb-2 text-lg font-bold">作業者別合計</h2>
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-black text-left">
              <th scope="col" className="py-2 font-bold">
                作業者
              </th>
              <th scope="col" className="py-2 text-right font-bold">
                件数
              </th>
              <th scope="col" className="py-2 text-right font-bold">
                重量 (kg)
              </th>
            </tr>
          </thead>
          <tbody>
            {staffTotals.map((total) => (
              <tr key={total.staffId} className="border-b border-neutral-300">
                <th scope="row" className="py-2 text-left font-normal">
                  {total.staffName}
                </th>
                <td className="tnum py-2 text-right">{total.count}</td>
                <td className="tnum py-2 text-right font-bold">
                  {formatNumber(total.totalKg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-8 flex justify-between border-t border-neutral-300 pt-3 text-sm">
          <span>確認者　　　　　　　　　　</span>
          <span>印</span>
        </footer>
      </article>
    </>
  );
}
