import { parseFilenameFromContentDisposition } from "./content-disposition";

/**
 * Rails API のオリジン。将来の本番構成（サブドメイン分割 or リバースプロキシ）が
 * 確定するまでは環境変数で切り替えられるようにしておく（実装仕様書 v2 §3.1）。
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export interface ProductionRecordsXlsxFilter {
  from?: string;
  to?: string;
  materialId?: number;
  staffId?: number;
}

interface ApiErrorBody {
  errors?: { field: string | null; message: string }[];
}

/** 一覧の絞り込み条件のまま生産記録の xlsx をダウンロードする */
export async function downloadProductionRecordsXlsx(
  filter: ProductionRecordsXlsxFilter,
): Promise<void> {
  const query = new URLSearchParams();
  if (filter.from) query.set("from", filter.from);
  if (filter.to) query.set("to", filter.to);
  if (filter.materialId) query.set("material_id", String(filter.materialId));
  if (filter.staffId) query.set("staff_id", String(filter.staffId));

  const res = await fetch(`${API_BASE}/api/v1/production_records.xlsx?${query}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  const blob = await res.blob();
  const filename =
    parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
    "production_records.xlsx";

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function extractErrorMessage(res: Response): Promise<string> {
  if (res.status === 401) return "ログインが必要です。再度ログインしてください。";

  if (res.headers.get("Content-Type")?.includes("application/json")) {
    const body = (await res.json()) as ApiErrorBody;
    const message = body.errors?.[0]?.message;
    if (message) return message;
  }

  return "エクスポートに失敗しました。時間をおいて再度お試しください。";
}
