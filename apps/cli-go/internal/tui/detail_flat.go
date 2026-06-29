package tui

// detail_flat.go — Meilenstein/Sprint-Detail als flache, fokussierbare Feldliste
// (DD2-78, Decision D09). Anders als das Issue-Detail (zweistufiges Accordion) haben
// Meilenstein und Sprint wenige Felder (name/description/target_date bzw. name/goal)
// → ein Accordion wäre Overkill. Das Detail zeigt sie als flache Liste; der Feld-
// Fokus ist EINSTUFIG (ins Detail → direkt Felder). Gleiche Fokus-/Indikator-Sprache
// wie das Issue (D08-Balken, Mauve-aktiv). Guardrail: tui-plan.md.

import (
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

// milestoneFields / sprintFields = die editierbaren Felder (D09, flache Liste).
// Single Source = milestoneUpdateContract / sprintUpdateContract (packages/api-types).
// Reihenfolge = Anzeige-Reihenfolge (Name zuerst).
func milestoneFields() []detailField {
	return []detailField{
		{"name", "Name", "input"},
		{"description", "Description", "text"},
		{"target_date", "Target date", "input"},
	}
}

func sprintFields() []detailField {
	return []detailField{
		{"name", "Name", "input"},
		{"goal", "Goal", "text"},
	}
}

// milestoneFieldValue / sprintFieldValue liefern den aktuellen Wert eines Felds als
// String (Form-Preset DD2-79 + flache Render-Liste DD2-78).
func milestoneFieldValue(ms api.Milestone, key string) string {
	switch key {
	case "name":
		return ms.Name
	case "description":
		return deref(ms.Description)
	case "target_date":
		return deref(ms.TargetDate)
	}
	return ""
}

func sprintFieldValue(sp api.Sprint, key string) string {
	switch key {
	case "name":
		return sp.Name
	case "goal":
		return deref(sp.Goal)
	}
	return ""
}

// focusedNode liefert den Knoten unter dem Tree-Cursor (oder nil bei leerer/aus-
// Bounds-Liste). Der Cursor friert bei Detail-Fokus (D03), darum ist der gerenderte
// Detail-Knoten immer der fokussierte.
func (m model) focusedNode() *treeNode {
	// DD2-138: Der Backlog ist eine Liste, KEIN Baum — dort gibt es keinen treeNode.
	// Ohne diesen Guard läse focusedNode treeNodes()[treeCursor] (= erster Meilenstein,
	// da treeCursor=0) → detailFlatFields lieferte Milestone-Felder → die Backlog-
	// Detail-Tasten landeten fälschlich im Flat-Handler (Detail nicht navigierbar,
	// PO-Test #3). Im Backlog entscheidet allein focusedIssue() (Listen-Selektion).
	if m.view == viewBacklog {
		return nil
	}
	nodes := m.treeNodes()
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return nil
	}
	return &nodes[m.treeCursor]
}

// detailFlatFields liefert die flache Feldliste, wenn der fokussierte Knoten ein
// Meilenstein oder Sprint ist (D09). nil → kein flach-fokussierbarer Knoten
// (Issue nutzt das zweistufige Accordion über focusSections/keyDetailFocus).
func (m model) detailFlatFields() []detailField {
	n := m.focusedNode()
	if n == nil {
		return nil
	}
	switch n.kind {
	case tkMile:
		return milestoneFields()
	case tkSprint:
		return sprintFields()
	}
	return nil
}

// keyDetailFlat steuert die flache Feld-Navigation für Meilenstein/Sprint (DD2-78).
// Einstufig: i/k bewegt direkt zwischen den Feldern, Ziffer springt direkt, h/← und
// esc geben den Fokus an den Tree zurück (es gibt keine Section-Ebene darüber).
// enter/l → Feld editieren (DD2-79 verdrahtet den Schreibpfad; bis dahin no-op).
func (m model) keyDetailFlat(msg tea.KeyMsg, fields []detailField) (tea.Model, tea.Cmd) {
	if len(fields) == 0 { // Knoten weg → Fokus zurück in den Tree
		m.exitDetailFocus()
		return m, nil
	}
	// Klemmen (analog clampDetailCursor) — flach: immer Feld-Ebene.
	m.detailLevel = 1
	if m.fieldCursor < 0 {
		m.fieldCursor = 0
	}
	if m.fieldCursor >= len(fields) {
		m.fieldCursor = len(fields) - 1
	}

	switch {
	case keybind.Matches(msg, keys.Quit):
		return m.requestQuit() // DD2-49
	case keybind.Matches(msg, keys.Back):
		m.exitDetailFocus()
		return m, nil
	case keybind.Matches(msg, keys.TagAssign): // DD2-33: Tag-Picker für den fokussierten Knoten (1:1 zum Issue-Detail)
		if n := m.focusedNode(); n != nil {
			switch n.kind {
			case tkMile:
				ms := m.milestones[n.mileIdx]
				return m.openTagPicker("milestone", ms.ID, ms.Name, nil)
			case tkSprint:
				sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
				return m.openTagPicker("sprint", sp.ID, sp.Name, nil)
			}
		}
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		return m.editFlatField(fields[m.fieldCursor])
	}

	// Ziffer 1..n = Direktsprung auf das n-te Feld (Muskelmemory wie das Accordion).
	if s := msg.String(); len(s) == 1 && s[0] >= '1' && s[0] <= '9' {
		if d := int(s[0] - '1'); d < len(fields) {
			m.fieldCursor = d
		}
		return m, nil
	}

	switch navKey(msg.String()) {
	case "down":
		if m.fieldCursor < len(fields)-1 {
			m.fieldCursor++
		}
	case "up":
		if m.fieldCursor > 0 {
			m.fieldCursor--
		}
	case "right": // l/→ : Feld editieren (es gibt keine tiefere Ebene)
		return m.editFlatField(fields[m.fieldCursor])
	case "left": // j/← : zurück in den Tree (flache Liste hat keine Section-Ebene)
		m.exitDetailFocus()
	}
	return m, nil
}

