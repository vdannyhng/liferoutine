"use client";

import { Check, Pencil, ShoppingCart } from "lucide-react";
import { useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { groupShoppingItems } from "@/domain/shopping/grouping";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { SHOPPING_NAME_MAX_LENGTH } from "@/lib/validation/shopping";
import type { ActionResult } from "@/server/errors";
import {
  addShoppingItemAction,
  completeShoppingAction,
  toggleShoppingItemAction,
} from "@/server/shopping/actions";
import type { ShoppingItemView } from "@/server/shopping/queries";
import { ShoppingItemDialog } from "./shopping-item-dialog";

type Change =
  | { type: "add"; item: ShoppingItemView }
  | { type: "toggle"; id: string; checked: boolean };

function applyChange(items: ShoppingItemView[], change: Change): ShoppingItemView[] {
  switch (change.type) {
    case "add":
      return [...items, change.item];
    case "toggle":
      return items.map((item) => (item.id === change.id ? { ...item, isChecked: change.checked } : item));
  }
}

async function call<T>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch {
    return { ok: false, error: de.toast.offline };
  }
}

const quantityFormat = new Intl.NumberFormat(de.locale, { maximumFractionDigits: 2 });

function quantityLabel(item: ShoppingItemView): string | null {
  if (item.quantity === null && !item.unit) return null;
  return [item.quantity !== null ? quantityFormat.format(item.quantity) : null, item.unit].filter(Boolean).join(" ");
}

interface ShoppingListProps {
  items: ShoppingItemView[];
  frequentItems: string[];
  autoFocus: boolean;
}

export function ShoppingList({ items, frequentItems, autoFocus }: ShoppingListProps) {
  const [optimisticItems, applyOptimistic] = useOptimistic(items, applyChange);
  const [, startTransition] = useTransition();
  const [hideChecked, setHideChecked] = useState(false);
  const [editing, setEditing] = useState<ShoppingItemView | null>(null);
  const [completing, setCompleting] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const checkedCount = optimisticItems.filter((i) => i.isChecked).length;
  const groups = groupShoppingItems(hideChecked ? optimisticItems.filter((i) => !i.isChecked) : optimisticItems);
  const suggestions = frequentItems.filter(
    (suggestion) => !optimisticItems.some((i) => i.name.toLocaleLowerCase("de") === suggestion.toLocaleLowerCase("de")),
  );

  function add(itemName: string) {
    const trimmed = itemName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        item: { id: `temp-${crypto.randomUUID()}`, name: trimmed, quantity: null, unit: null, category: null, note: null, isChecked: false },
      });
      const result = await call(() => addShoppingItemAction({ name: trimmed }));
      if (!result.ok) toast.error(result.error, { action: { label: de.actions.retry, onClick: () => add(trimmed) } });
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    add(name);
    setName("");
    inputRef.current?.focus();
  }

  function toggle(item: ShoppingItemView) {
    if (item.id.startsWith("temp-")) return;
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: item.id, checked: !item.isChecked });
      const result = await call(() => toggleShoppingItemAction({ id: item.id, checked: !item.isChecked }));
      if (!result.ok) toast.error(result.error);
    });
  }

  async function completeShopping() {
    setCompleting(true);
    const result = await call(() => completeShoppingAction());
    setCompleting(false);
    if (result.ok) toast.success(`Einkauf abgeschlossen · ${result.data.itemCount} Artikel`);
    else toast.error(result.error);
  }

  return (
    // Bottom padding keeps the last items clear of the docked input on phones.
    <div className="space-y-6 pb-16 md:pb-0">
      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0"
      >
        <div className="mx-auto flex max-w-5xl gap-2">
          <label htmlFor="quick-add" className="sr-only">
            Artikel hinzufügen
          </label>
          <Input
            ref={inputRef}
            id="quick-add"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Artikel hinzufügen …"
            maxLength={SHOPPING_NAME_MAX_LENGTH}
            autoComplete="off"
            enterKeyHint="done"
            autoFocus={autoFocus}
          />
          <Button type="submit" disabled={!name.trim()}>
            Hinzufügen
          </Button>
        </div>
      </form>

      {suggestions.length > 0 ? (
        <section aria-labelledby="suggestions-heading">
          <h2 id="suggestions-heading" className="mb-2 text-sm font-medium text-muted-foreground">
            Schon mal gekauft
          </h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => add(suggestion)}
                className="h-9 rounded-full border border-border bg-surface px-3 text-sm hover:bg-surface-muted"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {optimisticItems.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Deine Einkaufsliste ist leer."
          action={<Button onClick={() => inputRef.current?.focus()}>Artikel hinzufügen</Button>}
        />
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.category} aria-label={group.category}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{group.category}</h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {group.items.map((item) => (
                  <li key={item.id} className="flex items-center">
                    <label className="flex min-h-14 flex-1 cursor-pointer items-center gap-3 px-4 py-2">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={item.isChecked}
                        disabled={item.id.startsWith("temp-")}
                        onChange={() => toggle(item)}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "inline-flex size-6 shrink-0 items-center justify-center rounded-lg border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                          item.isChecked ? "border-done bg-done text-white dark:text-background" : "border-muted-foreground/60",
                        )}
                      >
                        {item.isChecked ? <Check className="size-4" strokeWidth={3} /> : null}
                      </span>
                      <span className={cn("min-w-0 flex-1", item.isChecked && "text-muted-foreground line-through")}>
                        <span className="block truncate">{item.name}</span>
                        {quantityLabel(item) || item.note ? (
                          <span className="block truncate text-sm text-muted-foreground no-underline">
                            {[quantityLabel(item), item.note].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-1 text-muted-foreground"
                      aria-label={`${item.name} bearbeiten`}
                      disabled={item.id.startsWith("temp-")}
                      onClick={() => setEditing(item)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                checked={hideChecked}
                onChange={(e) => setHideChecked(e.target.checked)}
              />
              Erledigte Artikel ausblenden
            </label>
            <Button onClick={completeShopping} disabled={checkedCount === 0 || completing}>
              <Check aria-hidden /> Einkauf abschließen{checkedCount > 0 ? ` (${checkedCount})` : ""}
            </Button>
          </div>
        </>
      )}

      {editing ? (
        <ShoppingItemDialog item={editing} open onOpenChange={(open) => !open && setEditing(null)} />
      ) : null}
    </div>
  );
}
