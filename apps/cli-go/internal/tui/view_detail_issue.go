package tui

// view_detail_issue.go — Detail-Fokus-Maschine (DD2-76). Macht die rechte Detail-Pane aus
// einem read-only Anzeigeblock zur fokussierbaren, zwei-stufig navigierbaren
// Arbeitsfläche. Tree bleibt Navigator (D01); enter/l auf einem Issue-Knoten
// verlagert den Fokus, j/← bzw. esc geben ihn zurück. Reine Navigation — der
// Schreibpfad (huh-Form → UpdateIssue) folgt in DD2-77. Guardrail: tui-plan.md.

import (
	"strconv"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// focusedIssue liefert das Issue, dessen Detail-Pane gerade den Fokus hält. Im
// Backlog-Screen (DD2-74) ist das die Listen-Selektion; im Tree der Knoten unter
// dem Cursor, falls er ein Issue ist (nur dort gilt der Detail-Fokus, D01).
func (m model) focusedIssue() *api.Issue {
	if m.view == viewBrowseBacklog {
		return m.backlogSelected()
	}
	nodes := m.treeNodes()
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return nil
	}
	if n := nodes[m.treeCursor]; n.kind == tkIssue {
		return n.issue
	}
	return nil
}

// kopfFields = die editierbaren Header-Felder (title/type/priority) eines Issues,
// die NICHT im Accordion liegen (detailTitle + Meta-Strip). DD2-77 macht sie über
// die Übersicht-Section (Fokus-Index 0) erreichbar. Statische Metadaten — der Wert
// kommt zur Edit-Zeit aus currentFieldValue.
func kopfFields() []detailField {
	return []detailField{
		{"title", "Title", "input"},
		{"type", "Type", "select"},
		{"priority", "Priority", "select"},
	}
}

// focusSections liefert die navigierbaren Sektionen der fokussierten Entität: zuerst
// die Übersicht (Kopf), dann die Accordion-Sektionen. DD2-196: Meilenstein und Sprint
// nutzen dasselbe Schema wie das Issue (Overview = Name, dann milestone-/sprint-
// AccordionSections). nil, wenn nichts fokussiert ist.
func (m model) focusSections() []accordionSection {
	_, _, _, rw, _ := m.treeLayout()
	bodyW := rw - 4
	if n := m.focusedNode(); n != nil {
		switch n.kind {
		case tkMile:
			if n.mileIdx < 0 || n.mileIdx >= len(m.milestones) {
				return nil
			}
			ms := m.milestones[n.mileIdx]
			secs := []accordionSection{{title: "Overview", fields: milestoneKopfFields()}}
			return append(secs, m.milestoneAccordionSections(ms, bodyW)...)
		case tkSprint:
			if n.mileIdx < 0 || n.mileIdx >= len(m.milestones) ||
				n.sprIdx < 0 || n.sprIdx >= len(m.milestones[n.mileIdx].Sprints) {
				return nil
			}
			sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
			secs := []accordionSection{{title: "Overview", fields: sprintKopfFields()}}
			return append(secs, m.sprintAccordionSections(sp, bodyW)...)
		}
	}
	it := m.focusedIssue()
	if it == nil {
		return nil
	}
	secs := []accordionSection{{title: "Overview", fields: kopfFields()}}
	return append(secs, m.issueSections(*it, bodyW, true)...) // full: alle Felder editierbar (DD2-144)
}

// currentFieldValue liefert den aktuellen Wert eines Contract-Felds als String
// (Form-Preset, DD2-77). Priority als Zahl-String (Select-Option).
func currentFieldValue(it api.Issue, field string) string {
	switch field {
	case "title":
		return it.Title
	case "type":
		return it.Type
	case "priority":
		return strconv.Itoa(it.Priority)
	case "goal":
		return deref(it.Goal)
	case "background":
		return deref(it.Background)
	case "context_notes":
		return deref(it.ContextNotes)
	case "relevant_files":
		return deref(it.RelevantFiles)
	case "po_notes":
		return deref(it.PoNotes)
	case "description":
		return deref(it.Description)
	}
	return ""
}

