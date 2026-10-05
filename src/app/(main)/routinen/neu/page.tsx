import type { Metadata } from "next";
import { emptyFormValues } from "@/components/routines/form-values";
import { RoutineForm } from "@/components/routines/routine-form";
import { PageHeader } from "@/components/ui/misc";
import { ROUTINE_TYPES, type RoutineType } from "@/domain/routines/schedule";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { toLocalDateKey } from "@/lib/dates/zoned";
import { getClock } from "@/server/clock";
import { getCategories } from "@/server/routines/queries";

export const metadata: Metadata = { title: "Neue Routine" };

function parseType(value: string | string[] | undefined): RoutineType {
  return ROUTINE_TYPES.find((type) => type === value) ?? "INTERVAL";
}

export default async function NewRoutinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await getCurrentUserId();
  const [clock, categories, params] = await Promise.all([getClock(userId), getCategories(userId), searchParams]);
  const type = parseType(params.typ);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={type === "ONE_OFF" ? "Einmalige Aufgabe" : "Neue Routine"} />
      <RoutineForm
        mode="create"
        categories={categories.map(({ id, name }) => ({ id, name }))}
        initialValues={emptyFormValues(toLocalDateKey(clock.now, clock.timeZone), type)}
      />
    </div>
  );
}
