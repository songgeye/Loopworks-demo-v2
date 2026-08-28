import {
  buyers,
  companies,
  materials,
  productionRecords,
  shipments,
  staffs,
  stockAdjustments,
  TODAY,
} from "./mock-data";
import { dateOf, monthOf } from "./format";
import type {
  Buyer,
  Company,
  Material,
  MaterialTotal,
  ProductionRecord,
  ProductionRecordView,
  RecordStatus,
  Shipment,
  ShipmentView,
  Staff,
  StockAdjustment,
  StockTotal,
} from "./types";

/**
 * 画面から使うデータ取得層。
 * いまはモックを同期的に返しているが、Rails に JSON API を用意したら
 * この中身を fetch に置き換えるだけで画面側は変更不要。
 */

export { TODAY };

const activeMaterials = materials.filter((m) => m.deletedAt === null);
const activeStaffs = staffs.filter((s) => s.deletedAt === null);
const activeCompanies = companies.filter((c) => c.deletedAt === null);
const activeBuyers = buyers.filter((b) => b.deletedAt === null);
/** 生産記録は実行時に push されるため、キャッシュせず毎回フィルタし直す */
function activeRecords(): ProductionRecord[] {
  return productionRecords.filter((r) => r.deletedAt === null);
}

const materialById = new Map(materials.map((m) => [m.id, m]));
const staffById = new Map(staffs.map((s) => [s.id, s]));
const companyById = new Map(companies.map((c) => [c.id, c]));
const buyerById = new Map(buyers.map((b) => [b.id, b]));

