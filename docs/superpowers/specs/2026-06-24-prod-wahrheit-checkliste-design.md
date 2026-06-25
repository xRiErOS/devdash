# Design — Produktions-Checkliste „Prod == Storybook" (4. AOS-Heartbeat-Wahrheit)

Datum: 2026-06-24
Branch (Design-Doc): `chore/mockup-room`
Status: Design freigegeben (PO), bereit für Implementierungsplan

## Problem

Es gibt zwei Storyboard-Checklisten, beide **story-zentriert**:

- `Story-Board-Checkliste.md` — Struktur (Pfad/Tier, data-ui, Tokens, Surface, statisches a11y, Vokabular)
- `Behavioral-Checkliste — Features und Forms.md` — Verhalten (play, MSW-Roundtrip, States)

Der **AOS-Heartbeat** (Definition: `specs-DD/02-RPDs/Greenfield-2/CLAUDE.md §4`) validiert heute drei Wahrheiten, alle gegen die **Story**:

1. Struktur-Wahrheit — reference-chain grün (Architektur)
2. Story-Wahrheit — Story modelliert die *vollständigen* SOLL-Controls (Anti-Drift)
3. Render-Wahrheit — `composeStories` + `renderToStaticMarkup`-Snapshot stabil

**Lücke:** Sämtliche Drift-Gates (`tests/frontend-rework/*`) prüfen Stories. Der **Prod-Consumer** (Output von `/dd-code` und `/dd-screen`) ist ungated — er kann von der Story wegdriften, tote Buttons tragen oder a11y verletzen, ohne dass ein Gate anschlägt. Die Story ist die Wahrheit; nichts erzwingt, dass die Produktion ihr noch entspricht.

## Ziel

Eine **dritte Checkliste** für die Produktion, die validiert: Prod-Code == Storybook, plus Produktions-Pflichten (a11y live, kein Button ohne Funktion, States real). Sie wird zur **4. Wahrheit des AOS-Heartbeats** und lässt ihn „zuletzt schlagen" — d.h. der Heartbeat ist erst vollständig grün, wenn auch die Prod-Wahrheit abgehakt ist.

## Entscheidungen (PO 2026-06-24)

| Code | Entscheidung | Status |
|---|---|---|
| D01 | Rolle der Checkliste = **4. Wahrheit am AOS-Heartbeat** (nicht separate Liste, nicht reines PO-Gate). Heartbeat schlägt erst grün, wenn Prod-Wahrheit abgehakt. | 🟢 |
| D02 | Prüf-Modus = **Hybrid**: ein mechanischer Paritäts-Gate als Herz + manuelle Abhak-Punkte für das, was Tests nicht fangen. | 🟢 |
| D03 | Geltungsbereich = **beide** Transfer-Endpunkte: `/dd-code` (Feature-Story → Prod-Consumer, L1) UND `/dd-screen` (Contract → Prod-Screen, L2/L3). Einheit = 1 Prod-Datei/Screen gegen ihre Story(s). | 🟢 |
| D04 | Liefertiefe = **erst Design-Spec** (dieses Dokument) → Review → Implementierungsplan. Checkliste + Gates danach. | 🟢 |
| D05 | Marker-Tag `qa_prod` bleibt **erstmal ungated** (kein Vokabular-Gate `gf-story-qa-prod-vocab` in dieser Iteration). | 🟢 |
| D06 | Sektion „kein toter Button" bekommt **zusätzlich** einen billigen statischen Scan-Gate (leere/no-op-Handler greppen), nicht nur manuelle Prüfung. | 🟢 |

## Lösung

### Baustein 1 — AOS-Heartbeat um 4. Wahrheit erweitern

Ziel-Datei: `specs-DD/02-RPDs/Greenfield-2/CLAUDE.md §4` (AOS-Heartbeat).

Ergänzung (Wortlaut im Implementierungsplan final):

> 4. **Prod-Wahrheit (Anti-Drift Story→Code)** — der produktive Consumer/Screen entspricht der Story: gleicher data-ui-Anker-Satz (mechanisch), jeder Control real verdrahtet (kein toter Button), a11y live grün, visuelle Parität. Marker `qa_prod:done` auf der Story. **Schlägt zuletzt** — erst nach Story-`status:stable`, weil Prod-Transfer der Story nachgelagert ist.

