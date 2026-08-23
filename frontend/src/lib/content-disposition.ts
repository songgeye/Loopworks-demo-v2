/**
 * Content-Disposition ヘッダからファイル名を取り出す。
 * `filename*=UTF-8''...`（RFC 5987）を優先して解釈し、日本語ファイル名の文字化けを避ける。
 * 見つからない場合のみ `filename="..."` の素朴な形式にフォールバックする。
 */
export function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const rfc5987Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (rfc5987Match) {
    try {
      return decodeURIComponent(rfc5987Match[1]);
    } catch {
      // 不正なパーセントエンコーディングの場合はフォールバックへ
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch ? plainMatch[1] : null;
}
