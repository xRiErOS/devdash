# GLOSSARY — frontend (DD2)

Frontend-Surface: Storybook-Insel, Screens, Design-System. Frontend-Regeln (Token/Icons/Test) → `apps/frontend/CLAUDE.md`. Übergreifende Begriffe → Wurzel-`GLOSSARY.md`.

- **Storybook als Samen** — Storybook ist zugleich Design-Wahrheit und Bauquelle; Produktions-Screens werden aus den Stories zusammengesetzt.
- **Promote-Loop** — der Weg eines Screens von der presentational Story zum Connected-Wrapper mit Route (Strangler: ein Screen nach dem anderen).
- **Presentational vs. Connected** — presentational: Daten kommen als Props / Mock; connected: ein dünner Wrapper reicht echte Daten hinein.
- **App-Shell** — die dünne, handgepflegte App-Hülle (Frame, Rail, Topbar, Routing), in die Screens promotet werden.
- **Tier** — die Bauteil-Ebene (foundations · atoms · molecules · organisms · screens); der Pfad bestimmt das Tier, kein Story-Titel.
- **Token** — ein Design-Wert (Farbe, Spacing, Radius) aus einer einzigen CSS-Quelle; Roh-Hex ist verboten.
- **Render-Smoke** — das einzige Frontend-Netz: jede Story muss fehlerfrei zu nicht-leerem Markup rendern.
- **data-ui** — eine Anker-/Ansprech-Konvention (Punkt-Schema), über die der PO ein UI-Element benennt; Konvention, kein Gate.
