# internal/tui — Datei-Namens-Konvention (verbindlich)

Directory-spezifische Regel (D07). Repo-/cli-go-weite Regeln → `../../CLAUDE.md`.

## Schema: `<art>_<verb>_<entität>.go`

Jede Sicht/Form/Funktion ist am Dateinamen sofort auffindbar. **Dateinamen
snake_case**, Go-Identifier (Konstanten/Methoden) CamelCase. Beispiel:
Datei `view_browse_project.go` → Konstante `viewBrowseProject` → Methode
`(m model) viewBrowseProject()`.

| `art_` | Bedeutung | Verben (Beispiele) |
|---|---|---|
| `view_` | Vollbild-Screen im `viewID`-Dispatcher (`view.go::viewBase`) | browse, navigate, review, detail, manage, command |
| `form_` | huh.Form-Overlay (Eingabe) | create, edit, reject |
| `box_` | y/n-Confirm-Box | confirm |
| `picker_` | Auswahl-/Zuweisungs-Menü | assign |
| `overlay_` | schwebende Utility (kein `viewID`) | palette, shortcuts |

**Navigations-Kette** liest sich aus den Namen:
`view_browse_project` → `view_navigate_reviews` → `view_review_sprint`.

**Ausnahmen vom Verb:** Entry-Nouns ohne Verb — `view_home.go`,
`view_tutorial.go`. Bewusst dokumentiert, nicht erweitern.

## Screens (viewID)

| Datei | Konstante | Screen |
|---|---|---|
| `view_home.go` | `viewHome` | Lobby / Projektauswahl |
| `view_browse_project.go` | `viewBrowseProject` | Primat-View: Meilenstein→Sprint→Issue-Tree |
| `view_browse_backlog.go` | `viewBrowseBacklog` | flache Issue-Liste (Filter/Sort/Suche) |
| `view_detail_issue.go` | `viewDetailIssue` | Issue-Detail (Vollbild) |
| `view_detail_flat.go` | `viewDetailMilestone` / `viewDetailSprint` | Meilenstein-/Sprint-Detail (geteilte Flat-Maschine) |
| `view_navigate_reviews.go` | `viewNavigateReviews` | Liste offener Review-Sprints |
| `view_review_sprint.go` | `viewReviewSprint` | Review-Cockpit (ein Sprint) |
| `view_manage_memory.go` | `viewManageMemory` | Memory-Browser |
| `view_manage_tags.go` | `viewManageTags` | Tag-Manager |
| `view_command_center.go` | `viewCommandCenter` | projektweite Issue-Suche |
| `view_tutorial.go` | `viewTutorial` | Onboarding |

`view_detail_flat.go` bleibt EINE Datei: Milestone- und Sprint-Detail teilen sich
das Accordion-Schema (`milestoneAccordionSections`/`sprintAccordionSections`,
DD2-196) über die gemeinsame Fokus-Maschine `focusSections`/`keyDetailFocus` —
kein Split. (D09-Flachliste durch DD2-196 abgelöst.)

## Forms / Boxes / Picker / Overlays

`form_create_{issue,sprint,milestone,memory}.go` · `form_edit_{userstory,settings}.go`
· `form_reject_issue.go` · `form_sandbox.go` (Dev-only).
`box_confirm_{create,delete,quit}.go`. `picker_assign_{milestone,sprint}.go`.
`overlay_{palette,shortcuts}.go`.

## Infrastruktur / Komponenten (KEIN art-Präfix)

Kein Screen → kein Präfix: `app.go` (model+Update-Dispatch), `view.go`
(`viewBase`-Dispatcher + Frame/Chrome-Primitive), `update.go`, `keys.go`,
`keys_review.go`, `keymap.go` (Single-Source-Keymap), `list.go`, `types.go`,
`messages.go`, `context.go`, `create.go`.
Render-/Modal-Komponentenschicht: `render_shared.go` (pane/renderPane/tagsInline/
issueFields/borderedPane), `forms_shared.go` (huh-Theme/Reset/Chrome), `modal.go`,
`overlay.go`, `accordion.go`.

## Regel

Neuer Screen/Form/Box/Picker/Overlay → Datei nach Schema benennen, Konstante +
`viewXxx()`-Methode konsistent. Keine fremde Verantwortung in eine art-Datei
quetschen; geteilte Primitive in die `*_shared.go`-Komponentenschicht.
