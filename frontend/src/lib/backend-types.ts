/**
 * Rails の /api/v1 が実際に返す JSON の型。
 * lib/types.ts はモックデータ用（camelCase）なので、実 API と接続する
 * 在庫・出荷まわりはこちらを使う（レスポンスの形そのまま、snake_case）。
 */

export interface ApiMaterial {
  id: number;
  name: string;
  display_order: number;
  category: "stock" | "disposal";
}

export interface ApiCompany {
  id: number;
  name: string;
  supplier: boolean;
  buyer: boolean;
  /** 全期間の累計受入重量(kg)。role=supplier で絞り込んだ一覧のみ意味を持つ */
  total_received_kg: number | null;
}

export interface InventoryRow {
  material: { id: number; name: string };
  opening_kg: number;
  purchase_in_kg: number;
  shipment_out_kg: number;
  adjustment_kg: number;
  disposal_out_kg: number;
  stock_kg: number;
  negative: boolean;
}

export interface InventoriesResponse {
  as_of: string;
  data: InventoryRow[];
}

export interface ShipmentItemSummary {
  material: { id: number; name: string };
  quantity_kg: number;
}

export interface ShipmentSummary {
  id: number;
  slip_no: string | null;
  company: { id: number; name: string };
  shipped_at: string;
  total_quantity_kg: number;
  items: ShipmentItemSummary[];
}

export interface ShipmentItemDetail {
  id: number;
  material: { id: number; name: string };
  quantity_kg: number;
}

export interface ShipmentDetail {
  id: number;
  slip_no: string | null;
  company: { id: number; name: string };
  shipped_at: string;
  note: string | null;
  shipment_items: ShipmentItemDetail[];
}

export interface ApiWarning {
  message: string;
}

export interface ApiErrorItem {
  field: string | null;
  message: string;
}

export interface ApiListMeta {
  current_page: number;
  total_pages: number;
  total_count: number;
}
