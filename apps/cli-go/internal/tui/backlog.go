package tui

// backlog.go — Backlog als Master-Detail (DD2-32) mit Suche/Filter/Sortierung
// (DD2-46). Liste links (neu + geplant ohne Sprint), read-only Detail-Preview
// rechts. Zwei-Pane-Fokus (Liste↔Detail) mit Border-Tausch (D03) und Section-
// Navigation — dieselben Primitive wie der Tree-Detail (detailTitle/metaStrip/
// renderAccordion/issueSections), kein Zweit-Layout (tui-plan.md). Such-/Filter-/
// Sortier-Logik läuft client-seitig über die geladene Backlog-Slice (backlogVisible);
// die API hat keinen sort-Param. Der Inline-Edit-Layer folgt in DD2-74.

import (
	"sort"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

// sortOpt = eine Option des Sortier-Pickers (DD2-46 S3).
type sortOpt struct{ value, label string }

// backlogSortOpts sind die client-seitigen Sortier-Modi (API hat keinen sort-Param).
func backlogSortOpts() []sortOpt {
	return []sortOpt{
		{"prio", "Priorität (kritisch zuerst)"},
		{"created", "Erstelldatum (neueste zuerst)"},
		{"key", "Anlage-Reihenfolge (id)"},
	}
}

// sortBacklog sortiert in-place nach dem Modus (stabil, damit gleiche Schlüssel die
// Eingangsreihenfolge behalten). prio: Priority aufsteigend (1 = kritisch zuerst).
func sortBacklog(items []api.Issue, mode string) {
	switch mode {
	case "created":
		sort.SliceStable(items, func(i, j int) bool {
			return deref(items[i].CreatedAt) > deref(items[j].CreatedAt) // neueste zuerst
		})
	case "key":
		sort.SliceStable(items, func(i, j int) bool { return items[i].ID < items[j].ID })
	default: // "prio" / ""
		sort.SliceStable(items, func(i, j int) bool { return items[i].Priority < items[j].Priority })
	}
}

// backlogVisible wendet Suche (Key+Titel), Typ-/Status-Facetten und Sortierung auf
// das geladene Backlog an (DD2-46). Single Source für Render UND Navigation —
// blist/backlogSelected laufen über diese Sicht, nicht über m.backlog roh.
func (m model) backlogVisible() []api.Issue {
	q := strings.ToLower(strings.TrimSpace(m.blQuery))
	out := make([]api.Issue, 0, len(m.backlog))
	for _, it := range m.backlog {
		if q != "" && !strings.Contains(strings.ToLower(it.Key+" "+it.Title), q) {
			continue
		}
		if len(m.blfType) > 0 && !m.blfType[it.Type] {
			continue
		}
		if len(m.blfStatus) > 0 && !m.blfStatus[it.Status] {
			continue
		}
		out = append(out, it)
	}
	sortBacklog(out, m.blSort)
	return out
}

// backlogSelected liefert das Issue unter dem Listen-Cursor aus der gefilterten
// Sicht (bounds-sicher).
func (m model) backlogSelected() *api.Issue {
	vis := m.backlogVisible()
	if m.blist.cursor < 0 || m.blist.cursor >= len(vis) {
		return nil
	}
	return &vis[m.blist.cursor]
}

// --- Filter-/Sortier-Menüs (DD2-46) ---

// buildBacklogFilterItems baut die Facetten-Zeilen: feste Type-Facetten + die im
// geladenen Backlog vorkommenden Status-Werte.
func (m model) buildBacklogFilterItems() []ffItem {
	items := []ffItem{
		{"type", "bug", "Bug"},
		{"type", "feature", "Feature"},
		{"type", "improvement", "Improvement"},
		{"type", "core", "Core"},
	}
	seen := map[string]bool{}
	for _, it := range m.backlog {
		if it.Status != "" && !seen[it.Status] {
			seen[it.Status] = true
			items = append(items, ffItem{"status", it.Status, it.Status})
		}
	}
	return items
}

// backlogFilterActive = mindestens eine Facette gesetzt.
func (m model) backlogFilterActive() bool {
	return len(m.blfType)+len(m.blfStatus) > 0
}

// openBacklogFilter öffnet das Facetten-Menü (Typ/Status).
func (m model) openBacklogFilter() (tea.Model, tea.Cmd) {
	m.blfItems = m.buildBacklogFilterItems()
	m.blfMenu = listState{}
	m.blfMenu.setLen(len(m.blfItems))
	m.blFilterOpen = true
	return m, nil
}

// openBacklogSort öffnet den Sortier-Picker, Cursor auf den aktiven Modus.
func (m model) openBacklogSort() (tea.Model, tea.Cmd) {
	opts := backlogSortOpts()
	m.blSortMenu = listState{}
	m.blSortMenu.setLen(len(opts))
	for i, o := range opts {
		if o.value == m.blSort {
			m.blSortMenu.cursor = i
		}
	}
	m.blSortOpen = true
	return m, nil
}

// --- Layout / Render ---

// backlogLayout liefert Header, lokale Shortcuts und die Pane-Geometrie — analog
// treeLayout (DD2-61). Single Source für Render.
func (m model) backlogLayout() (head, localKeys string, lw, rw, innerH int) {
	w := m.termWidth()
	head = m.breadcrumb("Backlog")
	hint := "i/k:↑↓  l/→/enter:Detail  /:Suche  f:Filter  s:Sortierung  t:Tags  b/esc:zurück"
	switch {
	case m.blSearching:
		hint = "tippen: filtern   enter: übernehmen   esc: abbrechen"
	case m.detailFocus:
		hint = "i/k:Section/Feld  l/→:rein  enter:bearbeiten  j/←:zurück  1…n:Section  esc:Liste"
	}
	localKeys = theme.Muted.Render(wrapText(hint, w))
	footH := lipgloss.Height(localKeys) + 1 // + 1 Status-Zeile
	avail := m.height - lipgloss.Height(head) - footH
	if avail < 4 {
		avail = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}
	lw = m.cfg.Layout.TreeWidth // DD2-40: konfigurierbar (layout.tree_width)
	if lw <= 0 {
		lw = 36
	}
	if cap := w * 2 / 5; lw > cap {
		lw = cap
	}
	if lw < 24 {
		lw = 24
	}
	rw = w - lw - 4 // je Pane 2 Border-Spalten
	if rw < 20 {
		rw = 20
	}
	innerH = avail - 2 // Border oben/unten — NICHT via Height() (Golden Rule #1)
	if innerH < 3 {
		innerH = 3
	}
	return
}

// backlogSearchLine rendert den Listen-Kopf (DESIGN „Such-/Filterbox"): Such-Glyph +
// Status. Inaktiv = Hint, Eingabe aktiv = Suchfeld, Filter/Suche gesetzt = rot.
func (m model) backlogSearchLine(w int) string {
	const shield = "⌕"
	if m.blSearching {
		return truncate(shield+" "+m.blSearch.View(), w)
	}
	var parts []string
	if s := m.backlogFilterSummary(); s != "" {
		parts = append(parts, s)
	}
	if m.blQuery != "" {
		parts = append(parts, m.blQuery)
	}
	if len(parts) > 0 {
		return truncate(lipgloss.NewStyle().Foreground(theme.Red).Render(shield+" "+strings.Join(parts, " ")), w)
	}
	return truncate(theme.Dim.Render(shield+" /:Suche  f:Filter  s:Sortierung"), w)
}

// backlogFilterSummary fasst die aktiven Facetten + Nicht-Default-Sortierung kurz.
func (m model) backlogFilterSummary() string {
	var p []string
	if len(m.blfType) > 0 {
		p = append(p, "Typ:"+joinFilterKeys(m.blfType))
	}
	if len(m.blfStatus) > 0 {
		p = append(p, "St:"+joinFilterKeys(m.blfStatus))
	}
	if m.blSort != "" && m.blSort != "prio" {
		p = append(p, "Sort:"+m.blSort)
	}
	return strings.Join(p, " ")
}

// backlogListLines rendert die (gefilterte) Issue-Liste mit Cursor. active=false
// friert den Cursor ein (Detail-Fokus, D03): Balken bleibt, aber muted.
func (m model) backlogListLines(vis []api.Issue, w int, active bool) []string {
	if len(vis) == 0 {
		if m.blQuery != "" || m.backlogFilterActive() {
			return []string{theme.Dim.Render("(keine Treffer)")}
		}
		return []string{theme.Dim.Render("(leer — neu + geplant ohne Sprint)")}
	}
	lines := make([]string, 0, len(vis))
	for i, it := range vis {
		raw := theme.TypeIcon(it.Type) + " " + theme.Priority(it.Priority) + " " +
			theme.Key.Render(it.Key) + " " + it.Title
		if i == m.blist.cursor {
			plain := truncate(ansi.Strip(raw), w-1)
			if active {
				lines = append(lines, theme.Accent.Render("▌"+plain))
			} else {
				lines = append(lines, theme.Dim.Render("▌"+plain))
			}
		} else {
			lines = append(lines, " "+truncate(raw, w-1))
		}
	}
	return lines
}

// backlogDetail rendert die Detail-Preview des selektierten Issues: detailTitle +
// Meta-Strip + ziffern-Accordion (DD2-50). Spiegelt treeDetail (DD2-74, eine
// Bedienlogik): die Übersicht (Fokus-Index 0) trägt title/type/priority, bei Fokus
// dort bekommt der Titel den D08-Balken; auf Feld-Ebene zeigt ein Feld-Streifen.
func (m model) backlogDetail(it api.Issue, w int) string {
	var b strings.Builder
	kopfActive := m.detailFocus && m.secCursor == 0
	title := detailTitle(it.Key, it.Title, w)
	if kopfActive {
		title = theme.Accent.Render("▌" + truncate(ansi.Strip(title), w-1))
	}
	b.WriteString(title + "\n")
	var tags string
	if len(it.Tags) > 0 {
		names := make([]string, len(it.Tags))
		for i, t := range it.Tags {
			names[i] = t.Name
		}
		tags = strings.Join(names, ",")
	}
	b.WriteString(metaStrip([]metaPair{
		{deref(it.Milestone), "milestone"},
		{deref(it.SprintKey), "sprint"},
		{theme.Priority(it.Priority), "prio"},
		{theme.TypeIcon(it.Type) + " " + theme.TypeStyle(it.Type).Render(it.Type), "type"},
		{tags, "tags"},
	}, statusText(it.Status), w))
	if kopfActive && m.detailLevel == 1 {
		b.WriteString("\n" + fieldStrip(kopfFields(), m.fieldCursor, w))
	}
	b.WriteString("\n\n")
	b.WriteString(theme.Muted.Render("Sections: Ziffer [1..n] öffnet  ∙  enter: bearbeiten") + "\n")
	// Accordion-Fokus nur, wenn der Cursor auf einer Content-Section steht (secCursor
	// ≥ 1); sec = secCursor-1 (Übersicht ist Index 0). Wie treeDetail (DD2-76/77).
	focus := detailFocusView{active: m.detailFocus && m.secCursor >= 1,
		level: m.detailLevel, sec: m.secCursor - 1, field: m.fieldCursor}
	b.WriteString(renderAccordion(m.issueSections(it, w-2), m.accOpen, w, focus))
	return b.String()
}

// viewBacklog rendert das Master-Detail-Backlog: Such-/Filterbox + Liste links,
// Detail-Preview rechts, fokussierter Pane Mauve-umrandet (D03).
func (m model) viewBacklog() string {
	head, localKeys, lw, rw, innerH := m.backlogLayout()
	vis := m.backlogVisible()
	m.blist.setLen(len(vis)) // Cursor an die gefilterte Länge klemmen

	// Linke Pane: Such-/Filterbox als Kopfzeile, darunter die gefensterte Liste.
	searchLine := m.backlogSearchLine(lw - 2)
	listLines := windowAround(m.backlogListLines(vis, lw-2, !m.detailFocus), innerH-1, m.blist.cursor)
	left := append([]string{searchLine}, listLines...)
	for len(left) < innerH {
		left = append(left, "")
	}

	// Rechte Pane: read-only Detail des selektierten Issues.
	var detailStr string
	if it := m.backlogSelected(); it != nil {
		detailStr = m.backlogDetail(*it, rw-2)
	} else {
		detailStr = theme.Dim.Render("(nichts gewählt)")
	}
	detail := strings.Split(detailStr, "\n")
	for i := range detail {
		detail[i] = truncate(detail[i], rw-2)
	}
	if len(detail) > innerH {
		detail = detail[:innerH]
	}
	for len(detail) < innerH {
		detail = append(detail, "")
	}

	// D03: Pane-Border-Tausch — der fokussierte Pane ist Mauve, der andere Overlay.
	leftCol, rightCol := paneBorderColors(m.detailFocus)
	leftBox := lipgloss.NewStyle().Width(lw).
		Border(lipgloss.RoundedBorder()).BorderForeground(leftCol).
		Render(strings.Join(left, "\n"))
	rightBox := lipgloss.NewStyle().Width(rw).
		Border(lipgloss.RoundedBorder()).BorderForeground(rightCol).
		Render(strings.Join(detail, "\n"))
	body := lipgloss.JoinHorizontal(lipgloss.Top, leftBox, rightBox)

	status := m.statusBar("") // Zone 4: Split-Status (Info blau | Fehler rot)
	return head + "\n" + body + "\n" + localKeys + "\n" + status
}

// backlogFilterBox rendert das schwebende Facetten-Menü (Checkboxen je Facette).
func (m model) backlogFilterBox() string {
	var b strings.Builder
	b.WriteString(theme.Muted.Render("space:an/aus  c:leeren  enter/esc:fertig") + "\n")
	lastFacet := ""
	facetHead := map[string]string{"type": "Issue-Type", "status": "Status"}
	for i, it := range m.blfItems {
		if it.facet != lastFacet {
			b.WriteString("\n" + theme.Dim.Render(facetHead[it.facet]) + "\n")
			lastFacet = it.facet
		}
		on := false
		if it.facet == "type" {
			on = m.blfType[it.value]
		} else {
			on = m.blfStatus[it.value]
		}
		box := theme.Dim.Render("[ ]")
		if on {
			box = theme.Accent.Render("[x]")
		}
		cursor := "  "
		label := it.label
		if i == m.blfMenu.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(label)
		}
		b.WriteString(cursor + box + " " + label + "\n")
	}
	return modalPanel("Backlog-Filter", b.String(), "", clampModalWidth(40, m.width), theme.Mauve)
}

