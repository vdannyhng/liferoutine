# Routine – Life Routine & Household Manager

Eine Mobile-first-Web-App (PWA) für wiederkehrende Alltagsaufgaben: Haushalt, Sport, Müll, Wartung, Pflanzen, Auto, Einkauf und mehr.
Die App beantwortet eine einzige Frage: **„Was sollte ich heute sinnvollerweise erledigen?“**

Statt Termine zu planen, legst du Rhythmen fest („Staubsaugen alle 7 Tage“, „Gym 3× pro Woche“, „Karton montags 19:00“). Die App berechnet daraus selbst, was überfällig ist, was heute ansteht und was demnächst kommt.

## Funktionen

- **Heute**: Überfällig, Heute, Diese Woche, Demnächst. Deterministisch priorisiert, mit „Erledigt“ per einem Tipp, optimistischer UI und „Rückgängig“.
- **Routinentypen**: `INTERVAL`, `WEEKLY_GOAL`, `FIXED_SCHEDULE` (auch „jede 2. Woche“), `ONE_OFF`, `MANUAL`.
- **Kontextmenü**: Heute erledigt, Anderes Datum (mit Dauer und Notiz), Verschieben, Überspringen, Bearbeiten, Pausieren/Fortsetzen („Rhythmus fortsetzen“ oder „Ab heute neu starten“), Löschen (mit oder ohne Historie).
- **Erinnerungs-Vorlauf**: z. B. „Am Vorabend“. Dann erscheint „Hausmüll“ schon am Vorabend unter „Heute“.
- **Routinen**: Suche, Kategorie-Filter, Aktiv/Pausiert, fünf Sortierungen.
- **Detailansicht** mit Statistik (Wochenziele der letzten 4 Wochen, durchschnittlicher Abstand, letzte 30 Tage) und Historie.
- **Einkauf**: Schnelleingabe (Enter), Gruppen, Abhaken, Bearbeiten, „Erledigte ausblenden“, „Einkauf abschließen“.
- **Verlauf**: nach Tagen gruppiert, gefiltert nach Kategorie, Einkauf, Sonstige und Zeitraum.
- **Einstellungen**: Name, Zeitzone, Hell/Dunkel/System, eigene Kategorien, JSON-Export.
- **Onboarding** mit Bereichen und Routine-Vorlagen. Vorlagen gibt es auch im Formular.
- **PWA**: Manifest, App-Icons und ein Offline-Fallback per Service Worker (nur im Production-Build).

## Voraussetzungen

- Node.js **20.9** oder neuer
- PostgreSQL 14 oder neuer (getestet mit 18)

## Installation

```bash
npm install
cp .env.example .env
```

## Environment Variables

| Variable | Zweck |
| --- | --- |
| `DATABASE_URL` | Postgres-Verbindung für die Entwicklung |
| `TEST_DATABASE_URL` | **Separate** Datenbank für Integrations- und E2E-Tests. Ihr Inhalt wird bei jedem Testlauf geleert. |
| `DEV_USER_EMAIL` | Der Entwicklungsbenutzer, als der alle Anfragen laufen (siehe „Authentifizierung“) |
| `PLAYWRIGHT_CHANNEL` | optional: `msedge` oder `chrome`, um einen installierten Browser für E2E-Tests zu verwenden |

## Datenbank-Setup

Lege zwei Datenbanken an, zum Beispiel mit `psql`:

```sql
CREATE DATABASE routine_dev;
CREATE DATABASE routine_test;
```

Trage anschließend Benutzer und Passwort in `.env` ein.

## Migrationen

Schemaänderungen laufen ausschließlich über Prisma-Migrationen (`prisma/migrations`).

```bash
npm run db:migrate   # Entwicklung: wendet Migrationen an und erzeugt neue
npm run db:deploy    # Produktion/CI: wendet nur vorhandene Migrationen an
```

## Seed

```bash
npm run db:seed
```

Der Seed legt den Entwicklungsbenutzer an: Staubsaugen (7 Tage), Bettwäsche (14 Tage), Gym (3× pro Woche), Karton rausstellen (montags 19:00), Kaffeemaschine entkalken (90 Tage) mit etwas Historie, außerdem Milch, Brot und Waschmittel auf der Einkaufsliste. Ein erneuter Seed ersetzt die Demo-Daten dieses Benutzers.

