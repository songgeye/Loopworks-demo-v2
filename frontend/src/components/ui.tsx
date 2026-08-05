import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: number | string;
  unit: string;
  /** 主要指標は数値をアクセントカラーで見せる */
  highlight?: boolean;
  icon?: LucideIcon;
}

export function StatCard({ label, value, unit, highlight, icon: Icon }: StatCardProps) {
  return (
    <div className="lw-card flex items-center justify-between gap-3 px-6 py-5 sm:px-7 sm:py-6">
      <div className="min-w-0">
        <p className="text-base text-fg-muted">{label}</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span
            className={`tnum text-5xl leading-none font-bold sm:text-6xl ${
              highlight ? "text-accent" : "text-fg"
            }`}
          >
            {typeof value === "number" ? formatNumber(value) : value}
          </span>
          <span className="text-lg text-fg-muted">{unit}</span>
        </p>
      </div>
      {Icon ? <Icon size={40} className="shrink-0 text-fg" aria-hidden /> : null}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  /** 見出し右側のリンク（「すべて見る >」など） */
  action?: { href: string; label: string };
  children: React.ReactNode;
  /** 本文の左右パディングを外す（テーブルや行区切りを端まで引くとき） */
  flush?: boolean;
}

export function SectionCard({ title, action, children, flush }: SectionCardProps) {
  return (
    <section className="lw-card overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 py-5 sm:px-7">
        <h2 className="text-xl font-bold">{title}</h2>
        {action ? (
          <Link
            href={action.href}
            className="flex items-center gap-1 text-sm font-medium text-fg-muted transition-colors hover:text-accent"
          >
            {action.label}
            <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className={flush ? "" : "px-6 pb-6 sm:px-7"}>{children}</div>
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "warn";
}) {
  const tones = {
    neutral: "border-line bg-card-2 text-fg-muted",
    accent: "border-accent/40 bg-accent/10 text-accent",
    warn: "border-warn/40 bg-warn/10 text-warn",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="px-6 py-12 text-center text-base text-fg-muted sm:px-7">{message}</p>
  );
}
