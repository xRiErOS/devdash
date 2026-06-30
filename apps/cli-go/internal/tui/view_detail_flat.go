package tui

// view_detail_flat.go — Meilenstein/Sprint-Detail. DD2-196 (PO 2026-06-30) hebt die
// frühere D09-Flachliste auf: Meilenstein und Sprint nutzen jetzt DASSELBE zwei-
// stufige Accordion wie das Issue-Detail — Overview-Kopf (Name) + ziffern-toggelbare
// Sektionen (Details, Documents, Dependencies, Child-Tabelle). Gemeinsame Fokus-
// Maschine (focusSections/keyDetailFocus). Guardrail-Historie: tui-plan.md (D09
// durch DD2-196 abgelöst).

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
)

// milestoneFields / sprintFields = die editierbaren Felder (D09, flache Liste).
// Single Source = milestoneUpdateContract / sprintUpdateContract (packages/api-types).
// Reihenfolge = Anzeige-Reihenfolge (Name zuerst).
func milestoneFields() []detailField {
	return []detailField{
		{"name", "Name", "input"},
		{"description", "Description", "text"},
		{"target_date", "Target date", "input"},
		// DD2-169: Dokumente-Zugriff NACH Description — editor "docs" → enter
		// öffnet den owner-gebundenen Docs-Browser (kein scalar-Edit).
		{"documents", "Documents", "docs"},
	}
}

func sprintFields() []detailField {
	return []detailField{
		{"name", "Name", "input"},
		{"goal", "Goal", "text"},
		{"documents", "Documents", "docs"}, // DD2-169: Docs-Browser des Sprints
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
	case "documents":
		return "(enter to browse documents)"
	}
	return ""
}

func sprintFieldValue(sp api.Sprint, key string) string {
	switch key {
	case "name":
		return sp.Name
	case "goal":
		return deref(sp.Goal)
	case "documents":
		return "(enter to browse documents)"
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
	if m.view == viewBrowseBacklog {
		return nil
	}
	nodes := m.treeNodes()
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return nil
	}
	return &nodes[m.treeCursor]
}

// milestoneKopfFields / sprintKopfFields = die Header-Felder im Overview (Index 0
// der focusSections, analog kopfFields beim Issue). Der Name ist der Titel und wird
// über die Übersicht editierbar; description/target_date bzw. goal liegen in der
// Details-Section.
func milestoneKopfFields() []detailField { return []detailField{{"name", "Name", "input"}} }
func sprintKopfFields() []detailField    { return []detailField{{"name", "Name", "input"}} }

// milestoneAccordionSections / sprintAccordionSections = die Accordion-Sektionen
// (Index 1+ der focusSections; Overview ist Index 0). DD2-196: gleiches Schema wie
// issueSections — editierbare Felder mit muted (empty)-Platzhalter, read-only Doc-/
// Dependency-Listen und eine Child-Tabelle (Sprints je Meilenstein, Issues je Sprint).
func (m model) milestoneAccordionSections(ms api.Milestone, bodyW int) []accordionSection {
	det := []detailField{{"description", "Description", "text"}, {"target_date", "Target date", "input"}}
	var parts []string
	for _, f := range det {
		parts = append(parts, subhead(f.label, placeholderOr(milestoneFieldValue(ms, f.key))))
	}
	return []accordionSection{
		{title: "Details", body: wrapText(strings.Join(parts, "\n\n"), bodyW), fields: det},
		{title: "Documents", body: m.docsSectionBody(depCacheKey("m", ms.ID), bodyW),
			fields: []detailField{{"documents", "Documents", "docs"}}},
		{title: "Dependencies", body: m.depsSectionBody(depCacheKey("m", ms.ID), bodyW)},
		{title: fmt.Sprintf("Sprints (%d)", len(ms.Sprints)), body: milestoneSprintsTable(ms, bodyW)},
	}
}

