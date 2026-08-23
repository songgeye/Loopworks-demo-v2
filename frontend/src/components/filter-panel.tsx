"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

/**
 * 絞り込み条件のカード。
 * 画面の狭い端末では条件が一覧を押し下げてしまうため、開閉できるようにする。
 * 初期状態は CSS で切り替えるので、サーバー描画との食い違いは起きない。
 */
export function FilterPanel({
  children,
  activeCount,
}: {
  children: React.ReactNode;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="lw-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left text-base font-bold sm:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={18} aria-hidden />
          絞り込み条件
          {activeCount > 0 ? (
            <span className="tnum rounded-full bg-accent px-2 py-0.5 text-xs text-ink">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>

      <div className={open ? "block" : "hidden sm:block"}>{children}</div>
    </section>
  );
}