// openEditField öffnet die editField-huh-Form für das aktive Issue-Feld (D04),
// vorbelegt mit dem aktuellen Wert. Der Detail-Fokus bleibt erhalten (Form schwebt
// darüber). Delegiert an openEditFieldGeneric (Single Source, geteilt mit DD2-79).
func (m model) openEditField(it api.Issue, f detailField) (tea.Model, tea.Cmd) {
	return m.openEditFieldGeneric("issue", it.ID, f, currentFieldValue(it, f.key))
}

// editFocusedField öffnet die Edit-Form für das aktive Feld der fokussierten Entität
// (DD2-196): Meilenstein/Sprint über editFlatField (docs-Browse bzw. scalar via
// UpdateMilestone/UpdateSprint), Issue über die US-Form bzw. openEditField.
func (m model) editFocusedField(f detailField) (tea.Model, tea.Cmd) {
	if n := m.focusedNode(); n != nil && (n.kind == tkMile || n.kind == tkSprint) {
		return m.editFlatField(f)
	}
	if it := m.focusedIssue(); it != nil {
		if f.editor == "userstory" { // DD2-144: US-Felder → US-Form statt scalar-Edit
			return m.openUserStoryForm(*it, f)
		}
		return m.openEditField(*it, f)
	}
	return m, nil
}

// mergeIssueCore überträgt nur die editierbaren Kern-Spalten von src nach dst und
// lässt Anzeige-Joins (milestone/sprint_key/tags/user_stories/review_*) unberührt.
// Die Update-Response (PUT /api/backlog/:id) ist eine rohe Backlog-Zeile OHNE diese
// Joins (Backend-beobachtet) — ein voller Replace würde sie blanken (D05-Refinement).
func mergeIssueCore(dst, src *api.Issue) {
	dst.Title = src.Title
	dst.Type = src.Type
	dst.Priority = src.Priority
	dst.Goal = src.Goal
	dst.Background = src.Background
	dst.ContextNotes = src.ContextNotes
	dst.RelevantFiles = src.RelevantFiles
	dst.PoNotes = src.PoNotes
	dst.Description = src.Description
}

// mergeIssueIntoCache merged die editierte Issue-Zeile in-place in beide Caches
// (treeIssues je Sprint + treeFilterIssues projektweit), per ID gematcht (D05).
func (m *model) mergeIssueIntoCache(src *api.Issue) {
	if src == nil {
		return
	}
	for sid := range m.treeIssues {
		items := m.treeIssues[sid]
		for i := range items {
			if items[i].ID == src.ID {
				mergeIssueCore(&items[i], src)
			}
		}
	}
	for i := range m.treeFilterIssues {
		if m.treeFilterIssues[i].ID == src.ID {
			mergeIssueCore(&m.treeFilterIssues[i], src)
		}
	}
	// DD2-74: dieselbe in-place-Merge auch im Backlog-Cache (Edit aus dem Backlog-
	// Screen) — kein Refetch, die Detail-Preview spiegelt den neuen Wert sofort.
	for i := range m.backlog {
		if m.backlog[i].ID == src.ID {
			mergeIssueCore(&m.backlog[i], src)
		}
	}
}

// mergeUserStories spiegelt die frische US-Liste eines Issues in alle Caches:
// Review-Abnahme-Modal (usList/uslist), Cockpit-Sprint, Backlog und Tree — kein
// Refetch (DD2-144). curSprint deckt DD2-67 #4 ab (US-Dot schlägt live um).
func (m *model) mergeUserStories(issueID int, items []api.UserStory) {
	if issueID == m.usIssueID {
		m.usList = items
		m.uslist.setLen(len(items))
	}
	apply := func(list []api.Issue) {
		for i := range list {
			if list[i].ID == issueID {
				list[i].UserStories = items
			}
		}
	}
	if m.curSprint != nil {
		apply(m.curSprint.Items)
	}
	apply(m.backlog)
	apply(m.treeFilterIssues)
	for sid := range m.treeIssues {
		apply(m.treeIssues[sid])
	}
}

