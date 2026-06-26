# `data-ui` — Storybook → Code Traceability

Generische, wiederverwendbare Regeln für das `data-ui`-Attribut-System.  
Stack: React + Storybook + CI-Gate-Skript (Python/Node).

---

## 1. Zweck

`data-ui` ist ein semantisches Adressierungs-Attribut, das jeden sichtbaren UI-Knoten im Komponentenbaum eindeutig identifiziert. Es dient drei Zielen gleichzeitig:

| Ziel | Mechanismus |
|------|-------------|
| PO-/QA-Adressierbarkeit | `document.querySelector('[data-ui="…"]')` — 1:1 greifbar |
| Architektur-Traceabilität | Spezifikations-IDs → Story-Attribute → Produktions-Code |
| Regressions-Erkennung | CI-Gate schlägt an, wenn ID-Kette bricht |

---

## 2. Namenskonvention

### 2.1 Hierarchisches Punkt-Schema

```
<tier>.<komponente>.<story>        ← Story-Wrapper (Root-Element der Story)
<komponente>.<element>             ← Einzelnes Kind-Element
<komponente>.<element>-<key>       ← Wiederholtes, interaktives Element (mit Schlüssel)
```

**Regeln:**
- Nur Kleinbuchstaben und Bindestrich (`kebab-case`), keine Unterstriche
- `<tier>` = Storybook-Tier (z. B. `atom`, `molecule`, `organism`)
- `<komponente>` = kanonischer Name der Komponente (stabiler Bezeichner)
- `<story>` = Story-Name in kebab-case (z. B. `main`, `empty`, `loading`)
- `<element>` = semantische Rolle des Elements (z. B. `title`, `add-button`, `close`)

### 2.2 Keying wiederholter Elemente

```
# Falsch — Index ist instabil:
item.row-0, item.row-1

# Richtig — stabiler semantischer Schlüssel:
item.row-<id>
item.chip-<value>
item.nav-<slug>
```

**Regel:** Nie Index als Schlüssel. Immer einen aus den Daten ableitbaren, stabilen Identifier verwenden.

---

## 3. Scope-Prop-Muster (Baustein-Komponenten)

Wiederverwendbare Bausteine (Moleküle, Atome) erhalten `data-ui` nicht fest verdrahtet, sondern über eine `scope`-Prop. Der Organismus übergibt den Scope; der Baustein leitet Root-Anker und Sub-Anker davon ab.

```tsx
// Organismus:
<Widget scope="attachment-widget" />

// Baustein intern:
<div data-ui={scope}>                    // Root-Anker
  <button data-ui={`${scope}.trigger`}> // Sub-Anker
```

**Regeln:**
- `scope` = kebab-case-String, identisch mit dem Organismus-Anker des übergebenden Kontexts
- Baustein erzeugt NIEMALS eigene feste `data-ui`-Werte — immer aus `scope` abgeleitet
- Alle Sub-Anker im Format `${scope}.<element>`

**Anti-Pattern:** `{...rest}`-Spread auf Komponenten-Root überschreibt den internen `data-ui`-Anker. Lösung: additiver Wrapper-`<div>` statt Spread.

---

## 4. Story-Struktur-Pflichten

Jede Story-Datei MUSS folgende `data-ui`-Anker liefern:

| Anker | Pflicht | Format |
|-------|---------|--------|
| Story-Wrapper | Ja | `<tier>.<komponente>.<story>` |
| Jedes interaktive Kind | Ja | `<komponente>.<element>` |
| Jedes wiederholte interaktive Kind | Ja | `<komponente>.<element>-<key>` |
| Statische Label/Value-Zellen | Nein (optional) | nur wenn 1:1 adressierbar sinnvoll |

**Statische Zellen-Regel:** Label/Value-Paare ohne Interaktion dürfen typ-gleich sein (z. B. mehrere `.label`-Vorkommen), solange keine individuelle Adressierung benötigt wird.

---

## 5. Vier Akzeptanzkriterien (Visual-QA)

Vor Merge muss jede Story alle vier Kriterien erfüllen:

| # | Kriterium | Prüfung |
|---|-----------|---------|
| 1 | **Organismus eindeutig** | Genau ein Story-Wrapper-Anker + ein Komponenten-Root-Anker vorhanden |
| 2 | **Elemente adressierbar** | Jedes interaktive Element hat eigenen Anker; wiederholte Elemente sind gekeyed |
| 3 | **Statische Zellen toleriert** | Nicht-interaktive Wiederholungen ohne Anker sind OK |
| 4 | **Baustein-Scope korrekt** | Organismus übergibt `scope`; Baustein leitet Root + Sub-Anker korrekt ab |

---

## 6. Architektur-Gate (CI)

### 6.1 Zwei Prüfstufen

```
prod_literal  — ID erscheint irgendwo im Quellbaum als String-Literal (exakter Slug-Match)
prod_attr     — ID erscheint als data-ui-Attribut: "area.x" oder const SCOPE='area'; data-ui={`${SCOPE}.x`}
```

