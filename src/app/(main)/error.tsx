"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={CircleAlert}
      title="Das hat leider nicht geklappt."
      description="Die Seite konnte nicht geladen werden. Prüfe deine Verbindung und versuche es noch einmal."
      action={<Button onClick={reset}>Erneut versuchen</Button>}
    />
  );
}