// enterDetailFocus verlagert den Fokus vom Tree in die Detail-Pane (D01). DD2-196:
// einheitlich zweistufig für Issue, Meilenstein und Sprint — Start auf der Übersicht
// (Section-Ebene), Accordion zu.
func (m model) enterDetailFocus() (tea.Model, tea.Cmd) {
	m.detailFocus = true
	m.fieldCursor = 0
	m.secCursor = 0
	m.status = ""
	m.detailLevel = 0 // Übersicht (Kopf), Section-Ebene
	m.accOpen = 0     // Accordion zu; der Fokus steht auf der Übersicht
	return m, nil
}

// exitDetailFocus gibt den Fokus an den Tree zurück; der Tree-Cursor (eingefroren
// während des Detail-Fokus) wird wieder aktiv.
func (m *model) exitDetailFocus() {
	m.detailFocus = false
	m.detailLevel = 0
	m.fieldCursor = 0
}

// clampDetailCursor klemmt sec-/fieldCursor an die aktuelle Sektions-/Feld-Anzahl
// (analog treeCursor) — die Sektionen sind inhalts-gegated, können sich also je
// Issue unterscheiden. Eine feldlose (read-only) Section fällt auf Section-Ebene.
func (m *model) clampDetailCursor(secs []accordionSection) {
	if len(secs) == 0 {
		m.secCursor, m.fieldCursor, m.detailLevel = 0, 0, 0
		return
	}
	if m.secCursor < 0 {
		m.secCursor = 0
	}
	if m.secCursor >= len(secs) {
		m.secCursor = len(secs) - 1
	}
	fn := len(secs[m.secCursor].fields)
	if fn == 0 {
		m.fieldCursor = 0
		m.detailLevel = 0
		return
	}
	if m.fieldCursor < 0 {
		m.fieldCursor = 0
	}
	if m.fieldCursor >= fn {
		m.fieldCursor = fn - 1
	}
}

// keyDetailFocus steuert die Detail-Pane im Fokus (DD2-76, read-only): zwei-Ebenen-
// Navigation Section↔Feld mit i/k, l/→ rein, j/← raus (oberste → Tree), Ziffer-
// Sprung, esc zurück. Vom keyTree-Dispatch aufgerufen, solange detailFocus gilt.
func (m model) keyDetailFocus(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	secs := m.focusSections()
	if len(secs) == 0 { // Issue weg/feldlos → Fokus zurück in den Tree
		m.exitDetailFocus()
		return m, nil
	}
	m.clampDetailCursor(secs)

	switch {
	case keybind.Matches(msg, keys.Quit):
		return m.requestQuit() // DD2-49
	case keybind.Matches(msg, keys.Back):
		m.exitDetailFocus()
		return m, nil
	case keybind.Matches(msg, keys.TagAssign): // DD2-33/196: Tag-Picker für die fokussierte Entität
		if n := m.focusedNode(); n != nil {
			switch n.kind {
			case tkMile:
				ms := m.milestones[n.mileIdx]
				return m.openTagPicker("milestone", ms.ID, ms.Name, ms.Tags)
			case tkSprint:
				sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
				return m.openTagPicker("sprint", sp.ID, sp.Name, nil)
			}
		}
		if it := m.focusedIssue(); it != nil {
			return m.openTagPicker("issue", it.ID, it.Key+" "+it.Title, it.Tags)
		}
		return m, nil
	case keybind.Matches(msg, keys.Delete): // DD2-65/196: fokussierte Entität löschen (Confirm)
		if n := m.focusedNode(); n != nil {
			switch n.kind {
			case tkMile:
				ms := m.milestones[n.mileIdx]
				return m.openDelete("milestone", ms.ID, ms.Name)
			case tkSprint:
				sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
				return m.openDelete("sprint", sp.ID, sp.Name)
			}
		}
		if it := m.focusedIssue(); it != nil {
			return m.openDelete("issue", it.ID, it.Key+" "+it.Title)
		}
		return m, nil
	case keybind.Matches(msg, keys.Assign): // DD2-136/174: fokussiertes Issue einem Sprint zuweisen (a, war S)
		if it := m.focusedIssue(); it != nil {
			return m.openAssignSprint(it.ID)
		}
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		// Section-Ebene → in die Section rein (wie l/→); Feld-Ebene → editField-Form
		// für das aktive Feld öffnen (D04).
		if m.detailLevel == 0 {
			if len(secs[m.secCursor].fields) > 0 {
				m.detailLevel = 1
				m.fieldCursor = 0
			}
			return m, nil
		}
		return m.editFocusedField(secs[m.secCursor].fields[m.fieldCursor])
	}

	// Ziffer 1..n = Direktsprung in die Accordion-Section (1 = erste Content-Section
	// = focusSections-Index 1, da Index 0 die Übersicht ist; DD2-50-Muskelmemory).
	if s := msg.String(); len(s) == 1 && s[0] >= '1' && s[0] <= '9' {
		if d := int(s[0] - '0'); d < len(secs) {
			m.secCursor = d
			m.accOpen = d
			m.detailLevel = 0
			m.fieldCursor = 0
		}
		return m, nil
	}

	switch navKey(msg.String()) {
	case "down":
		if m.detailLevel == 0 {
			if m.secCursor < len(secs)-1 {
				m.secCursor++
				m.accOpen = m.secCursor
				m.fieldCursor = 0
			}
		} else if m.fieldCursor < len(secs[m.secCursor].fields)-1 {
			m.fieldCursor++
		}
	case "up":
		if m.detailLevel == 0 {
			if m.secCursor > 0 {
				m.secCursor--
				m.accOpen = m.secCursor
				m.fieldCursor = 0
			}
		} else if m.fieldCursor > 0 {
			m.fieldCursor--
		}
	case "right": // l/→ : in die Section rein (nur wenn editierbare Felder da sind)
		if m.detailLevel == 0 && len(secs[m.secCursor].fields) > 0 {
			m.detailLevel = 1
			m.fieldCursor = 0
		}
	case "left": // j/← : eine Ebene zurück (oberste Section → Tree)
		if m.detailLevel == 1 {
			m.detailLevel = 0
		} else {
			m.exitDetailFocus()
		}
	}
	return m, nil
}

