import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { formatDateTimeShort, formatNumber } from "@/lib/format";
import type { ProductionRecordView } from "@/lib/types";
import { Badge } from "./ui";

/** ホーム・記録一覧で共通して使う、生産記録の行リスト */
export function RecordList({ records }: { records: ProductionRecordView[] }) {
  return (
    <ul className="border-t border-line-soft">
      {records.map((record) => (
        <li key={record.id} className="border-b border-line-soft last:border-b-0">
          <Link
            href={`/records/${record.id}`}
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-card-2 sm:gap-4 sm:px-7"
          >
            {/* 幅の広い画面では日時を左の列に、狭い画面では品目名の上に置く */}
            <time
              dateTime={record.recordedAt}
              className="tnum hidden w-28 shrink-0 font-mono text-base text-fg-muted sm:block"
            >
              {formatDateTimeShort(record.recordedAt)}
            </time>

            <div className="min-w-0 flex-1">
              <time
                dateTime={record.recordedAt}
                className="tnum block font-mono text-xs text-fg-muted sm:hidden"
              >
                {formatDateTimeShort(record.recordedAt)}
              </time>
              <p className="flex flex-wrap items-center gap-2">
                <span className="truncate text-lg font-bold">{record.materialName}</span>
                {record.flaggedAsAnomaly ? (
                  <Badge tone="warn">
                    <TriangleAlert size={12} aria-hidden />
                    異常値
                  </Badge>
                ) : null}
                {record.status === "draft" ? <Badge>下書き</Badge> : null}
              </p>
              <p className="truncate text-sm text-fg-muted">{record.staffName}</p>
            </div>

            <p className="shrink-0 text-right">
              <span className="tnum text-2xl font-bold text-accent">
                {formatNumber(record.weightKg)}
              </span>
              <span className="ml-1 text-sm text-fg-muted">kg</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