Reihenfolge des Schlagens pro Molekül/Screen:
1. Struktur grün (reference-chain)
2. Story-Wahrheit (alle SOLL-Controls in Story)
3. Render-Snapshot stabil
4. **Prod-Wahrheit** (diese Checkliste) → `qa_prod:done`

### Baustein 2 — Marker-Tag `qa_prod`

Lebt auf der **Story** in `meta.tags` (nicht im Prod-File — die Story ist die Spec, der Heartbeat schlägt pro Molekül). Reiht sich neben `status:`, `qa_checklist:`, `qa_behavioral:`.

Vokabular `{ n/a, open, done }`:

- `n/a` — Story hat (noch) keinen Prod-Consumer (reine Design-Exploration)
- `open` — Prod-Consumer existiert, Prod-Wahrheit noch nicht verifiziert (Default sobald Transfer beginnt)
- `done` — Prod == Story verifiziert, alle Checklisten-Punkte erfüllt

Jede Prod-Änderung am Consumer → zurück auf `qa_prod:open` (Re-Validierung).

**Ungated** (D05): kein Vokabular-Gate in dieser Iteration. Disziplin + Checkliste. (Gate `gf-story-qa-prod-vocab` als möglicher Folge-Schritt notiert, nicht jetzt.)

### Baustein 3 — Neue Checkliste

Ziel-Datei: `specs-DD/00-Agent-Context/Produktions-Checkliste — Prod gleich Storybook.md`

Format wie die zwei bestehenden: Markdown-Checkboxen, nummerierte Sektionen, Single-Source-Verweis auf `Storybook-Build-Canon.md`. Additiv — kein Duplikat der Story-Checklisten, nur das Prod-Delta.

Sektions-Entwurf:

```
0. Geltungsbereich & Vorbedingung
   - Anwenden auf jeden /dd-code- oder /dd-screen-Prod-Transfer
   - Vorbedingung: Story-Heartbeat gruen (status:stable, qa_behavioral done|n/a,
     qa_checklist done) — sonst gibt es keine verlaessliche Spec zum Vergleich

1. MECHANISCH — Prod==Story-Anker (Herz, Gate)
   - [ ] Gate gf-prod-data-ui-parity gruen: Prod-Consumer rendert das data-ui-Anker-Set
         der Story (Prod-Set ⊇ Story-Set; jeder Story-Anker existiert in Prod)
   - [ ] no-raw-hex gilt auch fuer den src-Consumer (0 Roh-Hex)
   - [ ] inline-style/-layout-Budget nicht erhoeht durch den Consumer (Ratchet)

2. FUNKTION — kein toter Button (Gate + manuell)
   - [ ] Gate gf-prod-dead-handler-scan gruen: kein onClick/onSubmit/onChange mit
         leerem oder no-op-Handler (() => {}, TODO-Stub, console.log-only) im Consumer
   - [ ] manuell: jeder Control aus der SOLL-Story ist real verdrahtet
         (API-Call / State-Transition / Toast) — kein Platzhalter
   - [ ] alle SOLL-Controls der Story existieren in Prod (kein im Transfer
         verlorenes Bedienelement)

3. A11Y LIVE (Prod, manuell + axe)
   - [ ] Tab erreicht jeden interaktiven Control sinnvoll; Enter/Space aktiviert
   - [ ] ESC + Aussenklick schliessen Edit/Modal; Fokus-Trap korrekt
   - [ ] focus-visible sichtbar; Icon-only-Buttons mit aria-label
   - [ ] axe-Lauf auf dem echten Prod-Render: keine Violations fuer gerenderte States

4. VISUELLE PARITAET
   - [ ] Prod-Screenshot vs Story-Screenshot derselben Variante: kein sichtbarer Drift
   - [ ] Surface-Ebenen (Layer-Aliase) im Prod identisch zur Story

5. STATES IN PROD
   - [ ] loading / error / empty real im Prod erreichbar (nicht nur als Story-args)
   - [ ] Doppel-Submit blockiert (Button disabled waehrend Request)

6. HEARTBEAT — zuletzt schlagen lassen
   - [ ] Sektionen 0-5 alle gruen
   - [ ] qa_prod:done auf der Story gesetzt (ehrlich, kein Blind-Abnicken)
   - [ ] Folge-Arbeit (Rework, offene Drift) als Backlog-Issue, nicht still gelassen
```

### Baustein 4 — Zwei Gates (in diesem Doc spezifiziert, Bau = Folge-Issue)

