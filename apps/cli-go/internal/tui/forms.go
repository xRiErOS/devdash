package tui

// forms.go — eingebettete huh-Create-Formulare für das Command-Center (T16).
// Die Formulare laufen als Sub-Modell INNERHALB der laufenden Bubble-Tea-Loop
// (kein eigenes form.Run() wie der One-Shot-Fallback). Werte werden NICHT über
// Pointer gebunden (würde am Value-Copy des Models brechen), sondern nach
// StateCompleted per keyed GetString aus dem Formular gelesen.

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
		return 16 // Höhe unbekannt (Init) → konservativ; formBox re-appliziert bei echtem Render
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

// openForm baut das huh-Formular für kind und initialisiert es. Die Breite folgt
// der Terminalbreite (DD2-25), damit Formulare auf schmalen Views nicht ausbrechen.
func (m model) openForm(kind string) (tea.Model, tea.Cmd) {
	m.formKind = kind
	// Reset Multi-Tab-State; Issue-Form hat 2 Tabs (DD2-36).
	m.formGroupIdx = 0
	m.formGroupTitles = nil
	m.formPartials = nil
	if kind == "issue" {
		m.formGroupTitles = []string{"Basis", "Inhalt"}
		m.formPartials = make(map[string]string)
	}
	f := buildForm(kind, m.milestones, m.tags)
	if f != nil {
		f = f.WithWidth(formInnerWidth(m.width)).
			WithHeight(formInnerHeight(m.height)).
			WithTheme(formHuhTheme())
	}
	m.form = f
	m.status = ""
	return m, m.form.Init()
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

// buildForm konstruiert das keyed Formular je kind (issue|milestone|sprint).
// tags (optional) ergänzt ein Multiselect, damit Tags direkt beim Anlegen gesetzt
// werden — kein Create-dann-Zuweisen-Doppelschritt (DD2-33). Leere Tag-Liste → Feld
// entfällt (kein leeres Multiselect).
func buildForm(kind string, milestones []api.Milestone, tags []api.Tag) *huh.Form {
	switch kind {
	case "issue":
		// Tab 0 „Basis": Titel, Typ, Priorität. Tab 1 „Inhalt" folgt nach Abschluss (DD2-36).
		return huh.NewForm(huh.NewGroup(
			huh.NewInput().Key("title").Title("Titel").
				Placeholder("Kurze Beschreibung des Issues").Validate(nonEmpty),
			huh.NewSelect[string]().Key("type").Title("Typ").Options(typeOptions()...),
			huh.NewSelect[string]().Key("priority").Title("Priorität").Options(priorityOptions()...),
		)).WithWidth(58).WithShowHelp(true)
	case "milestone":
		fields := []huh.Field{
			huh.NewInput().Key("name").Title("Name").Validate(nonEmpty),
			huh.NewText().Key("description").Title("Beschreibung (optional)"),
			huh.NewInput().Key("target_date").Title("Zieldatum (optional, YYYY-MM-DD)"),
		}
		if len(tags) > 0 {
			fields = append(fields, tagMultiSelect(tags))
		}
		return huh.NewForm(huh.NewGroup(fields...)).WithWidth(58).WithShowHelp(true)
	case "sprint":
		opts := []huh.Option[string]{huh.NewOption("(kein Meilenstein)", "")}
		for _, ms := range openMilestones(milestones) {
			opts = append(opts, huh.NewOption(ms.Name, strconv.Itoa(ms.ID)))
		}
		fields := []huh.Field{
			huh.NewInput().Key("name").Title("Name").Validate(nonEmpty),
			huh.NewText().Key("goal").Title("Goal (optional)"),
			huh.NewSelect[string]().Key("milestone_id").Title("Meilenstein").Options(opts...),
		}
		if len(tags) > 0 {
			fields = append(fields, tagMultiSelect(tags))
		}
		return huh.NewForm(huh.NewGroup(fields...)).WithWidth(58).WithShowHelp(true)
	case "memory":
		return huh.NewForm(huh.NewGroup(
			huh.NewSelect[string]().Key("category").Title("Kategorie").Options(
				huh.NewOption("Architektur-Entscheidung", "architecture_decision"),
				huh.NewOption("Sackgasse / Dead-End", "dead_end"),
				huh.NewOption("Bug-Muster", "bug_pattern"),
				huh.NewOption("Konvention", "convention"),
				huh.NewOption("Externer Zwang", "external_constraint"),
				huh.NewOption("Session-Notiz", "session_note"),
			),
			huh.NewInput().Key("summary").Title("Summary (Pflicht, max 500)").Validate(nonEmpty),
			huh.NewText().Key("content").Title("Inhalt (optional)"),
			huh.NewInput().Key("anchor").Title("Anchor (optional, z.B. d01)"),
		)).WithWidth(58).WithShowHelp(true)
	case "result":
		return huh.NewForm(huh.NewGroup(
			huh.NewInput().Key("outcome_summary").Title("Ergebnis-Summary (Pflicht)").Validate(nonEmpty),
			huh.NewSelect[string]().Key("outcome_type").Title("Typ").Options(
				huh.NewOption("feat", "feat"),
				huh.NewOption("fix", "fix"),
				huh.NewOption("refactor", "refactor"),
				huh.NewOption("chore", "chore"),
				huh.NewOption("docs", "docs"),
			),
			huh.NewInput().Key("commits").Title("Commits (Komma-getrennt, optional)"),
			huh.NewText().Key("vorgehen").Title("Vorgehen (optional, Markdown)"),
		)).WithWidth(58).WithShowHelp(true)
	}
	return nil
}

// buildFormIssueTab1 baut Tab 1 „Inhalt" (Beschreibung, User-Stories, Tags) des
// zweistufigen Issue-Create-Flows (DD2-36). Wird nach Tab-0-Abschluss aufgerufen.
func buildFormIssueTab1(tags []api.Tag) *huh.Form {
	fields := []huh.Field{
		huh.NewText().Key("description").Title("Beschreibung (optional)"),
		huh.NewText().Key("user_stories").Title("User-Stories (eine pro Zeile, optional)"),
	}
	if len(tags) > 0 {
		fields = append(fields, tagMultiSelect(tags))
	}
	return huh.NewForm(huh.NewGroup(fields...)).WithWidth(58).WithShowHelp(true)
}

// formTabStrip renders den Tab-Strip für mehrblättrige Forms (DD2-36).
// Aktiver Tab: Mauve bold; inaktive Tabs: Hint. Strip-BG: Mantle.
func formTabStrip(titles []string, active int, width int) string {
	var parts []string
	for i, t := range titles {
		if i == active {
			parts = append(parts, lipgloss.NewStyle().Foreground(theme.Mauve).Bold(true).Render(t))
		} else {
			parts = append(parts, lipgloss.NewStyle().Foreground(theme.Hint).Render(t))
		}
	}
	return lipgloss.NewStyle().
		Width(width).Background(theme.Mantle).
		PaddingLeft(1).
		Render(strings.Join(parts, "  "))
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
		if f.key == "title" {
			in = in.Validate(nonEmpty)
		}
		field = in
	default: // text (lange Freitextfelder)
		field = huh.NewText().Key("value").Title(f.label).Value(&v)
	}
	return huh.NewForm(huh.NewGroup(field)).WithShowHelp(true)
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
	case "editField": // DD2-77: ein editiertes Issue-Feld zurückschreiben
		return doUpdateIssueField(m.client, m.editID, m.editField, get("value"))
	case "tagCreate": // DD2-75: neuen Tag anlegen
		return doCreateTag(m.client, get("name"), m.form.GetString("color"))
	case "tagEdit": // DD2-75: Tag umbenennen/umfärben
		return doUpdateTag(m.client, m.tagEditID, get("name"), m.form.GetString("color"))
	case "issue":
		// Tab 1 (Inhalt): Partials aus Tab 0 + aktuelle Felder kombinieren (DD2-36).
		title := strings.TrimSpace(m.formPartials["title"])
		if title == "" {
			title = get("title")
		}
		typ := m.formPartials["type"]
		if typ == "" {
			typ = m.form.GetString("type")
		}
		prioStr := m.formPartials["priority"]
		if prioStr == "" {
			prioStr = m.form.GetString("priority")
		}
		body := api.IssueCreateBody{Title: title, Type: typ, Priority: 2}
		if p, err := strconv.Atoi(prioStr); err == nil {
			body.Priority = p
		}
		if d := get("description"); d != "" {
			body.Description = &d
		}
		body.TagIDs = m.selectedTagIDs() // DD2-33: Tags beim Anlegen (Backend nativ)
		return doCreateIssue(m.client, body, splitLines(get("user_stories"))) // DD2-66
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

// formBox umrahmt das huh-Formular als schwebendes Modal.
func (m model) formBox() string {
	titles := map[string]string{
		"issue":     "Neues Issue",
		"milestone": "Neuer Meilenstein",
		"sprint":    "Neuer Sprint",
		"memory":    "Neue Memory",
		"result":    "Ergebnisfeld setzen",
		"editField": "Bearbeiten: " + m.editLabel, // DD2-77: dynamischer Feld-Titel
		"tagCreate": "Neuer Tag",
		"tagEdit":   "Tag bearbeiten",
	}
	// DD2-25: Höhe/Breite bei JEDEM Render aus dem aktuellen Terminal neu anlegen —
	// fängt „bei height=0 geöffnet" und Resize nach dem Öffnen ab (huh.WithHeight
	// mutiert in place). So kann das Modal nie höher als das Terminal werden.
	if m.form != nil {
		m.form.WithWidth(formInnerWidth(m.width)).WithHeight(formInnerHeight(m.height))
	}
	boxW := modalBoxWidth(m.width)
	innerW := formInnerWidth(m.width)

	// Header: Mantle BG, Mauve bold (DD2-64 BG-Layer)
	header := lipgloss.NewStyle().
		Width(innerW).Background(theme.Mantle).
		Bold(true).Foreground(theme.Mauve).
		Render(titles[m.formKind])

	// Tab-Strip: nur bei mehrblättrigen Forms (DD2-36)
	var sections []string
	sections = append(sections, header)
	if len(m.formGroupTitles) > 1 {
		sections = append(sections, formTabStrip(m.formGroupTitles, m.formGroupIdx, innerW))
	}
	sections = append(sections, m.form.View())

	// Footer: form-spezifische Keybindings (DD2-64)
	footer := lipgloss.NewStyle().
		Width(innerW).Foreground(theme.Hint).
		Render(formFooterKeys(m.formKind))
	sections = append(sections, footer)

	inner := lipgloss.JoinVertical(lipgloss.Left, sections...)

	return lipgloss.NewStyle().
		Width(boxW).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Crust).Padding(0, 1).
		Render(inner)
}

