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

export interface Company {
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