Beide unter `tests/frontend-rework/`, node-env, `renderToStaticMarkup` (kein jsdom) — konsistent mit der bestehenden Gate-Architektur.

**Gate 1 — `gf-prod-data-ui-parity.test.jsx`** (Herz, Sektion 1)
- Zweck: Prod-Consumer rendert das data-ui-Anker-Set seiner Story.
- Mechanik: pro registriertem (Story ↔ Prod-Consumer)-Paar `composeStories` der Story rendern → Story-data-ui-Set extrahieren; Prod-Consumer mit denselben Props rendern → Prod-Set extrahieren; assert `storySet ⊆ prodSet`.
- Registry: explizite Paar-Map (Story-Modul ↔ Prod-Komponente + Props-Fixture), damit das Gate nicht raten muss. Start klein (Pilot-Paar), wächst pro Transfer.
- Drift (Prod fehlt ein Story-Anker) = roter Test.
- Offen für Plan: wie Prod-Consumer ohne jsdom/Routing isoliert gerendert wird (ggf. Props-Fixture + Context-Stub). Risiko-Punkt — im Plan adressieren.

**Gate 2 — `gf-prod-dead-handler-scan.test.js`** (billig, Sektion 2, D06)
- Zweck: keine toten Buttons im Prod-Consumer.
- Mechanik: statischer Scan über die registrierten Prod-Consumer-Files; Regex/AST-leicht auf Event-Props (`onClick|onSubmit|onChange|onKeyDown`) mit verdächtigem Handler-Body: `() => {}`, `()=>{}`, `function(){}`, reiner `console.log`, `// TODO`-Stub.
- Escape: `dead-handler-ok`-Kommentar für bewusste Ausnahmen (analog `hex-ok`).
- Treffer = roter Test.
- Bewusst billig/heuristisch — fängt grobe Platzhalter, ersetzt nicht die manuelle Prüfung in Sektion 2.

## Geltungsbereich / Einheit

| Transfer | Skill | Ebene | Einheit |
|---|---|---|---|
| Feature-Story → Prod-Consumer | `/dd-code` | L1 | 1 Prod-Komponente gegen ihre Story |
| Screen-Contract → Prod-Screen | `/dd-screen` | L2/L3 | 1 App-Shell-Screen gegen seine komponierten Stories |

Eine Checkliste mit Geltungsbereich-Sektion deckt beide ab (analog wie die Behavioral-Checkliste per Komponenten-Natur scoped).

## Lieferweg & Constraints

- **Dieses Design-Doc**: `docs/superpowers/specs/` — kein `specs-DD`, daher auf `chore/mockup-room` committbar.
- **Checkliste (Baustein 3) + Heartbeat-Edit (Baustein 1)**: berühren `specs-DD/` → **nur via `main` / `ddc`** (harte Regel: Feature-Branches fassen `specs-DD` nicht an). PO arbeitet live an `specs-DD` mit → vor Edit fragen, ob er co-editet.
- **Gates (Baustein 4)**: Code unter `tests/frontend-rework/` → normaler Code-Branch, lokaler `main`-Workflow (kein origin-Push ohne Version-Tag).
- **Marker-Tag (Baustein 2)**: Tag-Ergänzung in Story-`meta.tags` → Code-Branch.

## Out of Scope (diese Iteration)

- Vokabular-Gate `gf-story-qa-prod-vocab` (D05 — ungated).
- AOS-Heartbeat als eigener CI-Gate (GF-286, PO bereits deferred).
- Vollautomatische Prod↔Story-Pixel-Diff (Sektion 4 bleibt manueller Screenshot-Vergleich).
- Bau der Gates + Pilot-Verdrahtung (Folge-Issue nach Plan).

## Folge-Issues (nach Plan)

- `T` Checkliste `Produktions-Checkliste — Prod gleich Storybook.md` schreiben (via `ddc`).
- `T` AOS-Heartbeat-Def §4 um 4. Wahrheit erweitern (via `ddc`).
- `T` `qa_prod`-Tag in Story-`meta.tags`-Konvention + Canon-Regel ergänzen.
- `T` Gate `gf-prod-data-ui-parity.test.jsx` bauen (TDD) + Pilot-Paar.
- `T` Gate `gf-prod-dead-handler-scan.test.js` bauen (TDD).
- `T` `/dd-code` + `/dd-screen` Skills um Prod-Checklisten-Schritt + `qa_prod`-Setzung ergänzen.
