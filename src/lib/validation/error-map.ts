import { z } from "zod";

/** German fallback messages for validation issues without a custom message. */
const germanErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === "integer") return { message: "Bitte gib eine ganze Zahl ein" };
      if (issue.expected === "number") return { message: "Bitte gib eine Zahl ein" };
      if (issue.received === "undefined" || issue.received === "null") return { message: "Pflichtfeld" };
      return { message: "Ungültiger Wert" };
    case z.ZodIssueCode.too_small:
      if (issue.type === "string" && issue.minimum === 1) return { message: "Pflichtfeld" };
      return { message: `Mindestens ${issue.minimum}` };
    case z.ZodIssueCode.too_big:
      return { message: `Höchstens ${issue.maximum}` };
    case z.ZodIssueCode.invalid_enum_value:
    case z.ZodIssueCode.invalid_union_discriminator:
      return { message: "Ungültige Auswahl" };
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(germanErrorMap);