// backlogSortBox rendert den Sortier-Picker.
func (m model) backlogSortBox() string {
	opts := backlogSortOpts()
	body := menuList(len(opts), m.blSortMenu.cursor, func(i int, sel bool) string {
		label := opts[i].label
		if opts[i].value == m.blSort {
			label += theme.Dim.Render("  (aktiv)")
		}
		if sel {
			return theme.Header.Render(opts[i].label)
		}
		return label
	})
	return modalPanel("Backlog sortieren", body, "enter: wählen   esc: abbrechen", clampModalWidth(46, m.width), theme.Mauve)
}

// --- Key-Handling ---

// keyBacklog steuert das Master-Detail-Backlog. Routet zuerst aktive Overlays
// (Suche/Filter/Sort), dann Detail-Fokus, dann die Liste.
func (m model) keyBacklog(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.blSearching {
		return m.keyBacklogSearch(msg)
	}
	if m.blFilterOpen {
		return m.keyBacklogFilter(msg)
	}
	if m.blSortOpen {
		return m.keyBacklogSort(msg)
	}
	// Detail-Pane fokussiert: die geteilte Fokus-Maschine (DD2-74 reuse, D01-D05) —
	// Section/Feld-Nav, Ziffer-Sprung, enter öffnet die editField-Form, esc/links raus.
	if m.detailFocus {
		return m.keyDetailFocus(msg)
	}
	k := msg.String()
	m.blist.setLen(len(m.backlogVisible()))
	switch navKey(k) {
	case "up":
		m.blist.move(-1)
		m.secCursor, m.accOpen = 0, 1 // Auswahl gewechselt → Detail-Preview zurücksetzen
		return m, nil
	case "down":
		m.blist.move(1)
		m.secCursor, m.accOpen = 0, 1
		return m, nil
	case "right": // l/→ : in die Detail-Pane (D01)
		if m.backlogSelected() != nil {
			return m.enterDetailFocus()
		}
		return m, nil
	}
	switch k {
	case "enter":
		if m.backlogSelected() != nil {
			return m.enterDetailFocus()
		}
	case "/": // DD2-46 S1: Freitext-Suche
		m.blSearching = true
		m.blSearch.SetValue(m.blQuery)
		m.blSearch.CursorEnd()
		m.blSearch.Focus()
	case "f": // DD2-46 S2: Facetten-Filter
		return m.openBacklogFilter()
	case "s": // DD2-46 S3: Sortier-Picker
		return m.openBacklogSort()
	case "t": // DD2-33: Tag-Picker fürs selektierte Issue
		if it := m.backlogSelected(); it != nil {
			return m.openTagPicker("issue", it.ID, it.Key+" "+it.Title, it.Tags)
		}
	case "b":
		m.view = m.topReturn // zurück zur Quell-View (Tree/Columns, DD2-61)
	case "esc":
		// esc räumt zuerst aktive Suche/Filter ab, sonst zurück zur Quell-View.
		if m.blQuery != "" || m.backlogFilterActive() {
			m.blQuery, m.blfType, m.blfStatus = "", nil, nil
			m.blSearch.SetValue("")
			m.blist.cursor = 0
			return m, nil
		}
		m.view = m.topReturn
	}
	return m, nil
}