## Development Server

```bash
npm run dev
```

Danach <http://localhost:3000> öffnen. Ohne Seed startet die App mit dem Onboarding.

## Tests

```bash
npm run lint
npm run typecheck
npm test                  # Unit- und Komponententests (ohne Datenbank)
npm run test:integration  # Services gegen TEST_DATABASE_URL
npm run test:e2e          # Playwright: baut die App und startet sie auf Port 3100 gegen TEST_DATABASE_URL
```

Für die E2E-Tests wird ein Browser benötigt: entweder einmalig `npx playwright install chromium` oder `PLAYWRIGHT_CHANNEL=msedge` in `.env` (unter Windows ist Edge immer vorhanden).

Die Unit-Tests laufen fest in der Zeitzone `Europe/Berlin`, damit Sommer-/Winterzeit-Fälle auf jedem Rechner gleich geprüft werden.

## Production Build

```bash
npm run build
npm run db:deploy
npm start
```

## Architektur

```
src/
  domain/        reine Geschäftslogik, ohne React und ohne Datenbank
    routines/    schedule.ts (Zod-Schemas), scheduling.ts, status.ts,
                 priority.ts, dashboard.ts, stats.ts, templates.ts
    shopping/    Gruppierung der Einkaufsliste
  lib/
    dates/       zeitzonen-sichere Datumshelfer (date-fns + @date-fns/tz)
    validation/  Zod-Schemas für alle Eingaben
    i18n/        deutsche Texte und Formatierung (austauschbar)
    auth/        aktueller Benutzer (einzige Stelle für Authentifizierung)
    db/          Prisma Client
  server/        Services (Validierung + Autorisierung), Queries, Server Actions
  components/    UI (ui/, routines/, dashboard/, shopping/, settings/ …)
  app/           Next.js App Router (Seiten, Manifest, Export-Route)
```

- **Datumslogik**: Zeitpunkte werden als UTC gespeichert. Kalendertage werden in der Zeitzone des Benutzers ausgewertet. Reihenfolge: Einstellung, dann Browser-Zeitzone (Cookie), dann `Europe/Berlin`.
- **Zeitpläne** liegen als JSON in `Routine.scheduleConfig` und werden beim Lesen und Schreiben mit Zod validiert.
- **Server Actions** validieren jede Eingabe serverseitig und prüfen bei jeder Abfrage `userId` (Benutzer ändern nur eigene Daten). Fehler erscheinen als verständliche Meldungen, nie als Stacktrace.
- **Historie bleibt unverändert**: Bearbeiten einer Routine ändert keine vergangenen Abschlüsse. Löschen ist standardmäßig ein Soft Delete, die Historie bleibt im Verlauf.

## Authentifizierung

Version 1 läuft als ein einzelner Entwicklungsbenutzer (`DEV_USER_EMAIL`). Die gesamte App fragt den Benutzer ausschließlich über `getCurrentUserId()` in `src/lib/auth/current-user.ts` ab. Für den Produktivbetrieb wird dort eine echte Anmeldung angebunden (z. B. Magic Link oder OAuth via Auth.js). Domain-Logik und Services bleiben davon unberührt. **Ohne diese Anbindung ist die App nicht für ein öffentliches Deployment gedacht.**

## Bewusste Abweichungen und offene Punkte

- **Push-Benachrichtigungen** (P1) sind nicht umgesetzt. Die Erinnerungs-Einstellung pro Routine steuert, ab wann eine Routine unter „Heute“ erscheint. Ein globaler Benachrichtigungs-Schalter fehlt bewusst, damit es keine Einstellung ohne Funktion gibt.
- `FIXED_SCHEDULE` hat zusätzlich `everyNWeeks` und `startDate`, damit „Karton jeden zweiten Donnerstag“ aus Abschnitt 29 abbildbar ist.
- `RoutineCompletion` hat ein Feld `kind` (`DONE` | `SKIPPED`), um „Überspringen“ zu speichern.
- Gekaufte Artikel werden beim Abschließen archiviert (`archivedAt`, `sessionId`) statt gelöscht.
