"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Plus, TriangleAlert, X } from "lucide-react";
import { Button, Field, Select, TextArea, TextInput } from "@/components/form-controls";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/ui";
import { ApiError, createShipment, fetchBuyerCompanies, fetchStockMaterials } from "@/lib/backend-api";
import type { ApiCompany, ApiMaterial } from "@/lib/backend-types";

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
  const [companies, setCompanies] = useState<ApiCompany[] | null>(null);
  const [materials, setMaterials] = useState<ApiMaterial[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [shippedAt, setShippedAt] = useState(nowForDatetimeLocal());
  const [slipNo, setSlipNo] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ warnings: { message: string }[] } | null>(null);

  useEffect(() => {
    Promise.all([fetchBuyerCompanies(), fetchStockMaterials()])
      .then(([companyList, materialList]) => {
        setCompanies(companyList);
        setMaterials(materialList);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof ApiError ? error.message : "取引先・品目の取得に失敗しました");
      });
  }, []);

  const updateRow = (key: number, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const filledRows = rows.filter((row) => row.materialId !== "" && Number(row.quantity) > 0);
  const canSubmit = companyId !== "" && shippedAt !== "" && filledRows.length > 0 && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);

    try {
      const { warnings } = await createShipment({
        companyId: Number(companyId),
        shippedAt: new Date(shippedAt).toISOString(),
        slipNo,
        note,
        items: filledRows.map((row) => ({
          material_id: Number(row.materialId),
          quantity_kg: Number(row.quantity),
        })),
      });

      setResult({ warnings });
      setSlipNo("");
      setNote("");
      setRows([emptyRow()]);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : "出荷の登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
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

      {loadError ? (
        <div className="lw-card flex items-center gap-3 border-danger/40 bg-danger/[0.06] px-6 py-4 text-danger sm:px-7">
          <TriangleAlert size={20} aria-hidden />
          <p>{loadError}</p>
        </div>
      ) : null}

      {result ? (
        <div className="lw-card space-y-2 border-accent/40 bg-accent/[0.06] px-6 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <Check size={20} className="text-accent" aria-hidden />
            <p className="text-base">出荷を登録しました。</p>
          </div>
          {result.warnings.map((warning, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-warn">
              <TriangleAlert size={16} aria-hidden />
              {warning.message}
            </div>
          ))}
        </div>
      ) : null}

      {submitError ? (
        <div className="lw-card flex items-center gap-3 border-danger/40 bg-danger/[0.06] px-6 py-4 text-danger sm:px-7">
          <TriangleAlert size={20} aria-hidden />
          <p>{submitError}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionCard title="出荷の基本情報">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="売却先" hint="buyerとして登録された取引先のみ選択できます">
              <Select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
                disabled={!companies}
              >
                <option value="">{companies ? "選択してください" : "読み込み中..."}</option>
                {companies?.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
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
                      disabled={!materials}
                    >
                      <option value="">{materials ? "選択してください" : "読み込み中..."}</option>
                      {materials?.map((material) => (
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
          {submitting ? "登録中..." : "出荷を登録する"}
        </Button>
      </form>
    </>
  );
}
