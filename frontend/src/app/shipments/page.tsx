"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui";
import { getShipments } from "@/lib/api";
import { formatNumber } from "@/lib/format";

export default function ShipmentsPage() {
  const shipments = getShipments();

  return (
    <>
      <PageHeader label="在庫管理" title="出荷">
        <Link
          href="/shipments/new"
          className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-ink transition-colors hover:bg-accent-soft"
        >
          <Plus size={20} strokeWidth={3} aria-hidden />
          出荷を登録
        </Link>
      </PageHeader>

      <section className="lw-card overflow-hidden">
        {shipments.length === 0 ? (
          <EmptyState message="出荷の記録がありません。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-line-soft text-sm text-fg-muted">
                  <th className="px-6 py-3 sm:px-7">出荷日</th>
                  <th className="px-4 py-3">売却先</th>
                  <th className="px-4 py-3">品目別の内訳</th>
                  <th className="px-4 py-3">伝票番号</th>
                  <th className="px-6 py-3 text-right sm:px-7">合計(kg)</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-line-soft last:border-0">
                    <td className="px-6 py-3 align-top sm:px-7">
                      {new Date(shipment.shippedAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 align-top font-bold">{shipment.companyName}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {shipment.items.map((item) => (
                          <span
                            key={item.materialId}
                            className="tnum inline-flex items-center gap-1 rounded-full border border-line bg-card-2 px-2.5 py-1 text-xs"
                          >
                            {item.materialName}
                            <span className="font-bold text-accent">
                              {formatNumber(item.quantityKg)}kg
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-fg-muted">{shipment.slipNo ?? "-"}</td>
                    <td className="tnum px-6 py-3 text-right align-top text-accent sm:px-7">
                      {formatNumber(shipment.totalQuantityKg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="px-2 text-sm text-fg-faint">
        ※ プロトタイプ表示のため、ここでの登録は同一ブラウザのセッション中のみ一覧に反映されます（ページを再読み込みすると初期データに戻ります）。
      </p>
    </>
  );
}