export function getMaterials(): Material[] {
  return [...activeMaterials].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getStaffs(): Staff[] {
  return activeStaffs;
}

/** 仕入れ先（持込元）マスタ一覧 */
export function getCompanies(): Company[] {
  return activeCompanies;
}

/** 売却先（出荷先）マスタ一覧。仕入れ先とは別の取引先として扱う */
export function getBuyers(): Buyer[] {
  return activeBuyers;
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

  return activeRecords()
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
  const rows = activeRecords().filter(
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

export interface CompanyTotal {
  companyId: number;
  companyName: string;
  totalKg: number;
  count: number;
}

/** 持込元（会社）別の合計（重量の多い順）。買取伝票が紐付いていない記録は含めない */
export function getCompanyTotals(filter: RecordFilter = {}): CompanyTotal[] {
  const rows = getRecords({ ...filter, includeDrafts: false });
  const totals = new Map<number, CompanyTotal>();

  for (const company of companies) {
    totals.set(company.id, {
      companyId: company.id,
      companyName: company.name,
      totalKg: 0,
      count: 0,
    });
  }

  for (const row of rows) {
    if (row.companyId === null) continue;
    const entry = totals.get(row.companyId);
    if (!entry) continue;
    entry.totalKg += row.weightKg;
    entry.count += 1;
  }

  return [...totals.values()].filter((t) => t.count > 0).sort((a, b) => b.totalKg - a.totalKg);
}

/** 品目が生産記録から参照されているか（参照中はマスタから削除できない） */
export function isMaterialInUse(materialId: number): boolean {
  return activeRecords().some((r) => r.materialId === materialId);
}

export function isStaffInUse(staffId: number): boolean {
  return activeRecords().some((r) => r.staffId === staffId);
}

/** 仕入れ先が生産記録の持込元として参照されているか（参照中はマスタから削除できない） */
export function isCompanyInUse(companyId: number): boolean {
  return activeRecords().some((r) => r.companyId === companyId);
}

/**
 * 異常値検知のしきい値。
 * 直近 5 日間の同品目の平均重量を返す（記録が無ければ null）。
 */
export function recentAverageWeight(materialId: number, days = 5): number | null {
  const dates = [
    ...new Set(
      activeRecords()
        .filter((r) => r.materialId === materialId && r.status === "published")
        .map((r) => dateOf(r.recordedAt)),
    ),
  ]
    .sort()
    .slice(-days);

  if (dates.length === 0) return null;

  const rows = activeRecords().filter(
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

function toShipmentView(shipment: Shipment): ShipmentView {
  const items = shipment.items.map((item) => ({
    materialId: item.materialId,
    materialName: materialById.get(item.materialId)?.name ?? "（削除済み品目）",
    quantityKg: item.quantityKg,
  }));

  return {
    id: shipment.id,
    companyId: shipment.companyId,
    companyName: buyerById.get(shipment.companyId)?.name ?? "（削除済み売却先）",
    shippedAt: shipment.shippedAt,
    slipNo: shipment.slipNo,
    note: shipment.note,
    items,
    totalQuantityKg: items.reduce((sum, item) => sum + item.quantityKg, 0),
  };
}

/** 出荷日時の降順で返す */
export function getShipments(): ShipmentView[] {
  return [...shipments]
    .sort((a, b) => b.shippedAt.localeCompare(a.shippedAt))
    .map(toShipmentView);
}

let nextShipmentId = Math.max(0, ...shipments.map((s) => s.id)) + 1;

export interface CreateShipmentInput {
  companyId: number;
  shippedAt: string;
  slipNo: string | null;
  note: string | null;
  items: { materialId: number; quantityKg: number }[];
}

/** 出荷を登録する。実データAPIが無いため、モック配列に直接 push して同一セッション内で一覧に反映する */
export function createMockShipment(input: CreateShipmentInput): ShipmentView {
  const shipment: Shipment = { id: nextShipmentId++, ...input };
  shipments.push(shipment);
  return toShipmentView(shipment);
}

/**
 * 品目別の在庫（仕入れ - 出荷 + 手動調整）。
 * 全期間の生産記録・出荷・在庫調整のいずれかがある品目のみを対象にする。
 */
export function getStockTotals(): StockTotal[] {
  const purchaseTotals = getMaterialTotals();
  const purchaseByMaterial = new Map(purchaseTotals.map((t) => [t.materialId, t]));

  const shipmentByMaterial = new Map<number, number>();
  for (const shipment of shipments) {
    for (const item of shipment.items) {
      shipmentByMaterial.set(
        item.materialId,
        (shipmentByMaterial.get(item.materialId) ?? 0) + item.quantityKg,
      );
    }
  }

  const adjustmentByMaterial = new Map<number, number>();
  for (const adjustment of stockAdjustments) {
    adjustmentByMaterial.set(
      adjustment.materialId,
      (adjustmentByMaterial.get(adjustment.materialId) ?? 0) + adjustment.quantityKg,
    );
  }

  const materialIds = new Set<number>([
    ...purchaseByMaterial.keys(),
    ...shipmentByMaterial.keys(),
    ...adjustmentByMaterial.keys(),
  ]);

  return [...materialIds]
    .map((materialId) => {
      const totalKg =
        (purchaseByMaterial.get(materialId)?.totalKg ?? 0) -
        (shipmentByMaterial.get(materialId) ?? 0) +
        (adjustmentByMaterial.get(materialId) ?? 0);

      return {
        materialId,
        materialName: materialById.get(materialId)?.name ?? "（削除済み品目）",
        totalKg,
        count: purchaseByMaterial.get(materialId)?.count ?? 0,
        negative: totalKg < 0,
      };
    })
    .sort((a, b) => b.totalKg - a.totalKg);
}

let nextStockAdjustmentId = Math.max(0, ...stockAdjustments.map((a) => a.id)) + 1;

export interface CreateStockAdjustmentInput {
  materialId: number;
  /** 増減どちらもありうる（マイナス値で減算） */
  quantityKg: number;
  note: string | null;
}

/** 在庫を手動で調整登録する（棚卸差異・ロスなど）。品目別在庫の集計に即時反映される */
export function createMockStockAdjustment(input: CreateStockAdjustmentInput): StockAdjustment {
  const adjustment: StockAdjustment = {
    id: nextStockAdjustmentId++,
    adjustedAt: new Date().toISOString(),
    ...input,
  };
  stockAdjustments.push(adjustment);
  return adjustment;
}

let nextProductionRecordId = Math.max(0, ...productionRecords.map((r) => r.id)) + 1;

export interface CreateProductionRecordInput {
  recordedAt: string;
  materialId: number;
  weightKg: number;
  staffId: number;
  status: RecordStatus;
  note: string | null;
  companyId: number | null;
  flaggedAsAnomaly: boolean;
}

/** 生産記録を登録する。実データAPIが無いため、モック配列に直接 push して同一セッション内で記録一覧・ホームにも反映する */
export function createMockProductionRecord(
  input: CreateProductionRecordInput,
): ProductionRecordView {
  const record: ProductionRecord = {
    id: nextProductionRecordId++,
    deletedAt: null,
    ...input,
  };
  productionRecords.push(record);
  return toView(record);
}