// formFooterKeys returns the keybinding hint for a given form kind.
func formFooterKeys(kind string) string {
	switch kind {
	case "editField", "tagCreate", "tagEdit":
		return "enter confirm · esc cancel"
	default:
		return "tab next · shift+tab prev · ctrl+enter submit · esc cancel"
	}
}

// formHuhTheme returns a Catppuccin Macchiato huh theme (DD2-64).
// Select (#fe640b) = aktiver Select-Cursor; Overlay = Input-/Feld-Border; Mauve = Title.
func formHuhTheme() *huh.Theme {
	t := huh.ThemeBase()

	// Focused field: Overlay border, Mauve title
	t.Focused.Base = t.Focused.Base.BorderForeground(theme.Overlay)
	t.Focused.Card = t.Focused.Base
	t.Focused.Title = t.Focused.Title.Foreground(theme.Mauve).Bold(true)
	t.Focused.Description = t.Focused.Description.Foreground(theme.Hint)
	t.Focused.ErrorIndicator = t.Focused.ErrorIndicator.Foreground(theme.Red)
	t.Focused.ErrorMessage = t.Focused.ErrorMessage.Foreground(theme.Red)

	// Select: aktiver Cursor + Indikatoren = Select (#fe640b, D02 ≠ Peach)
	t.Focused.SelectSelector = t.Focused.SelectSelector.Foreground(theme.Select)
	t.Focused.NextIndicator = t.Focused.NextIndicator.Foreground(theme.Select)
	t.Focused.PrevIndicator = t.Focused.PrevIndicator.Foreground(theme.Select)
	t.Focused.Option = t.Focused.Option.Foreground(theme.Text)
	t.Focused.SelectedOption = t.Focused.SelectedOption.Foreground(theme.Select)

	// Multi-select
	t.Focused.MultiSelectSelector = t.Focused.MultiSelectSelector.Foreground(theme.Select)
	t.Focused.SelectedPrefix = lipgloss.NewStyle().Foreground(theme.Select).SetString("[•] ")
	t.Focused.UnselectedPrefix = lipgloss.NewStyle().Foreground(theme.Hint).SetString("[ ] ")
	t.Focused.UnselectedOption = t.Focused.UnselectedOption.Foreground(theme.Text)

	// Active button = Select orange (D02)
	t.Focused.FocusedButton = t.Focused.FocusedButton.Foreground(theme.Base).Background(theme.Select)
	t.Focused.BlurredButton = t.Focused.BlurredButton.Foreground(theme.Text).Background(theme.Surface)
	t.Focused.Next = t.Focused.FocusedButton

	// TextInput
	t.Focused.TextInput.Cursor = t.Focused.TextInput.Cursor.Foreground(theme.Select)
	t.Focused.TextInput.Placeholder = t.Focused.TextInput.Placeholder.Foreground(theme.Hint)
	t.Focused.TextInput.Prompt = t.Focused.TextInput.Prompt.Foreground(theme.Mauve)
	t.Focused.TextInput.Text = t.Focused.TextInput.Text.Foreground(theme.Text)

	// Form base BG = Base (DD2-64 BG-Layer: body sits on Base)
	t.Form.Base = t.Form.Base.Background(theme.Base)

	// Blurred = Focused with hidden border
	t.Blurred = t.Focused
	t.Blurred.Base = t.Focused.Base.BorderStyle(lipgloss.HiddenBorder())
	t.Blurred.Card = t.Blurred.Base
	t.Blurred.NextIndicator = lipgloss.NewStyle()
	t.Blurred.PrevIndicator = lipgloss.NewStyle()

	return t
}
