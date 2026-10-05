import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Seite nicht gefunden</h1>
      <p className="mt-2 text-muted-foreground">Diese Seite gibt es nicht (mehr).</p>
      <Link href="/" className={`${buttonVariants()} mt-6`}>
        Zu „Heute“
      </Link>
    </main>
  );
}
