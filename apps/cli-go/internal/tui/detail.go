package tui

// detail.go — Detail-Fokus-Maschine (DD2-76). Macht die rechte Detail-Pane aus
// einem read-only Anzeigeblock zur fokussierbaren, zwei-stufig navigierbaren
// Arbeitsfläche. Tree bleibt Navigator (D01); enter/l auf einem Issue-Knoten
// verlagert den Fokus, j/← bzw. esc geben ihn zurück. Reine Navigation — der
// Schreibpfad (huh-Form → UpdateIssue) folgt in DD2-77. Guardrail: tui-plan.md.

import (
	"strconv"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// focusedIssue liefert das Issue, dessen Detail-Pane gerade den Fokus hält. Im
// Backlog-Screen (DD2-74) ist das die Listen-Selektion; im Tree der Knoten unter
// dem Cursor, falls er ein Issue ist (nur dort gilt der Detail-Fokus, D01).
func (m model) focusedIssue() *api.Issue {
	if m.view == viewBacklog {
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

// focusSections liefert die navigierbaren Sektionen des fokussierten Issues: zuerst
// die Übersicht (Kopf: title/type/priority), dann die Accordion-Sektionen
// (Single Source = issueSections, kein Drift). nil, wenn kein Issue fokussiert ist.
func (m model) focusSections() []accordionSection {
	it := m.focusedIssue()
	if it == nil {
		return nil
	}
	_, _, _, rw, _ := m.treeLayout()
	secs := []accordionSection{{title: "Overview", fields: kopfFields()}}
	return append(secs, m.issueSections(*it, rw-4)...)
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

// enterDetailFocus verlagert den Fokus vom Tree in die Detail-Pane (D01). Issue:
// erste Section, Section-Ebene, Section zu (zweistufig). Meilenstein/Sprint: direkt
// auf Feld-Ebene (flache Liste, einstufig — D09/DD2-78).
func (m model) enterDetailFocus() (tea.Model, tea.Cmd) {
	m.detailFocus = true
	m.fieldCursor = 0
	m.secCursor = 0
	m.status = ""
	if n := m.focusedNode(); n != nil && (n.kind == tkMile || n.kind == tkSprint) {
		m.detailLevel = 1 // flach: sofort Feld-Ebene (D09)
		return m, nil
	}
	m.detailLevel = 0 // Issue: Übersicht (Kopf), Section-Ebene
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
	// Meilenstein/Sprint: flache, einstufige Feldliste (D09/DD2-78) — eigener Handler.
	if ff := m.detailFlatFields(); ff != nil {
		return m.keyDetailFlat(msg, ff)
	}
	secs := m.focusSections()
	if len(secs) == 0 { // Issue weg/feldlos → Fokus zurück in den Tree
		m.exitDetailFocus()
		return m, nil
	}
	m.clampDetailCursor(secs)

	switch msg.String() {
	case "ctrl+c", "q":
		return m.requestQuit() // DD2-49
	case "esc":
		m.exitDetailFocus()
		return m, nil
	case "t": // DD2-33: Tag-Picker für das fokussierte Issue
		if it := m.focusedIssue(); it != nil {
			return m.openTagPicker("issue", it.ID, it.Key+" "+it.Title, it.Tags)
		}
		return m, nil
	case "d": // DD2-65: fokussiertes Issue löschen (Confirm)
		if it := m.focusedIssue(); it != nil {
			return m.openDelete("issue", it.ID, it.Key+" "+it.Title)
		}
		return m, nil
	case "S": // DD2-136: fokussiertes Issue einem Sprint zuweisen
		if it := m.focusedIssue(); it != nil {
			return m.openAssignSprint(it.ID)
		}
		return m, nil
	case "enter":
		// Section-Ebene → in die Section rein (wie l/→); Feld-Ebene → editField-Form
		// für das aktive Feld öffnen (D04).
		if m.detailLevel == 0 {
			if len(secs[m.secCursor].fields) > 0 {
				m.detailLevel = 1
				m.fieldCursor = 0
			}
			return m, nil
		}
		if it := m.focusedIssue(); it != nil {
			return m.openEditField(*it, secs[m.secCursor].fields[m.fieldCursor])
		}
		return m, nil
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
