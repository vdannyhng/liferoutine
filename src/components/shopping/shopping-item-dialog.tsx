"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { FALLBACK_SHOPPING_CATEGORY, SHOPPING_CATEGORIES } from "@/domain/shopping/grouping";
import { de } from "@/lib/i18n/de";
import { deleteShoppingItemAction, updateShoppingItemAction } from "@/server/shopping/actions";
import type { ShoppingItemView } from "@/server/shopping/queries";

interface ShoppingItemDialogProps {
  item: ShoppingItemView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShoppingItemDialog({ item, open, onOpenChange }: ShoppingItemDialogProps) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantityText = String(form.get("quantity") ?? "").replace(",", ".").trim();
    setPending(true);
    try {
      const result = await updateShoppingItemAction({
        id: item.id,
        name: String(form.get("name") ?? ""),
        quantity: quantityText ? Number(quantityText) : null,
        unit: String(form.get("unit") ?? ""),
        category: String(form.get("category") ?? ""),
        note: String(form.get("note") ?? ""),
      });
      if (result.ok) {
        onOpenChange(false);
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    } catch {
      toast.error(de.toast.offline);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const result = await deleteShoppingItemAction({ id: item.id });
      if (result.ok) {
        toast(`${item.name} entfernt`);
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(de.toast.offline);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Artikel bearbeiten">
        <form onSubmit={save} className="space-y-4">
          <Field label="Name" htmlFor="item-name" error={errors.name}>
            <Input id="item-name" name="name" defaultValue={item.name} required maxLength={100} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Menge" htmlFor="item-quantity" error={errors.quantity}>
              <Input
                id="item-quantity"
                name="quantity"
                inputMode="decimal"
                defaultValue={item.quantity ?? ""}
                placeholder="z. B. 2"
              />
            </Field>
            <Field label="Einheit" htmlFor="item-unit">
              <Input id="item-unit" name="unit" defaultValue={item.unit ?? ""} maxLength={20} placeholder="z. B. Liter" />
            </Field>
          </div>
          <Field label="Kategorie" htmlFor="item-category">
            <Input
              id="item-category"
              name="category"
              list="shopping-categories"
              defaultValue={item.category ?? ""}
              maxLength={40}
              placeholder={FALLBACK_SHOPPING_CATEGORY}
            />
            <datalist id="shopping-categories">
              {SHOPPING_CATEGORIES.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Field>
          <Field label="Notiz" htmlFor="item-note">
            <Input id="item-note" name="note" defaultValue={item.note ?? ""} maxLength={200} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" className="text-destructive sm:mr-auto" onClick={remove} disabled={pending}>
              Entfernen
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {de.actions.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {de.actions.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