// paneBorderColors liefert die Border-Farben (links, rechts) je nach Fokus (D03):
// der fokussierte Pane ist Mauve (aktiv), der andere Overlay (inaktiv).
func paneBorderColors(detailFocus bool) (left, right lipgloss.Color) {
	if detailFocus {
		return theme.Overlay, theme.Mauve
	}
	return theme.Mauve, theme.Overlay
}

// --- Issue-Detail (Vollbild, #5 Rahmen, #6 alle Felder, #9 Titel) ---

func (m model) viewDetailIssue() string {
	it := m.selIssue()
	if it == nil {
		return "\n  (no issue)\n"
	}
	tags := ""
	if len(it.Tags) > 0 {
		names := make([]string, len(it.Tags))
		for i, t := range it.Tags {
			names[i] = t.Name
		}
		tags = strings.Join(names, ", ")
	}
	slots := []hslot{
		{"Status", statusText(it.Status)},
		{"Type", theme.TypeIcon(it.Type) + " " + theme.TypeStyle(it.Type).Render(it.Type)},
		{"Prio", theme.Priority(it.Priority)},
		{"Milestone", deref(it.Milestone)},
		{"Sprint", deref(it.SprintKey)},
		{"Tags", tags},
	}
	var b strings.Builder
	b.WriteString(theme.Header.Render(it.Title) + "\n")
	b.WriteString(issueFields(it))

	stamp := []string{}
	if s := deref(it.CreatedAt); s != "" {
		stamp = append(stamp, "erstellt "+s)
	}
	if s := deref(it.RefinedAt); s != "" {
		stamp = append(stamp, "refined "+s)
	}
	if len(stamp) > 0 {
		b.WriteString("\n" + theme.Dim.Render(strings.Join(stamp, " ∙ ")) + "\n")
	}
	return m.chrome("Issue "+it.Key, slots, b.String(),
		"s: status   i/k: scroll   g/G: start/end   esc/q: back")
}
