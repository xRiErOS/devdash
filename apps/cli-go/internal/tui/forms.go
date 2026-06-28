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

// modalBoxWidth begrenzt die Standard-Modal-Boxbreite auf die Terminalbreite
// (DD2-25): max 64, schrumpft auf schmalen Views, Untergrenze 24.
func modalBoxWidth(termW int) int {
	return clampModalWidth(64, termW)
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
	f := buildForm(kind, m.milestones)
	if f != nil {
		f = f.WithWidth(formInnerWidth(m.width)).WithHeight(formInnerHeight(m.height))
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
func buildForm(kind string, milestones []api.Milestone) *huh.Form {
	switch kind {
	case "issue":
		return huh.NewForm(huh.NewGroup(
			huh.NewInput().Key("title").Title("Titel").
				Placeholder("Kurze Beschreibung des Issues").Validate(nonEmpty),
			huh.NewSelect[string]().Key("type").Title("Typ").Options(typeOptions()...),
			huh.NewSelect[string]().Key("priority").Title("Priorität").Options(priorityOptions()...),
			huh.NewText().Key("description").Title("Beschreibung (optional)"),
		)).WithWidth(58).WithShowHelp(true)
	case "milestone":
		return huh.NewForm(huh.NewGroup(
			huh.NewInput().Key("name").Title("Name").Validate(nonEmpty),
			huh.NewText().Key("description").Title("Beschreibung (optional)"),
			huh.NewInput().Key("target_date").Title("Zieldatum (optional, YYYY-MM-DD)"),
		)).WithWidth(58).WithShowHelp(true)
	case "sprint":
		opts := []huh.Option[string]{huh.NewOption("(kein Meilenstein)", "")}
		for _, ms := range openMilestones(milestones) {
			opts = append(opts, huh.NewOption(ms.Name, strconv.Itoa(ms.ID)))
		}
		return huh.NewForm(huh.NewGroup(
			huh.NewInput().Key("name").Title("Name").Validate(nonEmpty),
			huh.NewText().Key("goal").Title("Goal (optional)"),
			huh.NewSelect[string]().Key("milestone_id").Title("Meilenstein").Options(opts...),
		)).WithWidth(58).WithShowHelp(true)
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
func (m *model) formCreateCmd() tea.Cmd {
	get := func(k string) string { return strings.TrimSpace(m.form.GetString(k)) }
	switch m.formKind {
	case "editField": // DD2-77: ein editiertes Issue-Feld zurückschreiben
		return doUpdateIssueField(m.client, m.editID, m.editField, get("value"))
	case "issue":
		body := api.IssueCreateBody{Title: get("title"), Type: m.form.GetString("type"), Priority: 2}
		if p, err := strconv.Atoi(m.form.GetString("priority")); err == nil {
			body.Priority = p
		}
		if d := get("description"); d != "" {
			body.Description = &d
		}
		return doCreateIssue(m.client, body)
	case "milestone":
		body := api.MilestoneCreateBody{Name: get("name")}
		if d := get("description"); d != "" {
			body.Description = &d
		}
		if td := get("target_date"); td != "" {
			body.TargetDate = &td
		}
		return doCreateMilestone(m.client, body)
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
		return doCreateSprint(m.client, body)
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
	}
	// DD2-25: Höhe/Breite bei JEDEM Render aus dem aktuellen Terminal neu anlegen —
	// fängt „bei height=0 geöffnet" und Resize nach dem Öffnen ab (huh.WithHeight
	// mutiert in place). So kann das Modal nie höher als das Terminal werden.
	if m.form != nil {
		m.form.WithWidth(formInnerWidth(m.width)).WithHeight(formInnerHeight(m.height))
	}
	inner := theme.Header.Render(titles[m.formKind]) + "\n\n" + m.form.View()
	return lipgloss.NewStyle().
		Width(modalBoxWidth(m.width)).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(inner)
}
