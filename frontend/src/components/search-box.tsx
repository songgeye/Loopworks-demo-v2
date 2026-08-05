"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** 品目名・作業者名で記録一覧を絞り込む。送信すると記録画面へ遷移する。 */
export function SearchBox() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = keyword.trim();
        router.push(q ? `/records?keyword=${encodeURIComponent(q)}` : "/records");
      }}
      className="flex h-12 items-center gap-2 rounded-full border border-line bg-card-2 px-5 focus-within:border-accent/50 sm:w-64 md:w-72"
    >
      <Search size={18} className="shrink-0 text-fg-muted" aria-hidden />
      <input
        type="search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="品目・作業者を検索"
        aria-label="品目・作業者を検索"
        className="min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-muted focus:outline-none"
      />
    </form>
  );
}
