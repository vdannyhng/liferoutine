"use client";

import { History, House, ListChecks, Plus, Settings, ShoppingCart, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { AddMenu } from "./add-menu";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: de.nav.today, icon: House },
  { href: "/routinen", label: de.nav.routines, icon: ListChecks },
  { href: "/einkauf", label: de.nav.shopping, icon: ShoppingCart },
  { href: "/verlauf", label: de.nav.history, icon: History },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-6 md:flex">
      <p className="mb-8 px-3 text-xl font-semibold tracking-tight">{de.appName}</p>
      <nav aria-label={de.nav.main} className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <AddMenu
          trigger={
            <button
              type="button"
              className="mt-4 flex h-11 items-center gap-3 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Plus className="size-5" aria-hidden />
              {de.nav.add}
            </button>
          }
        />
        <div className="mt-auto border-t border-border pt-3">
          <SidebarLink
            item={{ href: "/einstellungen", label: de.nav.settings, icon: Settings }}
            active={isActive(pathname, "/einstellungen")}
          />
        </div>
      </nav>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {item.label}
    </Link>
  );
}

export function MobileTopBar() {
  const pathname = usePathname();
  return (
    <div className="flex h-14 items-center justify-between px-4 md:hidden">
      <span className="text-base font-semibold tracking-tight">{de.appName}</span>
      <Link
        href="/einstellungen"
        aria-label={de.nav.settings}
        aria-current={isActive(pathname, "/einstellungen") ? "page" : undefined}
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted"
      >
        <Settings className="size-5" aria-hidden />
      </Link>
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [first, second, third, fourth] = NAV_ITEMS as [NavItem, NavItem, NavItem, NavItem];
  return (
    <nav
      aria-label={de.nav.main}
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
        {[first, second].map((item) => (
          <BottomLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <li className="flex justify-center">
          <AddMenu
            trigger={
              <button
                type="button"
                aria-label={de.nav.add}
                className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md hover:bg-primary-hover"
              >
                <Plus className="size-6" aria-hidden />
              </button>
            }
          />
        </li>
        {[third, fourth].map((item) => (
          <BottomLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </ul>
    </nav>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
        {item.label}
      </Link>
    </li>
  );
}
