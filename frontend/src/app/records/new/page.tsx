"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Camera, Check, Plus, TriangleAlert, X } from "lucide-react";
import { Button, Field, Select, TextArea, TextInput } from "@/components/form-controls";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/ui";
import {
  getMaterials,
  getStaffs,
  isAnomalousWeight,
  recentAverageWeight,
  TODAY,
} from "@/lib/api";
import { formatNumber } from "@/lib/format";

interface EntryRow {
  key: number;
  materialId: string;
  weight: string;
}

let nextKey = 1;

function emptyRow(): EntryRow {
  return { key: nextKey++, materialId: "", weight: "" };
}

export default function NewRecordPage() {
  const materials = useMemo(() => getMaterials(), []);
  const staffs = useMemo(() => getStaffs(), []);

  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("09:00");
  const [staffId, setStaffId] = useState("");
  const [rows, setRows] = useState<EntryRow[]>([emptyRow(), emptyRow()]);
  const [note, setNote] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState<{ count: number; totalKg: number } | null>(null);

  const filledRows = rows.filter((row) => row.materialId !== "" && Number(row.weight) > 0);
  const totalKg = filledRows.reduce((sum, row) => sum + Number(row.weight), 0);
  const canSubmit = staffId !== "" && filledRows.length > 0;

  /** 直近平均から大きく外れた行（保存前に確認を促す） */
  const anomalies = filledRows
    .filter((row) => isAnomalousWeight(Number(row.materialId), Number(row.weight)))
    .map((row) => ({
      key: row.key,
      materialName:
        materials.find((m) => m.id === Number(row.materialId))?.name ?? "不明な品目",
      weight: Number(row.weight),
      average: recentAverageWeight(Number(row.materialId)) ?? 0,
    }));

  const updateRow = (key: number, patch: Partial<EntryRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const commit = () => {
    setSaved({ count: filledRows.length, totalKg });
    setConfirming(false);
    setRows([emptyRow(), emptyRow()]);
    setNote("");
    setPhotoName(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    // 異常値があるときはブロックせず、確認ダイアログを挟むだけにする
    if (anomalies.length > 0) {
      setConfirming(true);
      return;
    }
    commit();
  };

  return (
    <>
      <PageHeader label="加工記録管理" title="新しい記録">
        <Link
          href="/records"
          className="flex h-12 items-center rounded-xl border border-line bg-card-2 px-5 text-base font-bold transition-colors hover:border-accent/50"
        >
          記録一覧へ
        </Link>
      </PageHeader>

      {saved ? (
        <div className="lw-card flex flex-wrap items-center gap-3 border-accent/40 bg-accent/[0.06] px-6 py-4 sm:px-7">
          <Check size={20} className="text-accent" aria-hidden />
          <p className="text-base">
            {saved.count}件（合計 {formatNumber(saved.totalKg)}kg）を登録しました。
          </p>
          <span className="text-sm text-fg-faint">
            ※ API 未接続のため、画面上の確認のみです
          </span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionCard title="記録の基本情報">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="記録日">
              <TextInput
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
            <Field label="時刻">
              <TextInput
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </Field>
            <Field label="作業者" hint="表記ゆれを防ぐため一覧から選びます">
              <Select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
              >
                <option value="">選択してください</option>
                {staffs.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="品目と重量">
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.key} className="flex items-end gap-3">
                <div className="flex-1">
                  <Field label={index === 0 ? "品目" : ""}>
                    <Select
                      value={row.materialId}
                      onChange={(e) => updateRow(row.key, { materialId: e.target.value })}
                      aria-label={`${index + 1}行目の品目`}
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
                <div className="w-32 sm:w-40">
                  <Field label={index === 0 ? "重量 (kg)" : ""}>
                    <TextInput
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      step="0.1"
                      value={row.weight}
                      onChange={(e) => updateRow(row.key, { weight: e.target.value })}
                      placeholder="0"
                      aria-label={`${index + 1}行目の重量`}
                      className="tnum text-right"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  disabled={rows.length === 1}
                  aria-label={`${index + 1}行目を削除`}
                  className="mb-0 flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-card-2 text-fg-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-30"
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
            品目を追加
          </button>

          <div className="mt-5 flex items-baseline justify-between border-t border-line-soft pt-4">
            <span className="text-base text-fg-muted">今回の合計</span>
            <span>
              <span className="tnum text-3xl font-bold text-accent">
                {formatNumber(totalKg)}
              </span>
              <span className="ml-1 text-base text-fg-muted">kg</span>
            </span>
          </div>
        </SectionCard>

        <SectionCard title="メモ・写真">
          <div className="space-y-4">
            <Field label="メモ（任意）">
              <TextArea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="搬入元や気づいたことなど"
              />
            </Field>

            <div>
              <span className="text-sm font-bold text-fg-muted">写真（任意・1枚）</span>
              <label className="mt-1.5 flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 text-base text-fg-muted transition-colors hover:border-accent/50 hover:text-accent">
                <Camera size={18} aria-hidden />
                {photoName ?? "写真を選択"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
                />
              </label>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-16 flex-1 text-xl lw-glow"
          >
            保存する
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!canSubmit}
            onClick={commit}
            className="h-16 sm:w-48"
          >
            下書き保存
          </Button>
        </div>
      </form>

      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="anomaly-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="lw-card w-full max-w-lg border-warn/40 p-6">
            <div className="flex items-center gap-3">
              <TriangleAlert size={24} className="text-warn" aria-hidden />
              <h2 id="anomaly-title" className="text-xl font-bold">
                入力値をご確認ください
              </h2>
            </div>

            <p className="mt-3 text-base text-fg-muted">
              直近の平均から大きく離れた重量が入力されています。値が正しければ、そのまま保存できます。
            </p>

            <ul className="mt-4 space-y-2">
              {anomalies.map((anomaly) => (
                <li
                  key={anomaly.key}
                  className="rounded-xl border border-line bg-card-2 px-4 py-3"
                >
                  <p className="font-bold">{anomaly.materialName}</p>
                  <p className="tnum mt-1 text-sm text-fg-muted">
                    入力値 {formatNumber(anomaly.weight)}kg ／ 直近平均{" "}
                    {formatNumber(Math.round(anomaly.average))}kg
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              <Button type="button" onClick={commit} className="flex-1">
                確認して保存
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirming(false)}
                className="sm:w-40"
              >
                修正する
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
