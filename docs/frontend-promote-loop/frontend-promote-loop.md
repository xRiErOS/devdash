---
type:
description: "Promote-Loop pro Screen (Tier 4): presentational Story -> Connected-Wrapper + Route -> TDD -> fertig, kein Gate"
tags: []
aliases: []
relates_to:
uid: b6f466bc-6df6-4e05-a2dc-c85f1e8f5aea
title: Frontend Promote-Loop
---

# Frontend Promote-Loop — Screen aus Storybook in die App ziehen (DD2)

Projekt-spezifische Frontend-Prozedur (Tier 4). Repo-weite Invarianten + Router → Root `CLAUDE.md`. Frontend-Invarianten (Token/Icons/Test-Netz) → `apps/frontend/CLAUDE.md`.

Storybook ist Design-Wahrheit **und** Bauquelle. Ein Screen wird presentational in Storybook fertiggestellt und dann per dünnem Connected-Wrapper in die App-Hülle (`src/screens/_shell/`) promotet — Strangler-Muster, ein Screen nach dem anderen.

## Promote-Loop pro Screen (Strangler)

1. **Screen in Storybook bauen/finishen** — presentational: Daten rein als Props, Mock via `args`/MSW. Keine Live-Fetches, kein Store.
2. **Promote** — dünnen Connected-Wrapper schreiben (holt echte Daten via `src/lib`, reicht Props rein) + Route in `src/screens/_shell/routes.jsx` vom Platzhalter auf den Screen biegen.
3. **TDD nur für Logik/Verhalten** (vitest node-env) + Wrapper-Datenfluss. Reine Präsentation per Augenschein in Storybook, kein Test.
4. **Fertig** — kein PRD/FSD/C4/Contract/Heartbeat/data-ui-Gate.
