/**
 * Rails 側のスキーマ（db/schema.rb）に対応する型定義。
 * API 接続時もこの型をそのまま使えるよう、カラム名を DB に合わせている。
 */

export type StaffRole = "admin" | "staff";

export interface Staff {
  id: number;
  username: string;
  name: string;
  role: StaffRole;
  deletedAt: string | null;
}

export interface Material {
  id: number;
  name: string;
  displayOrder: number;
  deletedAt: string | null;
}

/** 仕入れ先（生産記録の持込元） */
export interface Company {
  id: number;
  name: string;
  deletedAt: string | null;
}

/** 売却先（出荷先）。仕入れ先とは別の取引先マスタとして扱う */
export interface Buyer {
  id: number;
  name: string;
  deletedAt: string | null;
}

export type RecordStatus = "draft" | "published";

export interface ProductionRecord {
  id: number;
  /** ISO8601（記録日時） */
  recordedAt: string;
  materialId: number;
  weightKg: number;
  staffId: number;
  status: RecordStatus;
  note: string | null;
  flaggedAsAnomaly: boolean;
  /** 買取伝票経由の持込元。伝票と紐付いていない記録では null */
  companyId: number | null;
  deletedAt: string | null;
}

/** 一覧表示用に品目名・作業者名・持込元会社名を結合したビューモデル */
export interface ProductionRecordView extends ProductionRecord {
  materialName: string;
  staffName: string;
  companyName: string | null;
}

/** 品目別の集計行 */
export interface MaterialTotal {
  materialId: number;
  materialName: string;
  totalKg: number;
  count: number;
}

export interface ShipmentItem {
  materialId: number;
  quantityKg: number;
}

export interface Shipment {
  id: number;
  /** 売却先（買取先とは別の Buyer マスタを参照） */
  companyId: number;
  /** ISO8601（出荷日時） */
  shippedAt: string;
  slipNo: string | null;
  note: string | null;
  items: ShipmentItem[];
}

/** 一覧・登録結果表示用に売却先名・品目名を結合したビューモデル */
export interface ShipmentView {
  id: number;
  companyId: number;
  companyName: string;
  shippedAt: string;
  slipNo: string | null;
  note: string | null;
  items: { materialId: number; materialName: string; quantityKg: number }[];
  totalQuantityKg: number;
}

/** 手動での在庫調整（棚卸差異・ロスなど）。quantityKg は増減どちらもありうる */
export interface StockAdjustment {
  id: number;
  materialId: number;
  quantityKg: number;
  note: string | null;
  /** ISO8601（調整日時） */
  adjustedAt: string;
}

/** 品目別の在庫（仕入れ - 出荷 + 手動調整）。マイナスもありうる */
export interface StockTotal {
  materialId: number;
  materialName: string;
  totalKg: number;
  count: number;
  negative: boolean;
}
