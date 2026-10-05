import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RoutineView } from "@/server/routines/view";
import { ClockProvider } from "@/components/layout/clock-context";
import { RoutineCard } from "./routine-card";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/server/routines/actions", () => ({}));

function render(ui: ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <ClockProvider value={{ timeZone: "Europe/Berlin", todayKey: "2026-10-05" }}>{children}</ClockProvider>
    ),
  });
}

const base: RoutineView = {
  id: "r1",
  title: "Staubsaugen",
  description: null,
  icon: "sparkles",
  categoryId: "c1",
  categoryName: "Haushalt",
  type: "INTERVAL",
  priority: "NORMAL",
  isPaused: false,
  scheduleLabel: "Alle 7 Tage",
  statusLabel: "Seit gestern fällig",
  relativeLabel: "Seit gestern fällig",
  tone: "overdue",
  lastDoneLabel: "Zuletzt vor 8 Tagen",
  snoozedLabel: null,
  weekly: null,
  nextDueAt: null,
  lastDoneAt: null,
};

describe("RoutineCard", () => {
  it("shows title, category, status and last completion", () => {
    render(<RoutineCard routine={base} onComplete={() => {}} />);
    expect(screen.getByRole("heading", { name: "Staubsaugen" })).toBeInTheDocument();
    expect(screen.getByText("Haushalt · Alle 7 Tage")).toBeInTheDocument();
    expect(screen.getByText("Seit gestern fällig")).toBeInTheDocument();
    expect(screen.getByText("Zuletzt vor 8 Tagen")).toBeInTheDocument();
  });

  it("completes with a single tap", async () => {
    const onComplete = vi.fn();
    render(<RoutineCard routine={base} onComplete={onComplete} />);
    await userEvent.click(screen.getByRole("button", { name: "Staubsaugen: Erledigt" }));
    expect(onComplete).toHaveBeenCalledWith(base);
  });

  it("shows weekly progress including optimistic completions", () => {
    const gym: RoutineView = {
      ...base,
      title: "Gym",
      type: "WEEKLY_GOAL",
      tone: "neutral",
      statusLabel: "Diese Woche noch 2×",
      weekly: { completed: 1, target: 3 },
    };
    const { rerender } = render(<RoutineCard routine={gym} onComplete={() => {}} />);
    expect(screen.getByRole("img", { name: "1 von 3" })).toBeInTheDocument();
    rerender(<RoutineCard routine={gym} pendingCount={2} onComplete={() => {}} />);
    expect(screen.getByText("3 von 3 diese Woche")).toBeInTheDocument();
    expect(screen.getByText("Wochenziel erreicht")).toBeInTheDocument();
  });
});