// editFlatField öffnet die editField-Form für das aktive Meilenstein/Sprint-Feld
// (DD2-79), vorbelegt mit dem aktuellen Wert. Submit schreibt über UpdateMilestone/
// UpdateSprint (formCreateCmd dispatcht per m.editEntity), die Response merged in-
// place (D05). Status weiter über das Lifecycle-Menü, nicht hier (PO-Notes).
func (m model) editFlatField(f detailField) (tea.Model, tea.Cmd) {
	n := m.focusedNode()
	if n == nil {
		return m, nil
	}
	switch n.kind {
	case tkMile:
		ms := m.milestones[n.mileIdx]
		return m.openEditFieldGeneric("milestone", ms.ID, f, milestoneFieldValue(ms, f.key))
	case tkSprint:
		sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
		return m.openEditFieldGeneric("sprint", sp.ID, f, sprintFieldValue(sp, f.key))
	}
	return m, nil
}

// mergeMilestoneIntoCache merged die editierten Kern-Spalten (name/description/
// target_date) der Update-Response in-place in die milestones-Slice, per ID (D05).
// Anzeige-Joins (Sprints/Counts) bleiben unberührt — die PUT-Response trägt sie
// nicht zwingend (Spiegel von mergeIssueCore).
func (m *model) mergeMilestoneIntoCache(src *api.Milestone) {
	if src == nil {
		return
	}
	for i := range m.milestones {
		if m.milestones[i].ID == src.ID {
			m.milestones[i].Name = src.Name
			m.milestones[i].Description = src.Description
			m.milestones[i].TargetDate = src.TargetDate
		}
	}
}

// mergeSprintIntoCache merged name/goal der Update-Response in-place in jede
// milestones[*].Sprints-Zeile (per ID) UND in curSprint, falls geladen (D05).
func (m *model) mergeSprintIntoCache(src *api.Sprint) {
	if src == nil {
		return
	}
	for mi := range m.milestones {
		for si := range m.milestones[mi].Sprints {
			if m.milestones[mi].Sprints[si].ID == src.ID {
				m.milestones[mi].Sprints[si].Name = src.Name
				m.milestones[mi].Sprints[si].Goal = src.Goal
			}
		}
	}
	if m.curSprint != nil && m.curSprint.ID == src.ID {
		m.curSprint.Name = src.Name
		m.curSprint.Goal = src.Goal
	}
}

// renderFlatFields rendert die Meilenstein/Sprint-Felder als flache, fokussierbare
// Liste (D09): je Feld eine Label-Kopfzeile + eingerückter Wert. Das aktive Feld
// (bei Detail-Fokus) trägt den D08-Balken ▌ + Accent-Tönung — gleiche Sprache wie
// der Tree-Cursor und der Issue-Accordion-Header. Werte werden explizit auf w
// umgebrochen (kein Auto-Wrap in der bordered Pane, Golden Rule #2).
func renderFlatFields(fields []detailField, values []string, active int, focused bool, w int) string {
	boxStyle := lipgloss.NewStyle().Width(w - 2).PaddingLeft(2)
	var b strings.Builder
	for i, f := range fields {
		head := theme.Chevron.Render("> ") + theme.Header.Render(f.label)
		if focused && i == active {
			head = theme.Accent.Render("▌" + truncate(ansi.Strip("> "+f.label), w-1))
		}
		b.WriteString(truncate(head, w) + "\n")
		val := values[i]
		if strings.TrimSpace(val) == "" {
			val = theme.Dim.Render("(empty)")
		}
		b.WriteString(boxStyle.Render(wrapText(val, w-2)) + "\n")
	}
	return strings.TrimRight(b.String(), "\n")
}

// flatFieldValues sammelt die aktuellen Werte zu einem Feld-Set (Render-Helfer).
func milestoneFieldValues(ms api.Milestone, fields []detailField) []string {
	out := make([]string, len(fields))
	for i, f := range fields {
		out[i] = milestoneFieldValue(ms, f.key)
	}
	return out
}

func sprintFieldValues(sp api.Sprint, fields []detailField) []string {
	out := make([]string, len(fields))
	for i, f := range fields {
		out[i] = sprintFieldValue(sp, f.key)
	}
	return out
}
