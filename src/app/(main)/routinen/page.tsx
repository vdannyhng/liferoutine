import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RoutineList } from "@/components/routines/routine-list";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getClock } from "@/server/clock";
import { listRoutines } from "@/server/routines/queries";

export const metadata: Metadata = { title: "Routinen" };

export default async function RoutinesPage() {
  const userId = await getCurrentUserId();
  const routines = await listRoutines(userId, await getClock(userId));
  return (
    <>
      <PageHeader
        title="Routinen"
        action={
          <Link href="/routinen/neu" className={`${buttonVariants({ variant: "secondary" })} hidden sm:inline-flex`}>
            <Plus aria-hidden /> Neue Routine
          </Link>
        }
      />
      <RoutineList routines={routines} />
    </>
  );
}
