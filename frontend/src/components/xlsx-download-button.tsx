"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadProductionRecordsXlsx } from "@/lib/xlsx-export";
import { Button } from "./form-controls";

interface Props {
  from?: string;
  to?: string;
  materialId?: number;
  staffId?: number;
  disabled?: boolean;
}

export function XlsxDownloadButton({ from, to, materialId, staffId, disabled }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // トーストは数秒で自動的に消す
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleClick() {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadProductionRecordsXlsx({ from, to, materialId, staffId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "エクスポートに失敗しました");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={handleClick}
        disabled={disabled || isDownloading}
        aria-busy={isDownloading}
      >
        {isDownloading ? (
          <Loader2 size={18} className="animate-spin" aria-hidden />
        ) : (
          <Download size={18} aria-hidden />
        )}
        {isDownloading ? "出力中…" : "Excel出力"}
      </Button>

      {error ? (
        <div
          role="alert"
          className="fixed right-6 bottom-6 z-50 max-w-sm rounded-xl border border-danger/40 bg-card px-5 py-4 text-sm text-danger shadow-xl"
        >
          {error}
        </div>
      ) : null}
    </>
  );
}