func (m model) sprintAccordionSections(sp api.Sprint, bodyW int) []accordionSection {
	det := []detailField{{"goal", "Goal", "text"}}
	parts := []string{subhead("Goal", placeholderOr(sprintFieldValue(sp, "goal")))}
	return []accordionSection{
		{title: "Details", body: wrapText(strings.Join(parts, "\n\n"), bodyW), fields: det},
		{title: "Documents", body: m.docsSectionBody(depCacheKey("s", sp.ID), bodyW),
			fields: []detailField{{"documents", "Documents", "docs"}}},
		{title: "Dependencies", body: m.depsSectionBody(depCacheKey("s", sp.ID), bodyW)},
		{title: fmt.Sprintf("Issues (%d)", sprintIssueCount(m, sp)), body: m.sprintIssuesTable(sp, bodyW)},
	}
}

// docsSectionBody rendert die Inline-Dokument-Liste eines Owners (read-only) als
// Section-Body — ohne den eigenen "Documents"-Header (den trägt schon der Section-
// Titel). Lazy-Cache; nicht geladen → Hinweis, leer → (none).
func (m model) docsSectionBody(key string, w int) string {
	docs, ok := m.ownerDocs[key]
	if !ok {
		return theme.Dim.Render("(loading …)")
	}
	if len(docs) == 0 {
		return theme.Dim.Render("(none)")
	}
	lines := make([]string, len(docs))
	for i, d := range docs {
		lines[i] = truncate("• "+d.Title, w)
	}
	return strings.Join(lines, "\n")
}

// depsSectionBody rendert Vorgänger/Nachfolger eines Owners (read-only) als Section-
// Body — ohne eigenen "Dependencies"-Header. Spiegelt renderTreeDeps.
func (m model) depsSectionBody(key string, w int) string {
	d, ok := m.depsCache[key]
	if !ok {
		return theme.Dim.Render("(loading …)")
	}
	if d == nil || (len(d.Predecessors) == 0 && len(d.Successors) == 0) {
		return theme.Dim.Render("(none)")
	}
	names := func(es []api.DepEntry) string {
		out := make([]string, len(es))
		for i, e := range es {
			out[i] = e.Name
		}
		return strings.Join(out, ", ")
	}
	var parts []string
	if len(d.Predecessors) > 0 {
		parts = append(parts, wrapText(theme.Dim.Render("Predecessors: ")+names(d.Predecessors), w))
	}
	if len(d.Successors) > 0 {
		parts = append(parts, wrapText(theme.Dim.Render("Successors: ")+names(d.Successors), w))
	}
	return strings.Join(parts, "\n")
}

// milestoneSprintsTable rendert die Sprints eines Meilensteins als Child-Tabelle
// (DD2-196 #3): Key + Status + Name (+ gekürztes Goal). Leer → Hinweis.
func milestoneSprintsTable(ms api.Milestone, w int) string {
	if len(ms.Sprints) == 0 {
		return theme.Dim.Render("(no sprints)")
	}
	lines := make([]string, len(ms.Sprints))
	for i, s := range ms.Sprints {
		goal := ""
		if g := deref(s.Goal); g != "" {
			goal = "  " + theme.Dim.Render("— "+truncate(g, 24))
		}
		lines[i] = truncate(col(s.Key, 9)+statusText(s.Status)+"  "+truncate(s.Name, 24)+goal, w)
	}
	return strings.Join(lines, "\n")
}

// sprintIssueCount liefert die Anzahl der (geladenen) Issues eines Sprints für den
// Section-Titel — bevorzugt curSprint/Lazy-Cache, sonst Embedded.
func sprintIssueCount(m model, sp api.Sprint) int {
	return len(sprintIssueItems(m, sp))
}

// sprintIssueItems liefert die Issues eines Sprints aus der besten verfügbaren Quelle
// (curSprint > Lazy-Cache treeIssues > Embedded).
func sprintIssueItems(m model, sp api.Sprint) []api.Issue {
	if m.curSprint != nil && m.curSprint.ID == sp.ID {
		return m.curSprint.Items
	}
	if items, ok := m.treeIssues[sp.ID]; ok {
		return items
	}
	return sp.Items
}

