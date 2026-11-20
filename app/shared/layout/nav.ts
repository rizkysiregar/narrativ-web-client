import { Bell, Compass, House, Search, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  labelKey: "nav.home" | "nav.explore" | "nav.search" | "nav.notifications" | "nav.profile";
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: House },
  { to: "/explore", labelKey: "nav.explore", icon: Compass },
  { to: "/search", labelKey: "nav.search", icon: Search },
  { to: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { to: "/profile", labelKey: "nav.profile", icon: UserRound },
];
