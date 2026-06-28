package tui

// forms_shared.go — eingebettete huh-Create-Formulare für das Command-Center (T16).
// Die Formulare laufen als Sub-Modell INNERHALB der laufenden Bubble-Tea-Loop
// (kein eigenes form.Run() wie der One-Shot-Fallback). Werte werden NICHT über
// Pointer gebunden (würde am Value-Copy des Models brechen), sondern nach
// StateCompleted per keyed GetString aus dem Formular gelesen.
//
// Die kind-spezifischen Form-Builder liegen je in eigener Datei
// (form_issue.go, form_milestone.go, form_sprint.go, form_memory.go,
// form_result.go) — alle vanilla huh. Hier nur das geteilte Gerüst: openForm,
// formCreateCmd, editField-Form, Helpers.

import (
	"fmt"
	"strconv"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

func nonEmpty(s string) error {
	if strings.TrimSpace(s) == "" {
		return fmt.Errorf("darf nicht leer sein")
	}
	return nil
}

// splitLines zerlegt einen Mehrzeilen-Text in getrimmte, nicht-leere Zeilen
// (DD2-66: eine User-Story pro Zeile im Create-Formular).
func splitLines(s string) []string {
	var out []string
	for _, ln := range strings.Split(s, "\n") {
		if t := strings.TrimSpace(ln); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// openMilestones liefert nur offene/aktive Meilensteine (planning|active) —
// geschlossene/stornierte taugen nicht als Sprint-Ziel und verwässern nur das
// Select bei der Sprint-Erstellung (DD2-27).
func openMilestones(ms []api.Milestone) []api.Milestone {
	out := make([]api.Milestone, 0, len(ms))
	for _, x := range ms {
		switch x.Status {
		case "planning", "active":
			out = append(out, x)
		}
	}
	return out
}

// clampModalWidth begrenzt eine gewünschte Modal-Boxbreite auf die Terminalbreite
// (DD2-55): schrumpft auf schmalen Views (termW-4 lässt je 2 Spalten Luft/Border),
// Untergrenze 24. pref ist die Wunschbreite der jeweiligen Box.
func clampModalWidth(pref, termW int) int {
	w := pref
	if termW > 4 && termW-4 < w {
		w = termW - 4
	}
	if w < 24 {
		w = 24
	}
	return w
}

// defaultModalWidth = Wunschbreite der Standard-Modal-Box. DD2-40: per YAML-
// Config (layout.modal_width) in Run() überschreibbar; Default = bisherige 64.
var defaultModalWidth = 64

// modalBoxWidth begrenzt die Standard-Modal-Boxbreite auf die Terminalbreite
// (DD2-25): max defaultModalWidth, schrumpft auf schmalen Views, Untergrenze 24.
func modalBoxWidth(termW int) int {
	return clampModalWidth(defaultModalWidth, termW)
}

// formInnerWidth ist die huh-Formularbreite innerhalb der Box (Rahmen + Padding).
func formInnerWidth(termW int) int {
	w := modalBoxWidth(termW) - 6
	if w < 18 {
		w = 18
	}
	return w
}

// formInnerHeight begrenzt die huh-Formularhöhe auf die Terminalhöhe (DD2-25):
// auf kurzen Terminals scrollt huh intern statt unten abzuschneiden. Cap 20 ⇒
// kein aufgeblähtes Modal auf großen Terminals. termH==0 (unbekannt) ⇒ 20.
func formInnerHeight(termH int) int {
	if termH <= 0 {
		return 16 // Höhe unbekannt (Init) → konservativ; bei echtem Render neu appliziert
	}
	h := termH - 7 // Box-Chrome (Titel+Leerzeile+Rahmen ≈5) + 2 Zeilen Rand (nie randbündig)
	if h > 20 {
		h = 20
	}
	if h < 5 {
		h = 5
	}
	return h
}

// openForm initialisiert das Formular für kind.
// Alle Kinds nutzen vanilla huh (kind-spezifische Builder in
// form_issue/milestone/sprint/memory/result.go).
func (m model) openForm(kind string) (tea.Model, tea.Cmd) {
	m.formKind = kind
	m.formGroupIdx = 0
	m.formGroupTitles = nil
	m.formPartials = nil
	m.status = ""

	var f *huh.Form
	switch kind {
	case "testform": // Styling-Sandbox (Palette-Action "Test Form"), kein Persist
		f = buildTestForm()
	case "issue":
		f = buildIssueForm(m.tags)
	case "milestone":
		f = buildMilestoneForm(m.milestones, m.tags)
	case "sprint":
		f = buildSprintForm(m.milestones, m.tags)
	case "memory":
		f = buildMemoryForm()
	case "result":
		f = buildResultForm()
	}
	if f == nil {
		return m, nil
	}
	m.form = m.styleForm(f)
	return m, m.form.Init()
}

// styleForm finalisiert jede embedded huh-Form einheitlich: Palette-Theme +
// Terminal-Maße + huh-Eigen-Help aus (Footer kommt aus formChrome). Single-Source
// für openForm, editField (detail.go) und Tag-Forms (tags.go).
func (m model) styleForm(f *huh.Form) *huh.Form {
	return f.WithWidth(formInnerWidth(m.width)).
		WithHeight(formInnerHeight(m.height)).
		WithShowHelp(false).
		WithTheme(paletteFormTheme())
}

// paletteFormTheme spiegelt die Command-Palette-Optik auf ein huh.Theme:
// Mauve = Akzent (Titel, Selector, Indikatoren, aktive Option), Yellow =
// Signalbalken am aktiven Feld (Orientierung), Overlay/Hint gedimmt, Base = BG.
func paletteFormTheme() *huh.Theme {
	t := huh.ThemeBase()

	// Aktives Feld: Yellow-Signalbalken für Orientierung. BG = Base (flach,
	// palette-konsistent). Hinweis: leere textarea-Zeilen (EndOfBuffer) lassen
	// sich in huh v1.0.0 NICHT per Theme füllen — unter Terminal-Transparenz
	// scheinen sie durch; opakes Terminal (bg=Base) ist die Design-Annahme.
	t.Focused.Base = t.Focused.Base.BorderForeground(theme.Yellow).Background(theme.Base)
	t.Focused.Card = t.Focused.Base
	t.Focused.Title = t.Focused.Title.Foreground(theme.Mauve).Bold(true)
	t.Focused.Description = t.Focused.Description.Foreground(theme.Hint)
	t.Focused.ErrorIndicator = t.Focused.ErrorIndicator.Foreground(theme.Red)
	t.Focused.ErrorMessage = t.Focused.ErrorMessage.Foreground(theme.Red)

	// Select: Mauve-Cursor "▸ " + Indikatoren (wie Palette-Cursor)
	t.Focused.SelectSelector = t.Focused.SelectSelector.Foreground(theme.Mauve).SetString("▸ ")
	t.Focused.NextIndicator = t.Focused.NextIndicator.Foreground(theme.Mauve)
	t.Focused.PrevIndicator = t.Focused.PrevIndicator.Foreground(theme.Mauve)
	t.Focused.Option = t.Focused.Option.Foreground(theme.Text)
	t.Focused.SelectedOption = t.Focused.SelectedOption.Foreground(theme.Mauve)

	// Multi-select
	t.Focused.MultiSelectSelector = t.Focused.MultiSelectSelector.Foreground(theme.Mauve).SetString("▸ ")
	t.Focused.SelectedPrefix = lipgloss.NewStyle().Foreground(theme.Mauve).SetString("[•] ")
	t.Focused.UnselectedPrefix = lipgloss.NewStyle().Foreground(theme.Hint).SetString("[ ] ")
	t.Focused.UnselectedOption = t.Focused.UnselectedOption.Foreground(theme.Text)

	// Buttons (Submit) = Mauve-Akzent
	t.Focused.FocusedButton = t.Focused.FocusedButton.Foreground(theme.Base).Background(theme.Mauve)
	t.Focused.BlurredButton = t.Focused.BlurredButton.Foreground(theme.Text).Background(theme.Surface)
	t.Focused.Next = t.Focused.FocusedButton

	// TextInput — Prompt-"> " entfernt (war zusätzliches Zeichen im Input).
	t.Focused.TextInput.Cursor = t.Focused.TextInput.Cursor.Foreground(theme.Mauve)
	t.Focused.TextInput.Placeholder = t.Focused.TextInput.Placeholder.Foreground(theme.Hint)
	t.Focused.TextInput.Prompt = t.Focused.TextInput.Prompt.Foreground(theme.Mauve).SetString("")
	t.Focused.TextInput.Text = t.Focused.TextInput.Text.Foreground(theme.Text)

	t.Form.Base = t.Form.Base.Background(theme.Base)

	// Blurred = Focused, nur Border gedimmt
	t.Blurred = t.Focused
	t.Blurred.Base = t.Focused.Base.BorderForeground(theme.Hint).Background(theme.Base)
	t.Blurred.Card = t.Blurred.Base
	t.Blurred.NextIndicator = lipgloss.NewStyle()
	t.Blurred.PrevIndicator = lipgloss.NewStyle()

	return t
}

// formTitle liefert den Modal-Titel je formKind.
func (m model) formTitle() string {
	switch m.formKind {
	case "testform":
		return "Test Form"
	case "issue":
		return "Neues Issue"
	case "milestone":
		return "Neuer Meilenstein"
	case "sprint":
		return "Neuer Sprint"
	case "memory":
		return "Neue Memory"
	case "result":
		return "Ergebnisfeld setzen"
	case "editField":
		return "Bearbeiten: " + m.editLabel
	case "tagCreate":
		return "Neuer Tag"
	case "tagEdit":
		return "Tag bearbeiten"
	}
	return ""
}

// formFooterHint liefert die Keybinding-Zeile je formKind.
func formFooterHint(kind string) string {
	switch kind {
	case "testform":
		return "↑↓ wählen · enter weiter · ctrl+e Editor · esc zu"
	case "editField", "tagCreate", "tagEdit":
		return "enter speichern · esc abbrechen"
	default:
		return "alt+enter speichern · tab Feld · esc abbrechen"
	}
}

// formChrome umrahmt jede embedded huh-Form wie die Command-Palette
// (Header-Titel, Dim-Separator + Dim-Footer). Single-Source für alle Form-Kinds
// (T03: Box-gerahmt), Chrome über modalPanel.
func (m model) formChrome() string {
	innerW := formInnerWidth(m.width)
	body := theme.Dim.Render(strings.Repeat("─", innerW)) + "\n" + m.form.View()
	return modalPanel(m.formTitle(), body, formFooterHint(m.formKind), modalBoxWidth(m.width), theme.Mauve)
}

// typeOptions / priorityOptions = Single Source der Issue-Type- bzw. Prioritäts-
// Auswahl, geteilt von Create- und editField-Form (DD2-77). priority deckt den
// vollen Contract-Bereich 1..5 ab (issueUpdateContract: min 1, max 5) — nicht nur
// 1..4, sonst fehlen Prioritäten im Select (DD2-77 Review-Befund).
func typeOptions() []huh.Option[string] {
	return []huh.Option[string]{
		huh.NewOption("Feature", "feature"),
		huh.NewOption("Bug", "bug"),
		huh.NewOption("Improvement", "improvement"),
		huh.NewOption("Core", "core"),
	}
}

func priorityOptions() []huh.Option[string] {
	return []huh.Option[string]{
		huh.NewOption("P1 — Kritisch", "1"),
		huh.NewOption("P2 — Hoch", "2"),
		huh.NewOption("P3 — Mittel", "3"),
		huh.NewOption("P4 — Niedrig", "4"),
		huh.NewOption("P5 — Backlog", "5"),
	}
}

// buildEditFieldForm baut die Single-Field-editForm (DD2-77) je Feldtyp: Input
// (kurz) ∙ Text (lang) ∙ Select (type/priority). Mit dem aktuellen Wert vorbelegt
// (Value-Binding für den Initialwert; gelesen wird nach Abschluss per GetString).
func buildEditFieldForm(f detailField, value string) *huh.Form {
	v := value
	var field huh.Field
	switch f.editor {
	case "select":
		var opts []huh.Option[string]
		switch f.key {
		case "type":
			opts = typeOptions()
		case "priority":
			opts = priorityOptions()
		}
		// Options VOR Value: huh bindet den Preset gegen die bereits gesetzte
		// Optionsliste (sonst greift die Vorbelegung nicht zuverlässig).
		field = huh.NewSelect[string]().Key("value").Title(f.label).Options(opts...).Value(&v)
	case "input":
		in := huh.NewInput().Key("value").Title(f.label).Value(&v)
		if f.key == "title" || f.key == "name" { // Pflicht-Felder (issue.title, milestone/sprint.name)
			in = in.Validate(nonEmpty)
		}
		field = in
	default: // text (lange Freitextfelder)
		field = huh.NewText().Key("value").Title(f.label).Value(&v)
	}
	return huh.NewForm(huh.NewGroup(field)).WithShowHelp(true)
}

// openEditFieldGeneric öffnet die editField-Form für ein beliebiges Entity-Feld
// (DD2-79). entity ∈ {issue, milestone, sprint} steuert den Submit-Dispatch in
// formCreateCmd. Mit dem aktuellen Wert vorbelegt; der Detail-Fokus bleibt erhalten.
// Single Source für Issue (openEditField) und Meilenstein/Sprint (editFlatField).
func (m model) openEditFieldGeneric(entity string, id int, f detailField, value string) (tea.Model, tea.Cmd) {
	m.editEntity = entity
	m.editID = id
	m.editField = f.key
	m.editLabel = f.label
	m.editEditor = f.editor
	m.editValue = value
	m.formKind = "editField"
	m.form = m.styleForm(buildEditFieldForm(f, value))
	m.status = ""
	return m, m.form.Init()
}

// formCreateCmd liest die abgeschlossenen Formularwerte und liefert den
// passenden Create-/Update-Cmd. Wird vor dem Nullen von m.form aufgerufen.
// selectedTagIDs liest die im Multiselect gewählten Tag-IDs (keyed, Value-Copy-safe).
func (m *model) selectedTagIDs() []int {
	raw, _ := m.form.Get("tags").([]string)
	ids := make([]int, 0, len(raw))
	for _, s := range raw {
		if n, err := strconv.Atoi(s); err == nil {
			ids = append(ids, n)
		}
	}
	return ids
}

func (m *model) formCreateCmd() tea.Cmd {
	get := func(k string) string { return strings.TrimSpace(m.form.GetString(k)) }
	switch m.formKind {
	case "editField": // DD2-77/79: ein editiertes Feld zurückschreiben — Dispatch per Entity
		switch m.editEntity {
		case "milestone":
			return doUpdateMilestoneField(m.client, m.editID, m.editField, get("value"))
		case "sprint":
			return doUpdateSprintField(m.client, m.editID, m.editField, get("value"))
		default:
			return doUpdateIssueField(m.client, m.editID, m.editField, get("value"))
		}
	case "tagCreate": // DD2-75: neuen Tag anlegen
		return doCreateTag(m.client, get("name"), m.form.GetString("color"))
	case "tagEdit": // DD2-75: Tag umbenennen/umfärben
		return doUpdateTag(m.client, m.tagEditID, get("name"), m.form.GetString("color"))
	case "issue":
		typ := m.form.GetString("type")
		if typ == "" {
			typ = "feature"
		}
		body := api.IssueCreateBody{Title: get("title"), Type: typ, Priority: 2}
		if d := get("po_notes"); d != "" {
			body.PoNotes = &d
		}
		body.TagIDs = m.selectedTagIDs()
		return doCreateIssue(m.client, body, splitLines(get("user_stories")))
	case "milestone":
		body := api.MilestoneCreateBody{Name: get("name")}
		if d := get("description"); d != "" {
			body.Description = &d
		}
		if td := get("target_date"); td != "" {
			body.TargetDate = &td
		}
		return doCreateMilestone(m.client, body, m.selectedTagIDs())
	case "sprint":
		body := api.SprintCreateBody{Name: get("name")}
		if g := get("goal"); g != "" {
			body.Goal = &g
		}
		if mid := m.form.GetString("milestone_id"); mid != "" {
			if id, err := strconv.Atoi(mid); err == nil {
				body.MilestoneID = &id
			}
		}
		return doCreateSprint(m.client, body, m.selectedTagIDs())
	case "memory":
		body := api.ProjectMemoryCreateBody{Category: m.form.GetString("category"), Summary: get("summary")}
		if c := get("content"); c != "" {
			body.Content = &c
		}
		if a := get("anchor"); a != "" {
			body.Anchor = &a
		}
		return doCreateMemory(m.client, body)
	case "result":
		yaml := buildResultYAML(
			get("outcome_summary"),
			m.form.GetString("outcome_type"),
			splitCSV(get("commits")),
			get("vorgehen"),
			m.resultIssueKey,
		)
		return doSetResult(m.client, m.resultIssueID, yaml, m.resultSprintID)
	}
	return nil
}