// keyBacklogSearch behandelt die aktive Suche: tippen filtert live, enter übernimmt,
// esc bricht ab und löscht.
func (m model) keyBacklogSearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		m.blQuery = strings.TrimSpace(m.blSearch.Value())
		m.blSearching = false
		m.blSearch.Blur()
		m.blist.cursor = 0
		return m, nil
	case tea.KeyEsc:
		m.blSearching = false
		m.blSearch.Blur()
		m.blSearch.SetValue("")
		m.blQuery = ""
		m.blist.cursor = 0
		return m, nil
	}
	var cmd tea.Cmd
	m.blSearch, cmd = m.blSearch.Update(msg)
	m.blQuery = strings.TrimSpace(m.blSearch.Value()) // live-Filter
	m.blist.cursor = 0
	return m, cmd
}

// keyBacklogFilter steuert das Facetten-Menü: space toggelt, c leert, enter/esc schließt.
func (m model) keyBacklogFilter(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.blfMenu.move(-1)
		return m, nil
	case "down":
		m.blfMenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "f", "enter":
		m.blFilterOpen = false
		m.blist.cursor = 0
		return m, nil
	case "c":
		m.blfType, m.blfStatus = nil, nil
		return m, nil
	case " ", "x":
		if m.blfMenu.cursor < 0 || m.blfMenu.cursor >= len(m.blfItems) {
			return m, nil
		}
		it := m.blfItems[m.blfMenu.cursor]
		switch it.facet {
		case "type":
			if m.blfType == nil {
				m.blfType = map[string]bool{}
			}
			if m.blfType[it.value] {
				delete(m.blfType, it.value)
			} else {
				m.blfType[it.value] = true
			}
		case "status":
			if m.blfStatus == nil {
				m.blfStatus = map[string]bool{}
			}
			if m.blfStatus[it.value] {
				delete(m.blfStatus, it.value)
			} else {
				m.blfStatus[it.value] = true
			}
		}
		return m, nil
	}
	return m, nil
}

// keyBacklogSort steuert den Sortier-Picker: i/k navigiert, enter wählt, esc schließt.
func (m model) keyBacklogSort(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	opts := backlogSortOpts()
	switch navKey(msg.String()) {
	case "up":
		m.blSortMenu.move(-1)
		return m, nil
	case "down":
		m.blSortMenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "s":
		m.blSortOpen = false
		return m, nil
	case "enter":
		if m.blSortMenu.cursor >= 0 && m.blSortMenu.cursor < len(opts) {
			m.blSort = opts[m.blSortMenu.cursor].value
		}
		m.blSortOpen = false
		m.blist.cursor = 0
		return m, nil
	}
	return m, nil
}

// Hinweis: Die Detail-Pane im Fokus läuft über die geteilte keyDetailFocus-Maschine
// (detail.go) — Section/Feld-Nav, Ziffer-Sprung, enter→editField, esc/links raus.
// focusedIssue() liefert dort im Backlog-View die Listen-Selektion (DD2-74).
