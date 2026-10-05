export const SHOPPING_CATEGORIES = [
  "Obst & Gemüse",
  "Brot & Backwaren",
  "Milchprodukte",
  "Fleisch & Fisch",
  "Vorräte",
  "Tiefkühl",
  "Getränke",
  "Haushalt",
  "Drogerie",
] as const;

export const FALLBACK_SHOPPING_CATEGORY = "Sonstiges";

export interface GroupableItem {
  category: string | null;
  isChecked: boolean;
}

export interface ShoppingGroup<T> {
  category: string;
  items: T[];
}

function categoryOrder(category: string): number {
  const index = (SHOPPING_CATEGORIES as readonly string[]).indexOf(category);
  if (category === FALLBACK_SHOPPING_CATEGORY) return Number.MAX_SAFE_INTEGER;
  return index === -1 ? SHOPPING_CATEGORIES.length : index;
}

/**
 * Groups items by category (known categories in store order, custom ones
 * alphabetically, "Sonstiges" last). Within a group, open items come first;
 * otherwise the input order is kept.
 */
export function groupShoppingItems<T extends GroupableItem>(items: readonly T[]): ShoppingGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const category = item.category?.trim() || FALLBACK_SHOPPING_CATEGORY;
    const group = groups.get(category) ?? [];
    group.push(item);
    groups.set(category, group);
  }
  return [...groups]
    .map(([category, groupItems]) => ({
      category,
      items: [...groupItems.filter((i) => !i.isChecked), ...groupItems.filter((i) => i.isChecked)],
    }))
    .sort(
      (a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.category.localeCompare(b.category, "de"),
    );
}
