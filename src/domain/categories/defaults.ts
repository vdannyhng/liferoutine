import type { IconKey } from "@/domain/icons";

export interface DefaultCategory {
  name: string;
  icon: IconKey;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: "Haushalt", icon: "home" },
  { name: "Sport", icon: "dumbbell" },
  { name: "Einkauf", icon: "shopping-cart" },
  { name: "Müll & Recycling", icon: "trash" },
  { name: "Gesundheit", icon: "heart" },
  { name: "Wartung", icon: "wrench" },
  { name: "Auto", icon: "car" },
  { name: "Pflanzen", icon: "leaf" },
  { name: "Finanzen", icon: "wallet" },
  { name: "Persönlich", icon: "user" },
];
