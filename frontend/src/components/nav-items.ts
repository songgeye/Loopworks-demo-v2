import {
  ClipboardList,
  FileText,
  House,
  PackagePlus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/records", label: "記録", icon: FileText },
  { href: "/summary", label: "集計", icon: ClipboardList },
  { href: "/master", label: "マスタ", icon: PackagePlus },
  { href: "/settings", label: "設定", icon: Settings },
];

/** ルート以外は前方一致で判定する（/records/new でも「記録」を選択状態にする） */
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
