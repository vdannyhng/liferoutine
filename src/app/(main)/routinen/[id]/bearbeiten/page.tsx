import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { emptyFormValues, scheduleToFormValues } from "@/components/routines/form-values";
import { RoutineForm } from "@/components/routines/routine-form";
import { PageHeader } from "@/components/ui/misc";
import { isIconKey } from "@/domain/icons";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { toLocalDateKey } from "@/lib/dates/zoned";
import { getClock } from "@/server/clock";
import { getCategories, getRoutineForEdit } from "@/server/routines/queries";

export const metadata: Metadata = { title: "Routine bearbeiten" };

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const [clock, categories, routine] = await Promise.all([
    getClock(userId),
    getCategories(userId),
    getRoutineForEdit(userId, id),
  ]);
  if (!routine) notFound();

  const base = emptyFormValues(toLocalDateKey(clock.now, clock.timeZone), routine.schedule.type);
  const initialValues = scheduleToFormValues(routine.schedule, {
    ...base,
    title: routine.title,
    description: routine.description ?? "",
    categoryId: routine.categoryId ?? "",
    icon: routine.icon && isIconKey(routine.icon) ? routine.icon : "",
    priority: routine.priority,
    reminder: routine.reminder.offset,
    estimatedMinutes: routine.estimatedMinutes ? String(routine.estimatedMinutes) : "",
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Routine bearbeiten" subtitle="Bisherige Einträge im Verlauf bleiben unverändert." />
      <RoutineForm
        mode="edit"
        routineId={routine.id}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initialValues={initialValues}
      />
    </div>
  );
}
