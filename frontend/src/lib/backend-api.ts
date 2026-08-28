import type {
  ApiCompany,
  ApiErrorItem,
  ApiMaterial,
  InventoriesResponse,
  ShipmentDetail,
  ShipmentSummary,
  ApiListMeta,
} from "./backend-types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// Next.js は別オリジンから呼ぶため、Origin ヘッダの一致チェックは Rails 側で
// 無効化している。CSRF トークン自体は有効なので、状態変更リクエストの前に
// 都度取得して X-CSRF-Token として付与する（実装仕様書 v2 §3.1）。
async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/csrf`, { credentials: "include" });
  if (!res.ok) {
    throw new ApiError("CSRFトークンの取得に失敗しました", res.status);
  }
  const body = (await res.json()) as { token: string };
  return body.token;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (MUTATING_METHODS.has(method)) {
    headers["X-CSRF-Token"] = await fetchCsrfToken();
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError("ログインが必要です。Railsにログインしてください。", 401);
    }
    const body = await res.json().catch(() => null);
    const message: string | undefined = body?.errors?.[0]?.message;
    throw new ApiError(message ?? "通信に失敗しました", res.status);
  }

  return res.json() as Promise<T>;
}

export function fetchInventories(asOf?: string): Promise<InventoriesResponse> {
  const query = asOf ? `?as_of=${encodeURIComponent(asOf)}` : "";
  return apiFetch<InventoriesResponse>(`/api/v1/inventories${query}`);
}

export async function fetchStockMaterials(): Promise<ApiMaterial[]> {
  const res = await apiFetch<{ data: ApiMaterial[]; meta: ApiListMeta }>(
    "/api/v1/materials?category=stock",
  );
  return res.data;
}

export async function fetchBuyerCompanies(): Promise<ApiCompany[]> {
  const res = await apiFetch<{ data: ApiCompany[]; meta: ApiListMeta }>(
    "/api/v1/companies?role=buyer",
  );
  return res.data;
}

/** 累計受入重量の多い順に並べて返す(ダッシュボードのランキング表示用) */
export async function fetchSupplierCompaniesByReceivedWeight(): Promise<ApiCompany[]> {
  const res = await apiFetch<{ data: ApiCompany[]; meta: ApiListMeta }>(
    "/api/v1/companies?role=supplier",
  );
  return [...res.data].sort((a, b) => (b.total_received_kg ?? 0) - (a.total_received_kg ?? 0));
}

export async function fetchShipments(): Promise<ShipmentSummary[]> {
  const res = await apiFetch<{ data: ShipmentSummary[]; meta: ApiListMeta }>(
    "/api/v1/shipments",
  );
  return res.data;
}

export interface CreateShipmentItem {
  material_id: number;
  quantity_kg: number;
}

export interface CreateShipmentResult {
  shipment: ShipmentDetail;
  warnings: { message: string }[];
}

export async function createShipment(params: {
  companyId: number;
  shippedAt: string;
  slipNo?: string;
  note?: string;
  items: CreateShipmentItem[];
}): Promise<CreateShipmentResult> {
  const res = await apiFetch<ShipmentDetail & { warnings: { message: string }[] }>(
    "/api/v1/shipments",
    {
      method: "POST",
      body: JSON.stringify({
        shipment: {
          company_id: params.companyId,
          shipped_at: params.shippedAt,
          slip_no: params.slipNo || undefined,
          note: params.note || undefined,
          shipment_items_attributes: params.items.map((item) => ({
            material_id: item.material_id,
            quantity_kg: item.quantity_kg,
          })),
        },
      }),
    },
  );

  const { warnings, ...shipment } = res;
  return { shipment, warnings };
}

export type { ApiErrorItem };
