"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-8 bg-sidebar px-6 py-8 lg:flex print:!hidden">
      <Link
        href="/"
        className="flex items-center gap-3 rounded-2xl px-2 py-1"
      >
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-ink"
        >
          ∞
        </span>
        <span className="text-2xl font-bold tracking-tight">Loopworks</span>
      </Link>

      <nav aria-label="メインメニュー">
        <ul className="flex flex-col gap-2">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "lw-glow flex items-center gap-4 rounded-2xl bg-accent px-5 py-4 text-lg font-bold text-ink"
                      : "flex items-center gap-4 rounded-2xl px-5 py-4 text-lg font-medium text-fg transition-colors hover:bg-card"
                  }
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] px-5 py-4">
        <p className="text-sm font-bold text-accent">AIチェック稼働中</p>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          入力値の異常傾向を現場で検知し、確認漏れを防ぎます。
        </p>
      </div>
    </aside>
  );
}

/** 画面幅の狭い端末（スマホ・縦持ちタブレット）向けの下部タブ */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sidebar/95 backdrop-blur lg:hidden print:hidden"
    >
      <ul className="flex">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                  active ? "text-accent" : "text-fg-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
