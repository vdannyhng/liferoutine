import type { Metadata } from "next";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { PageHeader } from "@/components/ui/misc";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getFrequentItems, getShoppingList } from "@/server/shopping/queries";

export const metadata: Metadata = { title: "Einkauf" };

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await getCurrentUserId();
  const [items, frequentItems, params] = await Promise.all([
    getShoppingList(userId),
    getFrequentItems(userId),
    searchParams,
  ]);
  const open = items.filter((item) => !item.isChecked).length;

  return (
    <>
      <PageHeader title="Einkauf" subtitle={open === 1 ? "1 Artikel offen" : `${open} Artikel offen`} />
      <ShoppingList items={items} frequentItems={frequentItems} autoFocus={params.neu === "1"} />
    </>
  );
}
