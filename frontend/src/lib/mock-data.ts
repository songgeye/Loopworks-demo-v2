import type { Company, Material, ProductionRecord, Staff } from "./types";

/**
 * 開発用のモックデータ。
 *
 * Rails 側に JSON API がまだ無いため、画面確認用のデータをここで組み立てている。
 * API を生やしたら src/lib/api.ts の参照先をこのファイルから fetch に差し替えるだけでよい。
 *
 * 「今日」は下の TODAY で固定している。日付を Date.now() から取ると
 * サーバー描画とクライアント描画で値がずれる（hydration mismatch）ため、
 * モックの間は固定値を使う。
 */
export const TODAY = "2026-07-09";

export const materials: Material[] = [
  { id: 1, name: "鉄スクラップ", displayOrder: 1, deletedAt: null },
  { id: 2, name: "H鋼", displayOrder: 2, deletedAt: null },
  { id: 3, name: "アルミサッシ", displayOrder: 3, deletedAt: null },
  { id: 4, name: "ステンレス", displayOrder: 4, deletedAt: null },
  { id: 5, name: "銅線", displayOrder: 5, deletedAt: null },
  { id: 6, name: "真鍮", displayOrder: 6, deletedAt: null },
];

export const staffs: Staff[] = [
  { id: 1, username: "yamada", name: "山田 太郎", role: "admin", deletedAt: null },
  { id: 2, username: "sato", name: "佐藤 一郎", role: "staff", deletedAt: null },
  { id: 3, username: "tanaka", name: "田中 花子", role: "staff", deletedAt: null },
  { id: 4, username: "suzuki", name: "鈴木 次郎", role: "staff", deletedAt: null },
];

export const companies: Company[] = [
  { id: 1, name: "丸和金属", deletedAt: null },
  { id: 2, name: "共栄解体工業", deletedAt: null },
  { id: 3, name: "北関東リサイクル", deletedAt: null },
  { id: 4, name: "山口商店", deletedAt: null },
];

/** 買取伝票の持込元を疑似的に割り当てる（5件に1件は伝票なしの持込として null） */
function companyIdFor(id: number): number | null {
  if (id % 5 === 0) return null;
  return companies[id % companies.length].id;
}

/** [時刻, 品目ID, 作業者ID, 重量kg] */
type Row = [string, number, number, number];

/** 本日分：28件・合計 12,450kg */
const todayRows: Row[] = [
  ["06:05", 1, 4, 420],
  ["06:18", 1, 3, 380],
  ["06:32", 5, 1, 150],
  ["06:45", 2, 2, 610],
  ["06:58", 3, 3, 240],
  ["07:10", 1, 4, 530],
  ["07:22", 4, 1, 310],
  ["07:35", 6, 2, 95],
  ["07:47", 1, 3, 470],
  ["07:59", 2, 4, 720],
  ["08:08", 3, 1, 285],
  ["08:17", 5, 2, 175],
  ["08:25", 1, 3, 440],
  ["08:33", 4, 4, 355],
  ["08:41", 2, 1, 580],
  ["08:49", 1, 2, 405],
  ["08:56", 6, 3, 120],
  ["09:03", 3, 4, 260],
  ["09:10", 5, 1, 195],
  ["09:17", 1, 2, 490],
  ["09:24", 4, 3, 330],
  ["09:29", 2, 4, 665],
  ["09:33", 1, 1, 445],
  ["09:35", 3, 2, 270],
  ["09:41", 4, 1, 940],
  ["11:05", 1, 3, 560],
  ["14:18", 2, 2, 1230],
  ["15:32", 3, 1, 780],
];

/** 直近平均から大きく外れたため、確認のうえ登録された記録 */
const anomalyKeys = new Set(["2026-07-09T14:18:00"]);

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 決定性のある擬似乱数（seed 固定なのでサーバー／クライアントで同じ値になる） */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 品目ごとの標準的な1回あたりの重量レンジ */
const weightRange: Record<number, [number, number]> = {
  1: [350, 680],
  2: [520, 780],
  3: [200, 320],
  4: [280, 420],
  5: [120, 230],
  6: [80, 150],
};

const records: ProductionRecord[] = [];
let nextId = 1;

// 過去分：6/1〜7/8（日曜は休み）をシードから生成して集計画面のデータにする
const rand = mulberry32(20260709);

function generatePastDay(year: number, month: number, day: number): void {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (weekday === 0) return; // 日曜は稼働なし

  const count = 18 + Math.floor(rand() * 12); // 18〜29件
  let minutes = 6 * 60 + Math.floor(rand() * 20);

  for (let i = 0; i < count; i += 1) {
    const materialId = 1 + Math.floor(rand() * materials.length);
    const staffId = 1 + Math.floor(rand() * staffs.length);
    const [min, max] = weightRange[materialId];
    const weight = Math.round((min + rand() * (max - min)) / 5) * 5;

    minutes += 8 + Math.floor(rand() * 22);
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    if (hh >= 18) break;

    const id = nextId++;
    records.push({
      id,
      recordedAt: `${year}-${pad(month)}-${pad(day)}T${pad(hh)}:${pad(mm)}:00`,
      materialId,
      weightKg: weight,
      staffId,
      status: "published",
      note: null,
      flaggedAsAnomaly: false,
      companyId: companyIdFor(id),
      deletedAt: null,
    });
  }
}

for (let day = 1; day <= 30; day += 1) generatePastDay(2026, 6, day);
for (let day = 1; day <= 8; day += 1) generatePastDay(2026, 7, day);

// 下書きのまま残っている記録（集計には含めない）
{
  const id = nextId++;
  records.push({
    id,
    recordedAt: "2026-07-08T16:40:00",
    materialId: 5,
    weightKg: 210,
    staffId: 4,
    status: "draft",
    note: "計量器の再校正待ち。値は暫定。",
    flaggedAsAnomaly: false,
    companyId: companyIdFor(id),
    deletedAt: null,
  });
}

for (const [time, materialId, staffId, weightKg] of todayRows) {
  const recordedAt = `${TODAY}T${time}:00`;
  const id = nextId++;
  records.push({
    id,
    recordedAt,
    materialId,
    weightKg,
    staffId,
    status: "published",
    note: anomalyKeys.has(recordedAt) ? "解体現場からの大口搬入。計量2回確認済み。" : null,
    flaggedAsAnomaly: anomalyKeys.has(recordedAt),
    companyId: companyIdFor(id),
    deletedAt: null,
  });
}

export const productionRecords: ProductionRecord[] = records;
