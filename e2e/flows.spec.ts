import { expect, test, type Page } from "@playwright/test";

async function openNewRoutineForm(page: Page) {
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  await page.getByRole("button", { name: /Neue Routine/ }).click();
  await expect(page.getByRole("heading", { name: "Neue Routine" })).toBeVisible();
}

test("Flow 1: create an interval routine and complete it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#inhalt").getByText("Noch keine Routinen")).toBeVisible();

  await openNewRoutineForm(page);
  await page.getByLabel("Titel").fill("Staubsaugen");
  await expect(page.getByLabel("Rhythmus")).toHaveValue("INTERVAL");
  await page.getByLabel("Anzahl").fill("7");
  await page.getByRole("button", { name: "Routine erstellen" }).click();

  await expect(page).toHaveURL("/");
  const today = page.locator("section", { has: page.locator("#section-today") });
  await expect(today.getByRole("heading", { name: "Staubsaugen" })).toBeVisible();
  await expect(today.getByText("Heute fällig")).toBeVisible();

  await page.getByRole("button", { name: "Staubsaugen: Erledigt" }).click();
  await expect(page.getByText("Staubsaugen erledigt")).toBeVisible();
  await expect(today.getByRole("heading", { name: "Staubsaugen" })).toHaveCount(0);
  const upcoming = page.locator("section", { has: page.locator("#section-upcoming") });
  await expect(upcoming.getByText("in 7 Tagen")).toBeVisible();
});

test("Flow 2: weekly goal shows 2/3 after two sessions", async ({ page }) => {
  await page.goto("/");
  await openNewRoutineForm(page);
  await page.getByLabel("Titel").fill("Gym");
  await page.getByLabel("Rhythmus").selectOption("WEEKLY_GOAL");
  await page.getByLabel("Wie oft pro Woche?").fill("3");
  await page.getByRole("button", { name: "Routine erstellen" }).click();
  await expect(page).toHaveURL("/");

  const done = page.getByRole("button", { name: "Gym: Erledigt" });
  await done.click();
  await expect(page.getByText("1 von 3 diese Woche")).toBeVisible();
  await done.click();
  await expect(page.getByText("2 von 3 diese Woche")).toBeVisible();

  await page.reload();
  await expect(page.getByText("2 von 3 diese Woche")).toBeVisible();
});

test("Flow 3: add milk, check it off and finish shopping", async ({ page }) => {
  await page.goto("/einkauf");
  await expect(page.locator("#inhalt").getByText("Deine Einkaufsliste ist leer.")).toBeVisible();

  await page.getByLabel("Artikel hinzufügen").fill("Milch");
  await page.getByLabel("Artikel hinzufügen").press("Enter");
  const milk = page.getByRole("checkbox", { name: "Milch" });
  await expect(milk).toBeVisible();
  await expect(milk).toBeEnabled();

  await page.locator("label", { hasText: "Milch" }).click();
  await expect(milk).toBeChecked();

  await page.getByRole("button", { name: /Einkauf abschließen/ }).click();
  await expect(page.getByText("Einkauf abgeschlossen · 1 Artikel")).toBeVisible();
  await expect(page.locator("#inhalt").getByText("Deine Einkaufsliste ist leer.")).toBeVisible();

  await page.goto("/verlauf");
  await expect(page.getByText("Einkauf abgeschlossen")).toBeVisible();
});
