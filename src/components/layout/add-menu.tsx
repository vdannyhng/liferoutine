"use client";

import { CalendarCheck, Repeat, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const OPTIONS = [
  {
    href: "/routinen/neu",
    icon: Repeat,
    title: "Neue Routine",
    description: "Wiederkehrend, z. B. alle 7 Tage oder 3× pro Woche",
  },
  {
    href: "/einkauf?neu=1",
    icon: ShoppingCart,
    title: "Einkaufsartikel",
    description: "Direkt auf die Einkaufsliste",
  },
  {
    href: "/routinen/neu?typ=ONE_OFF",
    icon: CalendarCheck,
    title: "Einmalige Aufgabe",
    description: "Mit Fälligkeitsdatum, wird nur einmal erledigt",
  },
] as const;

export function AddMenu({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Hinzufügen" description="Was möchtest du anlegen?">
        <ul className="space-y-2">
          {OPTIONS.map(({ href, icon: Icon, title, description }) => (
            <li key={href}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(href);
                }}
                className="flex w-full items-center gap-4 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-surface-muted"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-surface-muted">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-muted-foreground">{description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
