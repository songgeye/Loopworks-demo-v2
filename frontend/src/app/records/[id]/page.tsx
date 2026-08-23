import Link from "next/link";
import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/form-controls";
import { PageHeader } from "@/components/page-header";
import { Badge, SectionCard } from "@/components/ui";
import { getRecords, recentAverageWeight } from "@/lib/api";
import { formatDateWithWeekday, formatNumber, formatTime } from "@/lib/format";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getRecords().find((r) => r.id === Number(id));
  if (!record) notFound();

  const average = recentAverageWeight(record.materialId);

  const rows = [
    { label: "記録日", value: formatDateWithWeekday(record.recordedAt) },
    { label: "時刻", value: formatTime(record.recordedAt) },
    { label: "品目", value: record.materialName },
    { label: "作業者", value: record.staffName },
    {
      label: "状態",
      value: record.status === "draft" ? "下書き" : "公開",
    },
    {
      label: "直近5日の平均重量",
      value: average === null ? "—" : `${formatNumber(Math.round(average))} kg`,
    },
  ];

  return (
    <>
      <PageHeader label="加工記録管理" title="記録の詳細">
        <Link
          href="/records"
          className="flex h-12 items-center rounded-xl border border-line bg-card-2 px-5 text-base font-bold transition-colors hover:border-accent/50"
        >
          記録一覧へ
        </Link>
      </PageHeader>

      <div className="lw-card px-6 py-6 sm:px-7">
        <p className="text-base text-fg-muted">重量</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="tnum text-5xl font-bold text-accent sm:text-6xl">
            {formatNumber(record.weightKg)}
          </span>
          <span className="text-lg text-fg-muted">kg</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="accent">{record.materialName}</Badge>
          {record.flaggedAsAnomaly ? (
            <Badge tone="warn">
              <TriangleAlert size={12} aria-hidden />
              確認済みの異常値
            </Badge>
          ) : null}
          {record.status === "draft" ? <Badge>下書き</Badge> : null}
        </div>
      </div>

      <SectionCard title="記録内容" flush>
        <dl className="border-t border-line-soft">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7"
            >
              <dt className="text-base text-fg-muted">{row.label}</dt>
              <dd className="tnum text-right text-base font-bold">{row.value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <SectionCard title="メモ">
        <p className="text-base leading-relaxed whitespace-pre-wrap text-fg-muted">
          {record.note ?? "メモはありません。"}
        </p>
      </SectionCard>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button className="sm:w-48">この記録を編集</Button>
        {/* 削除は admin のみ。実際の権限判定はログイン実装後にサーバー側で行う */}
        <Button variant="danger" className="sm:w-48">
          削除（管理者のみ）
        </Button>
      </div>
    </>
  );
}
