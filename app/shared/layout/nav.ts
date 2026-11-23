import { Bell, House, MessageCircle, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  labelKey: "nav.home" | "nav.messages" | "nav.notifications" | "nav.profile";
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: House },
  { to: "/messages", labelKey: "nav.messages", icon: MessageCircle },
  { to: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { to: "/profile", labelKey: "nav.profile", icon: UserRound },
];
