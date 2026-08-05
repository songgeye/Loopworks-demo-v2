/**
 * 日時は "YYYY-MM-DDTHH:mm:ss" 形式の文字列をそのまま切り出して整形する。
 * Date に通すとサーバーとブラウザのタイムゾーン差で表示がずれるため、文字列のまま扱う。
 */

interface Parts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;

export function parseParts(iso: string): Parts {
  const m = PATTERN.exec(iso);
  if (!m) throw new Error(`日時の形式が不正です: ${iso}`);
  return {
    year: m[1],
    month: m[2],
    day: m[3],
    hour: m[4] ?? "00",
    minute: m[5] ?? "00",
  };
}

/** 07/09 15:32 */
export function formatDateTimeShort(iso: string): string {
  const p = parseParts(iso);
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

/** 2026/07/09 */
export function formatDate(iso: string): string {
  const p = parseParts(iso);
  return `${p.year}/${p.month}/${p.day}`;
}

/** 15:32 */
export function formatTime(iso: string): string {
  const p = parseParts(iso);
  return `${p.hour}:${p.minute}`;
}

/** 2026年7月 */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

/** 日付部分（YYYY-MM-DD）を取り出す */
export function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

/** 年月（YYYY-MM）を取り出す */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * 12450 -> "12,450"
 * toLocaleString は環境によって区切りが変わり得るので、桁区切りは自前で行う。
 */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const [intPart, decimalPart] = String(Math.abs(rounded)).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = rounded < 0 ? "-" : "";
  return decimalPart ? `${sign}${grouped}.${decimalPart}` : `${sign}${grouped}`;
}

/** 前月比などの増減率 */
export function formatDelta(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "±0%" : "新規";
  const ratio = ((current - previous) / previous) * 100;
  const sign = ratio > 0 ? "+" : ratio < 0 ? "" : "±";
  return `${sign}${formatNumber(Math.round(ratio * 10) / 10)}%`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 2026/07/09（木） */
export function formatDateWithWeekday(iso: string): string {
  const p = parseParts(iso);
  const weekday = new Date(
    Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)),
  ).getUTCDay();
  return `${p.year}/${p.month}/${p.day}（${WEEKDAYS[weekday]}）`;
}
