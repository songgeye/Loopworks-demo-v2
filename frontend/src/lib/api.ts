import { companies, materials, productionRecords, staffs, TODAY } from "./mock-data";
import { dateOf, monthOf } from "./format";
import type {
  Material,
  MaterialTotal,
  ProductionRecord,
  ProductionRecordView,
  Staff,
} from "./types";

/**
 * 画面から使うデータ取得層。
 * いまはモックを同期的に返しているが、Rails に JSON API を用意したら
 * この中身を fetch に置き換えるだけで画面側は変更不要。
 */

export { TODAY };

const activeMaterials = materials.filter((m) => m.deletedAt === null);
const activeStaffs = staffs.filter((s) => s.deletedAt === null);
const activeRecords = productionRecords.filter((r) => r.deletedAt === null);

const materialById = new Map(materials.map((m) => [m.id, m]));
const staffById = new Map(staffs.map((s) => [s.id, s]));
const companyById = new Map(companies.map((c) => [c.id, c]));

export function getMaterials(): Material[] {
  return [...activeMaterials].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getStaffs(): Staff[] {
  return activeStaffs;
}

export function toView(record: ProductionRecord): ProductionRecordView {
  return {
    ...record,
    materialName: materialById.get(record.materialId)?.name ?? "（削除済み品目）",
    staffName: staffById.get(record.staffId)?.name ?? "（削除済み作業者）",
    companyName:
      record.companyId === null
        ? null
        : (companyById.get(record.companyId)?.name ?? "（削除済み取引先）"),
  };
}

export interface RecordFilter {
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
  materialId?: number;
  staffId?: number;
  keyword?: string;
  includeDrafts?: boolean;
}

/** 記録日時の降順で返す */
export function getRecords(filter: RecordFilter = {}): ProductionRecordView[] {
  const {
    from,
    to,
    materialId,
    staffId,
    keyword,
    includeDrafts = true,
  } = filter;
  const needle = keyword?.trim().toLowerCase();

  return activeRecords
    .filter((r) => {
      if (!includeDrafts && r.status !== "published") return false;
      const date = dateOf(r.recordedAt);
      if (from && date < from) return false;
      if (to && date > to) return false;
      if (materialId && r.materialId !== materialId) return false;
      if (staffId && r.staffId !== staffId) return false;
      if (needle) {
        const view = toView(r);
        const haystack =
          `${view.materialName} ${view.staffName} ${view.note ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .map(toView)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export interface DailySummary {
  date: string;
  totalKg: number;
  count: number;
}

/** 指定日（既定は「今日」）の公開済み記録のサマリー */
export function getDailySummary(date: string = TODAY): DailySummary {
  const rows = activeRecords.filter(
    (r) => dateOf(r.recordedAt) === date && r.status === "published",
  );
  return {
    date,
    totalKg: rows.reduce((sum, r) => sum + r.weightKg, 0),
    count: rows.length,
  };
}

export function getRecentRecords(limit = 5): ProductionRecordView[] {
  return getRecords({ includeDrafts: false }).slice(0, limit);
}

/** 品目別の合計（重量の多い順） */
export function getMaterialTotals(filter: RecordFilter = {}): MaterialTotal[] {
  const rows = getRecords({ ...filter, includeDrafts: false });
  const totals = new Map<number, MaterialTotal>();

  for (const material of getMaterials()) {
    totals.set(material.id, {
      materialId: material.id,
      materialName: material.name,
      totalKg: 0,
      count: 0,
    });
  }

  for (const row of rows) {
    const entry = totals.get(row.materialId);
    if (!entry) continue;
    entry.totalKg += row.weightKg;
    entry.count += 1;
  }

  return [...totals.values()].sort((a, b) => b.totalKg - a.totalKg);
}

/** 指定した年月（YYYY-MM）の品目別合計 */
export function getMonthlyTotals(yearMonth: string): MaterialTotal[] {
  return getMaterialTotals({ from: `${yearMonth}-01`, to: `${yearMonth}-31` });
}

/** 「今月」＝ TODAY の属する月 */
export function currentMonth(): string {
  return monthOf(TODAY);
}

/** 前月（YYYY-MM） */
export function previousMonth(yearMonth: string = currentMonth()): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;
}

export interface StaffTotal {
  staffId: number;
  staffName: string;
  totalKg: number;
  count: number;
}

/** 作業者別の合計（重量の多い順） */
export function getStaffTotals(filter: RecordFilter = {}): StaffTotal[] {
  const rows = getRecords({ ...filter, includeDrafts: false });
  const totals = new Map<number, StaffTotal>();

  for (const staff of getStaffs()) {
    totals.set(staff.id, {
      staffId: staff.id,
      staffName: staff.name,
      totalKg: 0,
      count: 0,
    });
  }

  for (const row of rows) {
    const entry = totals.get(row.staffId);
    if (!entry) continue;
    entry.totalKg += row.weightKg;
    entry.count += 1;
  }

  return [...totals.values()].sort((a, b) => b.totalKg - a.totalKg);
}

/** 品目が生産記録から参照されているか（参照中はマスタから削除できない） */
export function isMaterialInUse(materialId: number): boolean {
  return activeRecords.some((r) => r.materialId === materialId);
}

export function isStaffInUse(staffId: number): boolean {
  return activeRecords.some((r) => r.staffId === staffId);
}

/**
 * 異常値検知のしきい値。
 * 直近 5 日間の同品目の平均重量を返す（記録が無ければ null）。
 */
export function recentAverageWeight(materialId: number, days = 5): number | null {
  const dates = [
    ...new Set(
      activeRecords
        .filter((r) => r.materialId === materialId && r.status === "published")
        .map((r) => dateOf(r.recordedAt)),
    ),
  ]
    .sort()
    .slice(-days);

  if (dates.length === 0) return null;

  const rows = activeRecords.filter(
    (r) =>
      r.materialId === materialId &&
      r.status === "published" &&
      dates.includes(dateOf(r.recordedAt)),
  );
  if (rows.length === 0) return null;

  return rows.reduce((sum, r) => sum + r.weightKg, 0) / rows.length;
}

/** 平均から大きく外れていれば true（保存前の確認ダイアログ用） */
export function isAnomalousWeight(materialId: number, weightKg: number): boolean {
  const average = recentAverageWeight(materialId);
  if (average === null) return false;
  return weightKg > average * 2 || weightKg < average * 0.25;
}
