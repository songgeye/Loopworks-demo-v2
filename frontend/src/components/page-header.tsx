import { Bell } from "lucide-react";
import { SearchBox } from "./search-box";

interface PageHeaderProps {
  /** タイトル上の小見出し */
  label: string;
  title: string;
  /** 検索窓を出さない画面ではここに操作ボタンを置く */
  children?: React.ReactNode;
}

export function PageHeader({ label, title, children }: PageHeaderProps) {
  return (
    <header className="lw-card flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-7">
      <div>
        <p className="text-sm font-bold text-accent">{label}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {children ?? <SearchBox />}
        <button
          type="button"
          aria-label="お知らせ"
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-card-2 text-fg transition-colors hover:border-accent/50"
        >
          <Bell size={20} aria-hidden />
        </button>
      </div>
    </header>
  );
}
