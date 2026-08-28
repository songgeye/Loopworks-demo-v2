"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui";
import { ApiError, fetchShipments } from "@/lib/backend-api";
import type { ShipmentSummary } from "@/lib/backend-types";
import { formatNumber } from "@/lib/format";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; shipments: ShipmentSummary[] };

export default function ShipmentsPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchShipments()
      .then((shipments) => {
        if (!cancelled) setState({ status: "ready", shipments });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : "出荷一覧の取得に失敗しました";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        {state.status === "loading" ? (
          <EmptyState message="読み込み中..." />
        ) : state.status === "error" ? (
          <div className="flex items-center gap-3 px-6 py-8 text-danger sm:px-7">
            <TriangleAlert size={20} aria-hidden />
            <p>{state.message}</p>
          </div>
        ) : state.shipments.length === 0 ? (
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
                {state.shipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-line-soft last:border-0">
                    <td className="px-6 py-3 align-top sm:px-7">
                      {new Date(shipment.shipped_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 align-top font-bold">{shipment.company.name}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {shipment.items.map((item) => (
                          <span
                            key={item.material.id}
                            className="tnum inline-flex items-center gap-1 rounded-full border border-line bg-card-2 px-2.5 py-1 text-xs"
                          >
                            {item.material.name}
                            <span className="font-bold text-accent">
                              {formatNumber(item.quantity_kg)}kg
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-fg-muted">{shipment.slip_no ?? "-"}</td>
                    <td className="tnum px-6 py-3 text-right align-top text-accent sm:px-7">
                      {formatNumber(shipment.total_quantity_kg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
