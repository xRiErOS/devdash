# Promote-Loop: Mockup → Storybook → Stable

Dreiphasiger Zyklus für jeden Screen/Organismus. Jede Phase hat ein klares Exit-Kriterium — kein Weiter ohne Haken.

Backend-Harmonisierung ist **kein nachgelagerter Schritt**, sondern ab Phase 1 eingebaut: die `contracts/*.contracts.js` (Zod) sind Single Source of Truth für Datenformen.

---

## Phase 1 — Mockup

**Ziel:** Visuelle Idee ohne Produktionsdruck. Scope, Entitäten und nötige Endpunkte klären.

### Wo

`src/_mockups/<ScreenName>/` — eigener Scope-Ordner, kein Tier-Zwang.

### Checkliste (Exit zu Phase 2)

- [ ] **Entitäten identifiziert** — welche Backend-Entities braucht der Screen? Abgleich gegen `foundations/BackendContract.mdx` (Entity→Schema→Routes-Mapping).
- [ ] **Datenlücken notiert** — welche Felder/Endpunkte fehlen im Backend oder Contract? Als `Q`-Code oder Kommentar festhalten — nicht ignorieren.
- [ ] **Props grob skizziert** — was bekommt der Screen von oben? Roh-Skizze reicht (kein TypeScript nötig).
- [ ] **Kein Live-Fetch** — reine Mock-Daten (`const MOCK_DATA = { … }`). Kein `fetch`, kein Store.
- [ ] **Render-Smoke läuft noch** — `npm test` grün (kein Mockup darf das bestehende Smoke-Net reißen).

---

## Phase 2 — Promote to Storybook

**Ziel:** Screen wird presentational gebaut, vollständig gemockt, contract-konform.

### Wo

Ziel-Tier in `src/ui/` (Atom/Molecule/Organism/Screen). Co-located: `ComponentName.jsx` + `ComponentName.stories.jsx` + `ComponentName.mdx`.

### Checkliste (Exit zu Phase 3)

**Backend-Harmonisierung (hart)**

- [ ] **Fixtures aus Contract** — Props/Args nutzen ausschließlich Fixtures aus `foundations/fixtures/`. Fixtures abgeleitet aus dem Zod-Schema in `contracts/*.contracts.js`. Kein freihändiges `{ id: 1, name: "foo" }`.
- [ ] **MSW-Handler aktiv** — wenn der Screen API-Calls simuliert: Handler in `foundations/fixtures/<entity>.handlers.js`, eingebunden per `parameters.msw.handlers` in der Story. Handler matcht den echten Endpunkt-Path aus `BackendContract.mdx`. Demo-Template: `fixtures/sprint.handlers.js`. Nicht alle Entitäten haben noch einen Handler — fehlt einer, anlegen nach dem Sprint-Muster.
- [ ] **Alle Felder benutzt oder bewusst weggelassen** — jedes Prop des Zod-Schemas entweder im UI sichtbar oder explizit auskommentiert mit Grund.
- [ ] **Fehler-/Leer-States definiert** — was zeigt der Screen wenn `data = null`, `isLoading`, `isError`? Diese States brauchen eigene Story-Variants.

**Storybook-Standard**

- [ ] `status: open` gesetzt (oder `review` wenn PO-Abnahme läuft).
- [ ] `.mdx` co-located: Zweck, Wann/Wann-nicht, a11y-Note (Norm: `docs/doc-mdx-Norm.md`).
- [ ] Kein `lucide-react`-Freeform — Icon-Registry `foundations/Icon.jsx`.
- [ ] Kein inline `style={{}}`, kein Roh-Hex — Token aus `src/index.css`.
- [ ] Render-Smoke grün: `npm test`.

---

## Phase 3 — Refine for Usage (→ `status:stable`)

**Ziel:** Connected Wrapper schreibt echte Daten in den presentational Screen. Route live. PO nimmt ab.

### Checkliste (Exit = `status:stable`)

**Connected Wrapper**

- [ ] **Dünner Wrapper** in `src/screens/_shell/` oder neben dem Screen — holt Daten via `src/lib/` (kein direktes `fetch` in der Komponente).
- [ ] **`src/lib/`-Funktion validiert gegen Zod-Schema** — entweder `.parse()` oder `.safeParse()` mit Fallback. Nie rohe API-Response durchreichen.
- [ ] **MSW bleibt in Storybook aktiv** — Prod-Wrapper und Storybook importieren dieselbe Komponente, aber verschiedene Datenquellen. Keine doppelte Komponente.

**Route**

- [ ] Route in `src/screens/_shell/routes.jsx` vom Platzhalter auf den neuen Screen gebogen.
- [ ] Manuelle Augenschein-Prüfung gegen Live-Backend (`DEVD_API_URL`): Daten erscheinen, Fehler-State funktioniert, Leer-State funktioniert.

**Abnahme**

- [ ] PO setzt `status:stable` — nur PO, nie KI-Agent.
- [ ] Falls Backend-Anpassung nötig war (neues Feld, neuer Endpunkt): `contracts/*.contracts.js` + `BackendContract.mdx` + Fixture aktualisiert **bevor** `stable`.

---

## Kurzreferenz — Harmonisierungs-Quellen

| Was | Wo |
|-----|----|
| Daten-Schema (Zod) | `contracts/*.contracts.js` |
| Entity→Route-Mapping | `apps/frontend/src/ui/foundations/BackendContract.mdx` |
| MSW-Fixtures (JSON) | `apps/frontend/src/ui/foundations/fixtures/*.json` |
| MSW-Handler (Demo) | `apps/frontend/src/ui/foundations/fixtures/sprint.handlers.js` |
| Fetch-Layer | `apps/frontend/src/lib/` |
| Token-Master | `apps/frontend/src/index.css` |
| MDX-Norm | `docs/doc-mdx-Norm.md` |

---

## Typische Fallstricke

| Symptom | Ursache | Fix |
|---------|---------|-----|
| Storybook-Mock und Prod zeigen verschiedene Felder | Fixture nicht aus Contract generiert | Fixture aus Zod-Schema ableiten |
| Backend-Response lässt UI abstürzen | Kein Zod-`.parse()` im lib-Layer | `safeParse()` mit Fallback + Log |
| Neues Feld im Backend, Story-args zu alt | Fixture nicht synchronisiert | Fixture-Update als Teil der Contract-Änderung erzwingen |
| `status:stable` ohne Live-Test | Phase-3-Checkliste übersprungen | Manuelle Augenschein-Prüfung Pflicht vor PO-Abnahme |
