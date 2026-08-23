"use client";

import { Download } from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import type { ProductionRecordView } from "@/lib/types";
import { Button } from "./form-controls";

const HEADER = ["記録日", "記録時刻", "品目", "作業者", "重量kg", "状態", "異常値", "メモ"];

function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * 絞り込み結果をCSVで書き出す。
 * Excel が文字化けしないよう UTF-8 の BOM 付きで出力する。
 * Shift-JIS 版が必要になったら、変換は Rails 側のエクスポートに任せる。
 */
export function CsvDownloadButton({ records }: { records: ProductionRecordView[] }) {
  const handleClick = () => {
    const rows = records.map((r) => [
      formatDate(r.recordedAt),
      formatTime(r.recordedAt),
      r.materialName,
      r.staffName,
      String(r.weightKg),
      r.status === "draft" ? "下書き" : "公開",
      r.flaggedAsAnomaly ? "要確認" : "",
      r.note ?? "",
    ]);

    const csv = [HEADER, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");

    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "production_records.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" onClick={handleClick} disabled={records.length === 0}>
      <Download size={18} aria-hidden />
      CSV出力
    </Button>
  );
}
