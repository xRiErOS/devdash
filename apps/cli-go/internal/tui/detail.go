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

// focusedIssue liefert das Issue unter dem Tree-Cursor, falls der Knoten ein
// Issue ist (nur dort ist der Detail-Fokus gültig, D01/Sprint-Schnitt DD2#12).
func (m model) focusedIssue() *api.Issue {
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
		{"title", "Titel", "input"},
		{"type", "Typ", "select"},
		{"priority", "Priorität", "select"},
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
	secs := []accordionSection{{title: "Übersicht", fields: kopfFields()}}
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

// openEditField öffnet die editField-huh-Form für das aktive Feld (D04), vorbelegt
// mit dem aktuellen Wert. Der Detail-Fokus bleibt erhalten (Form schwebt darüber).
func (m model) openEditField(it api.Issue, f detailField) (tea.Model, tea.Cmd) {
	m.editEntity = "issue"
	m.editID = it.ID
	m.editField = f.key
	m.editLabel = f.label
	m.editEditor = f.editor
	m.editValue = currentFieldValue(it, f.key)
	m.formKind = "editField"
	form := buildEditFieldForm(f, m.editValue)
	form = form.WithWidth(formInnerWidth(m.width)).WithHeight(formInnerHeight(m.height))
	m.form = form
	m.status = ""
	return m, m.form.Init()
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
}

// enterDetailFocus verlagert den Fokus vom Tree in die Detail-Pane (D01): erste
// Section, Section-Ebene, Section offen.
func (m model) enterDetailFocus() (tea.Model, tea.Cmd) {
	m.detailFocus = true
	m.detailLevel = 0
	m.secCursor = 0 // Übersicht (Kopf) — title/type/priority
	m.fieldCursor = 0
	m.accOpen = 0 // Accordion zu; der Fokus steht auf der Übersicht
	m.status = ""
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

	switch msg.String() {
	case "ctrl+c", "q":
		return m.requestQuit() // DD2-49
	case "esc":
		m.exitDetailFocus()
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
