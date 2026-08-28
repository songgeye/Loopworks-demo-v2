"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button, Field, Select, TextArea, TextInput } from "@/components/form-controls";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/ui";
import { createMockShipment, getBuyers, getMaterials } from "@/lib/api";

interface ItemRow {
  key: number;
  materialId: string;
  quantity: string;
}

let nextKey = 1;

function emptyRow(): ItemRow {
  return { key: nextKey++, materialId: "", quantity: "" };
}

function nowForDatetimeLocal(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function NewShipmentPage() {
  const buyers = getBuyers();
  const materials = useMemo(() => getMaterials(), []);

  const [companyId, setCompanyId] = useState("");
  const [shippedAt, setShippedAt] = useState(nowForDatetimeLocal());
  const [slipNo, setSlipNo] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);

  const [result, setResult] = useState<{ companyName: string; totalKg: number } | null>(null);

  const updateRow = (key: number, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const filledRows = rows.filter((row) => row.materialId !== "" && Number(row.quantity) > 0);
  const canSubmit = companyId !== "" && shippedAt !== "" && filledRows.length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const shipment = createMockShipment({
      companyId: Number(companyId),
      shippedAt: new Date(shippedAt).toISOString(),
      slipNo: slipNo.trim() || null,
      note: note.trim() || null,
      items: filledRows.map((row) => ({
        materialId: Number(row.materialId),
        quantityKg: Number(row.quantity),
      })),
    });

    setResult({ companyName: shipment.companyName, totalKg: shipment.totalQuantityKg });
    setCompanyId("");
    setSlipNo("");
    setNote("");
    setRows([emptyRow()]);
  };

  return (
    <>
      <PageHeader label="在庫管理" title="出荷を登録">
        <Link
          href="/shipments"
          className="flex h-12 items-center rounded-xl border border-line bg-card-2 px-5 text-base font-bold transition-colors hover:border-accent/50"
        >
          出荷一覧へ
        </Link>
      </PageHeader>

      {result ? (
        <div className="lw-card flex items-center gap-3 border-accent/40 bg-accent/[0.06] px-6 py-4 sm:px-7">
          <Check size={20} className="text-accent" aria-hidden />
          <p className="text-base">
            {result.companyName}宛てに合計{result.totalKg.toLocaleString("ja-JP")}kgの出荷を登録しました。
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionCard title="出荷の基本情報">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="売却先" hint="売却先マスタに登録された取引先から選択します">
              <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
                <option value="">選択してください</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="出荷日時">
              <TextInput
                type="datetime-local"
                value={shippedAt}
                onChange={(e) => setShippedAt(e.target.value)}
                required
              />
            </Field>
            <Field label="伝票番号（任意）">
              <TextInput value={slipNo} onChange={(e) => setSlipNo(e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="マテリアルと数量">
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.key} className="grid grid-cols-[1fr_auto] gap-3 sm:flex sm:items-end">
                <div className="col-span-2 sm:flex-1">
                  <Field label="マテリアル" labelClassName={index === 0 ? undefined : "sm:invisible"}>
                    <Select
                      value={row.materialId}
                      onChange={(e) => updateRow(row.key, { materialId: e.target.value })}
                      aria-label={`${index + 1}行目のマテリアル`}
                    >
                      <option value="">選択してください</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="sm:w-40">
                  <Field label="数量 (kg)" labelClassName={index === 0 ? undefined : "sm:invisible"}>
                    <TextInput
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      step="0.1"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      placeholder="0"
                      aria-label={`${index + 1}行目の数量`}
                      className="tnum text-right"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  disabled={rows.length === 1}
                  aria-label={`${index + 1}行目を削除`}
                  className="flex size-12 shrink-0 self-end items-center justify-center rounded-xl border border-line bg-card-2 text-fg-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-30"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-base font-bold text-fg-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Plus size={18} aria-hidden />
            マテリアルを追加
          </button>
        </SectionCard>

        <SectionCard title="メモ">
          <Field label="メモ（任意）">
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </SectionCard>

        <Button type="submit" disabled={!canSubmit} className="h-16 w-full text-xl lw-glow">
          出荷を登録する
        </Button>
      </form>
    </>
  );
}
