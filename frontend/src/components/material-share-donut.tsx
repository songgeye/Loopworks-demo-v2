import type { MaterialTotal } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { EmptyState } from "./ui";

/**
 * カテゴリ配色（8色）。データビジュアライゼーションガイドラインの
 * 既定パレットのダーク面向けステップから採用（カード面 #101615 で検証済み）。
 * 固定順で割り当てる（回転させない）。
 */
const PALETTE = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

const MAX_SLICES = 6;
const SIZE = 268;
const STROKE = 46;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** 隣接する弧を区切る隙間（円周に対する長さ。marks-and-anatomy.md の 2px スペーサーに準拠） */
const GAP = 3;

interface Slice {
  key: string;
  name: string;
  totalKg: number;
  color: string;
}

/** 本日の品目別構成比を表すドーナツチャート（円グラフ＋中央に合計値） */
export function MaterialShareDonut({ totals }: { totals: MaterialTotal[] }) {
  const grandTotal = totals.reduce((sum, t) => sum + t.totalKg, 0);

  if (grandTotal <= 0) {
    return <EmptyState message="本日の記録はまだありません。" />;
  }

  const top = totals.slice(0, MAX_SLICES);
  const restTotal = totals.slice(MAX_SLICES).reduce((sum, t) => sum + t.totalKg, 0);

  const slices: Slice[] = top.map((t, i) => ({
    key: String(t.materialId),
    name: t.materialName,
    totalKg: t.totalKg,
    color: PALETTE[i],
  }));
  if (restTotal > 0) {
    slices.push({ key: "other", name: "その他", totalKg: restTotal, color: "var(--color-fg-faint)" });
  }

  let cursor = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={`本日の品目別構成比。合計 ${formatNumber(grandTotal)}kg`}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-line-soft)"
            strokeWidth={STROKE}
          />
          {slices.map((slice) => {
            const fraction = slice.totalKg / grandTotal;
            const length = fraction * CIRCUMFERENCE;
            const visibleLength = Math.max(length - GAP, 0);
            const offset = -cursor;
            cursor += length;
            const pct = Math.round(fraction * 1000) / 10;

            return (
              <circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeDasharray={`${visibleLength} ${CIRCUMFERENCE - visibleLength}`}
                strokeDashoffset={offset}
                tabIndex={0}
                role="img"
                aria-label={`${slice.name} ${formatNumber(slice.totalKg)}kg（${pct}%）`}
                className="opacity-95 transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100"
              >
                <title>{`${slice.name}：${formatNumber(slice.totalKg)}kg（${pct}%）`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-3xl font-bold">{formatNumber(grandTotal)}</span>
          <span className="text-base text-fg-muted">kg</span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-2.5 sm:w-auto">
        {slices.map((slice) => {
          const pct = Math.round((slice.totalKg / grandTotal) * 1000) / 10;
          return (
            <li key={slice.key} className="flex items-center gap-3 text-base">
              <span
                aria-hidden
                className="size-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-fg-muted">{slice.name}</span>
              <span className="tnum ml-auto shrink-0 pl-5 font-bold">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
