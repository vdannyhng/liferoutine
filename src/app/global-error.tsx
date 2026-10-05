"use client";

/** Last-resort error page (e.g. database unreachable); renders its own document. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 480, margin: "10vh auto" }}>
        <h1 style={{ fontSize: 22 }}>Routine ist gerade nicht erreichbar.</h1>
        <p style={{ color: "#5c6066" }}>Bitte versuche es in einem Moment noch einmal.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 16, height: 44, padding: "0 16px", borderRadius: 12, border: "1px solid #e0e0da" }}
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
