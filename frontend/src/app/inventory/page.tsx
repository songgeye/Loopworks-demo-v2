"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState, StatCard } from "@/components/ui";
import { Field, TextInput } from "@/components/form-controls";
import { ApiError, fetchInventories } from "@/lib/backend-api";
import type { InventoryRow } from "@/lib/backend-types";
import { formatNumber } from "@/lib/format";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; asOf: string; rows: InventoryRow[] };

export default function InventoryPage() {
  const [asOfInput, setAsOfInput] = useState("");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetchInventories(asOfInput || undefined)
      .then((res) => {
        if (cancelled) return;
        setState({ status: "ready", asOf: res.as_of, rows: res.data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError ? error.message : "在庫の取得に失敗しました";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfInput]);

  return (
    <>
      <PageHeader label="在庫管理" title="在庫一覧">
        <Link
          href="/shipments/new"
          className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-ink transition-colors hover:bg-accent-soft"
        >
          出荷を登録
        </Link>
      </PageHeader>

      {state.status === "ready" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="在庫の累計重量（全マテリアル合計）"
            value={state.rows.reduce((sum, row) => sum + row.stock_kg, 0)}
            unit="kg"
            highlight
          />
          <StatCard
            label="マイナス在庫のマテリアル数"
            value={state.rows.filter((row) => row.negative).length}
            unit="件"
          />
        </div>
      ) : null}

      <section className="lw-card px-6 py-5 sm:px-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="時点を指定（任意）" hint="空欄なら現時点の在庫を表示します">
            <TextInput
              type="datetime-local"
              value={asOfInput}
              onChange={(e) => setAsOfInput(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="lw-card overflow-hidden">
        {state.status === "loading" ? (
          <EmptyState message="読み込み中..." />
        ) : state.status === "error" ? (
          <div className="flex items-center gap-3 px-6 py-8 text-danger sm:px-7">
            <TriangleAlert size={20} aria-hidden />
            <p>{state.message}</p>
          </div>
        ) : state.rows.length === 0 ? (
          <EmptyState message="在庫区分(stock)のマテリアルがありません。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-line-soft text-sm text-fg-muted">
                  <th className="px-6 py-3 sm:px-7">マテリアル</th>
                  <th className="px-4 py-3 text-right">期首</th>
                  <th className="px-4 py-3 text-right">入庫</th>
                  <th className="px-4 py-3 text-right">出庫</th>
                  <th className="px-4 py-3 text-right">調整</th>
                  <th className="px-4 py-3 text-right">廃棄</th>
                  <th className="px-6 py-3 text-right sm:px-7">現在庫(kg)</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row) => (
                  <tr
                    key={row.material.id}
                    className={`border-b border-line-soft last:border-0 ${
                      row.negative ? "bg-danger/[0.08]" : ""
                    }`}
                  >
                    <td className="px-6 py-3 font-bold sm:px-7">{row.material.name}</td>
                    <td className="tnum px-4 py-3 text-right text-fg-muted">
                      {formatNumber(row.opening_kg)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-fg-muted">
                      {formatNumber(row.purchase_in_kg)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-fg-muted">
                      {formatNumber(row.shipment_out_kg)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-fg-muted">
                      {formatNumber(row.adjustment_kg)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-fg-muted">
                      {formatNumber(row.disposal_out_kg)}
                    </td>
                    <td
                      className={`tnum px-6 py-3 text-right text-xl font-bold sm:px-7 ${
                        row.negative ? "text-danger" : "text-accent"
                      }`}
                    >
                      {row.negative ? (
                        <span className="mr-2 inline-flex items-center gap-1 text-xs font-bold">
                          <TriangleAlert size={14} aria-hidden />
                          マイナス
                        </span>
                      ) : null}
                      {formatNumber(row.stock_kg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {state.status === "ready" ? (
        <p className="px-2 text-sm text-fg-faint">
          {new Date(state.asOf).toLocaleString("ja-JP")} 時点
        </p>
      ) : null}
    </>
  );
}
