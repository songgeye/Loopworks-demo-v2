import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { MobileNav, Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loopworks | 加工記録管理",
  description:
    "加工記録を、現場での一度の入力で残せるアプリ。品目・作業者ごとの累計を自動で集計します。",
};

export const viewport: Viewport = {
  themeColor: "#070b0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="min-h-dvh">
        <div className="flex min-h-dvh">
          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            {/* サイドバーが隠れる幅ではヘッダーにロゴを出す */}
            <div className="flex items-center gap-3 px-4 pt-4 lg:hidden print:hidden">
              <Link href="/" className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-xl bg-accent text-lg font-bold text-ink"
                >
                  ∞
                </span>
                <span className="text-lg font-bold tracking-tight">Loopworks</span>
              </Link>
            </div>

            <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 pb-28 lg:py-6 lg:pr-6 lg:pl-2 lg:pb-6">
              {children}
            </main>
          </div>
        </div>

        <MobileNav />
      </body>
    </html>
  );
}
