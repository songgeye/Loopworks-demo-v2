"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Plus, TriangleAlert } from "lucide-react";
import { Button, Field, Select, TextInput } from "@/components/form-controls";
import { CompanyIntakeCard } from "@/components/company-intake-card";
import { MaterialShareDonut } from "@/components/material-share-donut";
import { PageHeader } from "@/components/page-header";
import { Badge, EmptyState, SectionCard, StatCard } from "@/components/ui";
import { createMockStockAdjustment, getMaterials, getStockTotals } from "@/lib/api";
import { formatNumber } from "@/lib/format";

type Direction = "add" | "remove";

export default function InventoryPage() {
  const materials = getMaterials();
  const stockTotals = getStockTotals();

  const [materialId, setMaterialId] = useState("");
  const [direction, setDirection] = useState<Direction>("add");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const totalStockKg = stockTotals.reduce((sum, t) => sum + t.totalKg, 0);
  const negativeCount = stockTotals.filter((t) => t.negative).length;
  const positiveTotals = stockTotals.filter((t) => !t.negative);
  const maxStockKg = Math.max(...positiveTotals.map((t) => t.totalKg), 1);

  const canSubmit = materialId !== "" && Number(quantity) > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const material = materials.find((m) => m.id === Number(materialId));
    const signedQuantity = direction === "add" ? Number(quantity) : -Number(quantity);

    createMockStockAdjustment({
      materialId: Number(materialId),
      quantityKg: signedQuantity,
      note: note.trim() || null,
    });

    setResult(
      `${material?.name ?? ""}の在庫を${direction === "add" ? "+" : "-"}${formatNumber(Number(quantity))}kg調整しました。`,
    );
    setMaterialId("");
    setQuantity("");
    setNote("");
  };

  return (
    <>
      <PageHeader label="在庫管理" title="在庫一覧">
        <Link
          href="/shipments/new"
          className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-ink transition-colors hover:bg-accent-soft"
        >
          <Plus size={20} strokeWidth={3} aria-hidden />
          出荷を登録
        </Link>
      </PageHeader>

      <SectionCard title="在庫を調整">
        {result ? (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/[0.06] px-4 py-3">
            <Check size={20} className="shrink-0 text-accent" aria-hidden />
            <p className="text-base">{result}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="品目">
            <Select value={materialId} onChange={(e) => setMaterialId(e.target.value)} required>
              <option value="">選択してください</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="区分">
            <Select
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
            >
              <option value="add">増える（棚卸増・入庫忘れの補正など）</option>
              <option value="remove">減る（ロス・棚卸減など）</option>
            </Select>
          </Field>
          <Field label="数量 (kg)">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="tnum"
              required
            />
          </Field>
          <div className="flex items-end gap-3">
            <Field label="メモ（任意）" labelClassName="sm:invisible">
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="理由など" />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-48">
              登録する
            </Button>
          </div>
        </form>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="在庫の累計重量（全品目合計・全期間）"
          value={totalStockKg}
          unit="kg"
          highlight
        />
        <StatCard label="マイナス在庫の品目数" value={negativeCount} unit="品目" />
      </div>

      <CompanyIntakeCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="品目別の在庫" flush>
          {stockTotals.length > 0 ? (
            <ul className="border-t border-line-soft">
              {stockTotals.map((total) => (
                <li
                  key={total.materialId}
                  className="border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-lg font-bold">{total.materialName}</span>
                      {total.negative ? (
                        <Badge tone="warn">
                          <TriangleAlert size={12} aria-hidden />
                          マイナス
                        </Badge>
                      ) : null}
                    </p>
                    <p className="shrink-0">
                      <span
                        className={`tnum text-xl font-bold ${total.negative ? "text-danger" : "text-accent"}`}
                      >
                        {formatNumber(total.totalKg)}
                      </span>
                      <span className="ml-1 text-sm text-fg-muted">kg</span>
                      <span className="ml-3 text-sm text-fg-faint">{total.count}件</span>
                    </p>
                  </div>
                  {/* 品目ごとの在庫構成比を横バーで示す（マイナス在庫はバーを出さない） */}
                  {!total.negative ? (
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-card-2"
                      role="presentation"
                    >
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(total.totalKg / maxStockKg) * 100}%` }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="在庫データがありません。" />
          )}
        </SectionCard>

        <SectionCard title="在庫全体の構成比（全期間）" centerBody>
          <MaterialShareDonut totals={positiveTotals} />
        </SectionCard>
      </div>

      <p className="px-2 text-sm text-fg-faint">
        ※ プロトタイプ表示のため、生産記録・出荷登録・この調整登録から算出した値を「在庫」として表示しています。調整の登録は同一ブラウザのセッション中のみ反映されます。
      </p>
    </>
  );
}
