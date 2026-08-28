"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { ApiError, fetchSupplierCompaniesByReceivedWeight } from "@/lib/backend-api";
import type { ApiCompany } from "@/lib/backend-types";
import { formatNumber } from "@/lib/format";
import { EmptyState, SectionCard } from "./ui";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; companies: ApiCompany[] };

/** 取引先（持込元）ごとの累計受入重量（全期間）をランキング表示する */
export function CompanyIntakeCard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchSupplierCompaniesByReceivedWeight()
      .then((companies) => {
        if (!cancelled) setState({ status: "ready", companies });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError ? error.message : "取引先データの取得に失敗しました";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const maxKg =
    state.status === "ready"
      ? Math.max(...state.companies.map((c) => c.total_received_kg ?? 0), 1)
      : 1;

  return (
    <SectionCard title="持込元別の累計受入重量（全期間）" flush>
      {state.status === "loading" ? (
        <EmptyState message="読み込み中..." />
      ) : state.status === "error" ? (
        <div className="flex items-center gap-3 px-6 py-6 text-danger sm:px-7">
          <TriangleAlert size={20} aria-hidden />
          <p>{state.message}</p>
        </div>
      ) : state.companies.length === 0 ? (
        <EmptyState message="持込元の登録がありません。" />
      ) : (
        <ul className="border-t border-line-soft">
          {state.companies.map((company) => (
            <li
              key={company.id}
              className="border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="truncate text-lg font-bold">{company.name}</p>
                <p className="shrink-0">
                  <span className="tnum text-xl font-bold text-accent">
                    {formatNumber(company.total_received_kg ?? 0)}
                  </span>
                  <span className="ml-1 text-sm text-fg-muted">kg</span>
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-card-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${((company.total_received_kg ?? 0) / maxKg) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
