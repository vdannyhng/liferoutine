import { ZodError } from "zod";
import { de } from "@/lib/i18n/de";

/** An expected failure with a message that is safe to show to the user. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "VALIDATION" | "CONFLICT" = "VALIDATION",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/** Converts thrown errors into user-safe results; never leaks stack traces. */
export async function toActionResult<T>(fn: () => Promise<T>, fallbackError: string = de.errors.generic): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ZodError) {
      return { ok: false, error: de.errors.validation, fieldErrors: zodFieldErrors(error) };
    }
    if (error instanceof DomainError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: fallbackError };
  }
}