**Regel:** Wenn `prod_literal` gefunden aber NICHT `prod_attr` → **ERROR** (Hardening v1.4+).  
Ausnahme: Eintrag in der Allowlist → downgrades zu WARNING.

### 6.2 Scope-Const Cross-File Resolution

Der Gate-Skript sammelt ALLE Identifier-Bindings global über Prod-Dateien (`collect_scope_bindings`). Ein `${SCOPE}.x` ist valide, auch wenn `SCOPE` in einer anderen Datei definiert ist — solange der Binding-Wert aufgelöst werden kann.

**Nicht auflösbar (legitime Ausnahmen):**
- Prop-getragene Scopes: `dataUiScope={dynamicValue}` an der Call-Site
- Dynamisch-mittige Keys: `x.${key}.save` (Segment in der Mitte ist dynamisch)

### 6.3 Phantom-Anchor-Warning (v2.1+)

Tritt auf, wenn eine aktive ID nur über `${SCOPE}` aus einer Datei auflösbar ist, die nicht importiert ist. Kein Error, aber Signal für architektonische Schuld.

---

## 7. Allowlist (Ratchet-Prinzip)

Die Allowlist enthält IDs, die als Literal vorhanden sind, aber (noch) nicht als sauberes Attribut verdrahtet wurden.

**Regeln:**
- Allowlist darf **nur schrumpfen**, nie wachsen (Ratchet)
- Jeder Eintrag = technische Schuld; Eintrag fällt raus, sobald ID als Attribut verdrahtet ist
- Ziel: leere Allowlist = vollständige Compliance
- CI-Gate: neuer Eintrag in Allowlist → Merge blockiert (oder explizite Ausnahme-PR nötig)

---

## 8. Story-Achsen-Vokabular (Atoms)

Für Atom-Komponenten gelten festgelegte Story-Export-Achsen in dieser Reihenfolge:

| Index | Export-Name | Inhalt |
|-------|-------------|--------|
| 0 | `Default` | Pflicht, Basis-Darstellung |
| 1 | `Variants` | Varianten des Konzepts |
| 2 | `Appearance` | Visuelle Erscheinung (Farbe, Ton) |
| 3 | `Sizes` | Größenvarianten |
| 4 | `States` | Zustände (disabled, loading, error) |
| 5 | `Composition` | Zusammensetzungen / Slots |

**Regel:** Gleiches Konzept = gleicher Achsenname, komponentenübergreifend konsistent.

---

## 9. Testing-Integration

`data-ui` ist primärer Selektor in Tests — vor `role`-basierten Selektoren, wenn Adressierung eindeutig nötig ist:

```js
// Bevorzugt für eindeutige Elemente:
canvas.getByTestId('organism.widget.main')     // data-testid-Mapping auf data-ui

// Fallback auf ARIA-Role für generische Interaktionen:
canvas.getByRole('button', { name: 'Speichern' })
```

**Reihenfolge:** `role`-basiert (semantisch) → `data-ui`-Fallback (strukturell) → `data-testid` nur als letztes Mittel.

---

## 10. Häufige Fehler & Korrekturen

| Fehler | Problem | Lösung |
|--------|---------|--------|
| `{...rest}`-Spread auf Komponenten-Root | Überschreibt internen `data-ui`-Anker | Additiver `<div data-ui={scope}>` als Wrapper |
| Wiederholte Elemente ohne Key | Nicht 1:1 adressierbar | `element-<stable-id>` statt Index |
| Fester `data-ui` in Baustein | Organismus kann nicht umscoopen | `scope`-Prop einführen |
| ID in Spec, aber kein Attribut im Code | Gate-Fehler: `prod_literal` ohne `prod_attr` | Attribut verdrahten oder Allowlist-Eintrag (Schuld) |
| Story ohne Wrapper-Anker | CI-Test schlägt an | Root-Element erhält `data-ui="<tier>.<name>.<story>"` |
| Browser cached alte Story nach Rebuild | Screenshot zeigt alten Stand | Cache-Bust-Param anhängen (z. B. `?cb=<timestamp>`) |

---

## 11. Kurzreferenz: Implementierungs-Checkliste

```
[ ] Story-Wrapper: data-ui="<tier>.<komponente>.<story>"
[ ] Jedes interaktive Kind: data-ui="<komponente>.<element>"
[ ] Wiederholte Interaktionen: stable key suffix (nicht Index)
[ ] Baustein-Scope: scope-Prop empfangen, Root + Sub-Anker ableiten
[ ] Kein {...rest}-Spread auf Root, der data-ui überschreibt
[ ] CI-Gate läuft durch: prod_literal + prod_attr beide gefunden
[ ] Allowlist nicht gewachsen
[ ] Visual-QA: alle 4 Akzeptanzkriterien erfüllt
```
