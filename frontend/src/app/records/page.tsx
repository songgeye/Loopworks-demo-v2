"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CsvDownloadButton } from "@/components/csv-download-button";
import { FilterPanel } from "@/components/filter-panel";
import { Button, Field, Select, TextInput } from "@/components/form-controls";
import { PageHeader } from "@/components/page-header";
import { RecordList } from "@/components/record-list";
import { EmptyState } from "@/components/ui";
import { getMaterials, getRecords, getStaffs } from "@/lib/api";
import { formatNumber } from "@/lib/format";

const PER_PAGE = 50;

/** 現在の絞り込み条件を保ったままページ番号だけ差し替えたリンクを作る */
function pageHref(params: Record<string, string>, page: number): string {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== ""),
  );
  query.set("page", String(page));
  return `/records?${query.toString()}`;
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<EmptyState message="読み込み中..." />}>
      <RecordsPageContent />
    </Suspense>
  );
}

function RecordsPageContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const materialId = searchParams.get("materialId") ?? "";
  const staffId = searchParams.get("staffId") ?? "";
  const keyword = searchParams.get("keyword") ?? "";

  const records = getRecords({
    from: from || undefined,
    to: to || undefined,
    materialId: materialId ? Number(materialId) : undefined,
    staffId: staffId ? Number(staffId) : undefined,
    keyword: keyword || undefined,
  });

  const totalKg = records.reduce((sum, r) => sum + r.weightKg, 0);
  const materials = getMaterials();
  const staffs = getStaffs();

  const totalPages = Math.max(1, Math.ceil(records.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(searchParams.get("page")) || 1), totalPages);
  const pageRecords = records.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const filters = { from, to, materialId, staffId, keyword };

  return (
    <>
      <PageHeader label="加工記録管理" title="記録">
        <Link
          href="/records/new"
          className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-ink transition-colors hover:bg-accent-soft"
        >
          <Plus size={20} strokeWidth={3} aria-hidden />
          新しい記録
        </Link>
      </PageHeader>

      {/* GET フォームなので、絞り込み条件がそのまま URL に残り共有・再表示できる */}
      <FilterPanel activeCount={Object.values(filters).filter(Boolean).length}>
        <form
          method="get"
          action="/records"
          className="grid gap-4 px-6 pt-1 pb-5 sm:grid-cols-2 sm:px-7 sm:pt-5 lg:grid-cols-3"
        >
          <Field label="開始日">
            <TextInput type="date" name="from" defaultValue={from} />
          </Field>
          <Field label="終了日">
            <TextInput type="date" name="to" defaultValue={to} />
          </Field>
          <Field label="品目">
            <Select name="materialId" defaultValue={materialId}>
              <option value="">すべて</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="作業者">
            <Select name="staffId" defaultValue={staffId}>
              <option value="">すべて</option>
              {staffs.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="キーワード">
            <TextInput
              type="search"
              name="keyword"
              defaultValue={keyword}
              placeholder="品目・作業者・メモ"
            />
          </Field>
          <div className="flex items-end gap-3">
            <Button type="submit" className="flex-1">
              絞り込む
            </Button>
            <Link
              href="/records"
              className="flex h-12 items-center rounded-xl border border-line bg-card-2 px-5 text-base font-bold transition-colors hover:border-accent/50"
            >
              条件をクリア
            </Link>
          </div>
        </form>
      </FilterPanel>

      <div className="lw-card flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-7">
        <p className="text-base text-fg-muted">
          該当 <span className="tnum text-xl font-bold text-fg">{records.length}</span> 件
          ／ 合計{" "}
          <span className="tnum text-xl font-bold text-accent">
            {formatNumber(totalKg)}
          </span>{" "}
          kg
        </p>
        <CsvDownloadButton records={records} />
      </div>

      <section className="lw-card overflow-hidden">
        {pageRecords.length > 0 ? (
          <RecordList records={pageRecords} />
        ) : (
          <EmptyState message="条件に一致する記録がありません。" />
        )}
      </section>

      {totalPages > 1 ? (
        <nav
          aria-label="ページ送り"
          className="flex items-center justify-between gap-4 px-2"
        >
          {page > 1 ? (
            <Link
              href={pageHref(filters, page - 1)}
              className="flex h-12 items-center gap-1 rounded-xl border border-line bg-card-2 px-5 text-base font-bold transition-colors hover:border-accent/50"
            >
              <ChevronLeft size={18} aria-hidden />
              前の50件
            </Link>
          ) : (
            <span />
          )}

          <p className="tnum text-sm text-fg-muted">
            {page} / {totalPages} ページ
          </p>

          {page < totalPages ? (
            <Link
              href={pageHref(filters, page + 1)}
              className="flex h-12 items-center gap-1 rounded-xl border border-line bg-card-2 px-5 text-base font-bold transition-colors hover:border-accent/50"
            >
              次の50件
              <ChevronRight size={18} aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
