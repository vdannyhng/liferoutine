import { describe, expect, it } from "vitest";
import { groupShoppingItems } from "./grouping";

const item = (name: string, category: string | null, isChecked = false) => ({ name, category, isChecked });

describe("groupShoppingItems", () => {
  it("groups by category in store order with Sonstiges last", () => {
    const groups = groupShoppingItems([
      item("Kaffee", null),
      item("Waschmittel", "Haushalt"),
      item("Bananen", "Obst & Gemüse"),
      item("Tomaten", "Obst & Gemüse"),
      item("Batterien", "Elektro"),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["Obst & Gemüse", "Haushalt", "Elektro", "Sonstiges"]);
    expect(groups[0]!.items.map((i) => i.name)).toEqual(["Bananen", "Tomaten"]);
  });

  it("puts checked items at the end of their group", () => {
    const groups = groupShoppingItems([item("Milch", null, true), item("Brot", null), item("Eier", null)]);
    expect(groups[0]!.items.map((i) => i.name)).toEqual(["Brot", "Eier", "Milch"]);
  });

  it("treats blank categories as Sonstiges", () => {
    expect(groupShoppingItems([item("Salz", "  ")])[0]!.category).toBe("Sonstiges");
  });
});