// sprintIssuesTable rendert die Issues eines Sprints als Child-Tabelle (DD2-196 #3).
// Nicht geladen (Sprint nie expandiert) → Hinweis statt leerer Tabelle.
func (m model) sprintIssuesTable(sp api.Sprint, w int) string {
	if _, ok := m.treeIssues[sp.ID]; !ok && (m.curSprint == nil || m.curSprint.ID != sp.ID) && len(sp.Items) == 0 {
		return theme.Dim.Render("(expand sprint to load issues)")
	}
	items := sprintIssueItems(m, sp)
	if len(items) == 0 {
		return theme.Dim.Render("(no issues)")
	}
	lines := make([]string, len(items))
	for i, it := range items {
		lines[i] = truncate(theme.TypeIcon(it.Type)+" "+theme.Key.Render(it.Key)+"  "+statusText(it.Status)+"  "+truncate(it.Title, 30), w)
	}
	return strings.Join(lines, "\n")
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
	// DD2-169: das Documents-Feld editiert nicht skalar, sondern öffnet den
	// owner-gebundenen Docs-Browser (read via glow, edit via neovim, create/delete).
	if f.editor == "docs" {
		return m.openDocsFromContext()
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

// --- Meilenstein-Detail (Vollbild, #1) ---

func (m model) viewDetailMilestone() string {
	ms := m.selMilestone()
	if ms == nil {
		return "\n  (no milestone)\n"
	}
	var b strings.Builder
	b.WriteString(theme.Header.Render(ms.Name) + "\n")
	status := statusText(ms.Status)
	if ms.Deferred == 1 {
		status += " " + theme.Dim.Render("⏸ deferred")
	}
	slots := []hslot{
		{"Status", status},
		{"Progress", fmt.Sprintf("%d/%d", ms.Done, ms.Total)},
		{"Target", deref(ms.TargetDate)},
	}
	if d := deref(ms.Description); d != "" {
		b.WriteString("\n" + theme.Dim.Render("Description:") + "\n" + d + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render(fmt.Sprintf("Sprints (%d):", len(ms.Sprints))) + "\n")
	for _, s := range ms.Sprints {
		goal := ""
		if g := deref(s.Goal); g != "" {
			goal = "  " + theme.Dim.Render("— "+truncate(g, 50))
		}
		b.WriteString(fmt.Sprintf("  %-8s %s  %s%s\n", s.Key, statusText(s.Status), truncate(s.Name, 30), goal))
	}
	return m.chrome("Milestone", slots, b.String(),
		"S: status   a: assign sprints   y: copy   i/k: scroll   esc/q: back")
}

// --- Sprint-Detail (Vollbild) ---

func (m model) viewDetailSprint() string {
	s := m.selSprint()
	if s == nil {
		return "\n  (no sprint)\n"
	}
	// Items aus curSprint (geladen), sonst Embedded.
	items := s.Items
	if m.curSprint != nil && m.curSprint.ID == s.ID {
		items = m.curSprint.Items
	}
	slots := []hslot{
		{"Status", statusText(s.Status)},
		{"Milestone", sprintMilestoneName(s, m.selMilestone())},
		{"Progress", fmt.Sprintf("%d/%d", s.DoneCount, s.ItemCount)},
	}
	var b strings.Builder
	b.WriteString(theme.Header.Render(s.Name) + "\n")
	if g := deref(s.Goal); g != "" {
		b.WriteString("\n" + theme.Accent.Render("Goal:") + "\n" + g + "\n")
	}

	b.WriteString("\n" + theme.Dim.Render(fmt.Sprintf("Issues (%d):", len(items))) + "\n")
	b.WriteString("  " + issueColHeader() + "\n")
	for _, it := range items {
		typePrio := theme.TypeIcon(it.Type) + " " + theme.Priority(it.Priority)
		b.WriteString("  " + cockpitRow(
			typePrio, it.Key, truncate(it.Title, colTitle),
			statusText(it.Status), reviewBadge(it), resultDot(it)) + "\n")
	}
	if len(items) > 0 {
		old := m.curSprint
		m.curSprint = &api.Sprint{ID: s.ID, Items: items}
		b.WriteString("\n" + m.reviewSummary() + "\n")
		m.curSprint = old
	}
	return m.chrome("Sprint "+s.Key, slots, b.String(),
		"R: review cockpit   m: milestone   y: copy   i/k: scroll   esc/q: back")
}
