package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("\n  %s\n\n  q: quit\n", lipgloss.NewStyle().Foreground(theme.Red).Render("Fehler: "+m.err.Error()))
	}
	base := m.viewBase()
	// Command-Center (T16): Formular bzw. Palette schweben zentriert über dem Frame.
	if m.form != nil {
		return placeOverlay(base, m.formBox(), m.termWidth(), m.height)
	}
	if m.paletteOpen {
		return placeOverlay(base, m.paletteBox(), m.termWidth(), m.height)
	}
	if m.msPick {
		return placeOverlay(base, m.milestoneStatusMenu(), m.termWidth(), m.height)
	}
	if m.sprintPick { // T05: view-übergreifend (Cockpit + Ranger-Columns)
		return placeOverlay(base, m.sprintStatusMenu(), m.termWidth(), m.height)
	}
	if m.smPick { // T03 Flow A: Sprint→Meilenstein-Picker
		return placeOverlay(base, m.sprintMilestoneMenu(), m.termWidth(), m.height)
	}
	if m.maPick { // T03 Flow B: Meilenstein→Sprints-Checkliste
		return placeOverlay(base, m.milestoneAssignMenu(), m.termWidth(), m.height)
	}
	if m.delConfirm { // T02b: Cascade-Delete-Confirm
		return placeOverlay(base, m.deleteBox(), m.termWidth(), m.height)
	}
	return base
}

// milestoneStatusMenu: schwebendes Meilenstein-Status-Menü (Taste S, T01).
func (m model) milestoneStatusMenu() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Meilenstein-Status setzen") + "\n")
	cur := ""
	if ms := m.selMilestone(); ms != nil {
		cur = ms.Status
	}
	b.WriteString(theme.Dim.Render("aktuell: "+cur) + "\n\n")
	for i, s := range m.msopts {
		cursor := "  "
		label := statusText(s)
		if s == "completed" {
			label = statusText(s) + theme.Dim.Render(" (alle Sprints müssen terminal sein)")
		}
		if i == m.msmenu.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(s)
			if s == "completed" {
				label = theme.Header.Render(s) + theme.Dim.Render(" (alle Sprints müssen terminal sein)")
			}
		}
		b.WriteString(cursor + label + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("enter: setzen   esc: abbrechen"))
	return lipgloss.NewStyle().
		Width(46).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}

func (m model) viewBase() string {
	switch m.view {
	case viewPicker:
		return m.viewPicker()
	case viewBacklog:
		return m.viewBacklog()
	case viewDetail:
		return m.viewDetail()
	case viewMilestone:
		return m.viewMilestone()
	case viewSprint:
		return m.viewSprint()
	case viewReview:
		return m.viewReview()
	case viewReviewsList:
		return m.viewReviewsList()
	case viewMemory:
		return m.viewMemory()
	default:
		return m.viewColumns() // rendert Filter-Modal inline, wenn m.filtering
	}
}

// --- Reviews-Page (T17): Liste offener Review-Sprints ---

func (m model) viewReviewsList() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Offene Reviews") +
		theme.Dim.Render("   (Sprints im Status review)") + "\n\n")
	if len(m.reviewSprints) == 0 {
		b.WriteString(theme.Dim.Render("(keine Sprints im Review — S im Cockpit setzt active→review)") + "\n")
	}
	for i, s := range m.reviewSprints {
		cursor := "  "
		if i == m.rvlist.cursor {
			cursor = theme.Accent.Render("▸ ")
		}
		ms := ""
		if s.MilestoneName != nil && *s.MilestoneName != "" {
			ms = theme.Dim.Render("  — " + truncate(*s.MilestoneName, 24))
		}
		b.WriteString(cursor + fmt.Sprintf("%-9s %-30s %s%s",
			s.Key, truncate(s.Name, 30), statusText(s.Status),
			theme.Dim.Render(fmt.Sprintf("  %d/%d", s.DoneCount, s.ItemCount))) + ms + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("j/k:↑↓  enter:Cockpit  esc/q:zurück") + "\n")
	return "\n" + boxed(b.String(), m.termWidth(), theme.Mauve)
}

// --- Header / Footer ---

func (m model) header() string {
	name := "—"
	if m.project != nil {
		name = fmt.Sprintf("%s (%s)", m.project.Slug, m.project.Prefix)
	}
	left := theme.Header.Render("dd · " + name)
	right := theme.Dim.Render("ctrl+k:Cmd  [p]rojekt  [b]acklog  [f]ilter  [y]ank  [q]uit")
	w := m.termWidth()
	gap := w - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	return left + strings.Repeat(" ", gap) + right
}

func (m model) footer() string {
	hint := "j/k:↑↓  l/→/tab:rein  h/←:raus  enter:Detail  S:M-Status  s:S-Status  d:löschen  f:Filter  y:Yank  b:Backlog  R:Reviews  q:quit"
	if m.status != "" {
		hint = m.status
	}
	return theme.Dim.Render(hint)
}

func (m model) termWidth() int {
	if m.width < 30 {
		return 100
	}
	return m.width
}

func (m model) bodyHeight() int {
	h := m.height - 4
	if h < 6 {
		return 18
	}
	return h
}

// --- Picker ---

func (m model) viewPicker() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Projekt wählen") + "\n\n")
	for i, p := range m.projects {
		cursor := "  "
		line := fmt.Sprintf("%-10s %-26s %d Sprints · %d Backlog", p.Prefix, p.Name, p.SprintCount, p.BacklogCount)
		if i == m.plist.cursor {
			cursor = theme.Accent.Render("▸ ")
			line = theme.Header.Render(line)
		}
		b.WriteString(cursor + line + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("j/k:↑↓  enter:wählen  q:quit"))
	return "\n" + boxed(b.String(), m.termWidth(), theme.Mauve)
}

// --- Miller-Columns ---

type pane struct {
	title  string
	rows   []string
	cursor int
	isList bool
}

func (m model) viewColumns() string {
	all := []pane{
		{title: "Meilensteine", rows: m.msRows(), cursor: m.mlist.cursor, isList: true},
		{title: m.ctxTitle("Sprints", m.selMilestone() != nil, msName(m.selMilestone())), rows: m.spRows(), cursor: m.slist.cursor, isList: true},
		{title: m.ctxTitle("Issues", m.selSprint() != nil, spKey(m.selSprint())), rows: m.isRows(), cursor: m.ilist.cursor, isList: true},
		{title: "Vorschau", rows: m.detailRows(), isList: false},
	}
	start := m.depth
	end := start + 3
	if end > len(all) {
		end = len(all)
	}
	visible := all[start:end]
	n := len(visible)

	h := m.bodyHeight()
	w := m.termWidth()
	colW := (w - n*2) / n // Border frisst 2 Spalten je Pane
	if colW < 12 {
		colW = 20
	}

	cols := make([]string, n)
	for i, p := range visible {
		focused := (start + i) == m.depth
		cols[i] = renderPane(p, colW, h, focused)
	}
	body := lipgloss.JoinHorizontal(lipgloss.Top, cols...)
	frame := m.header() + "\n" + body + "\n" + m.footer()

	// Filter-Modal schwebt zentriert über dem Frame (Liste bleibt darunter sichtbar).
	if m.filtering {
		return placeOverlay(frame, m.filterBox(), w, m.height)
	}
	return frame
}

func renderPane(p pane, w, h int, focused bool) string {
	titleStyle := theme.Dim
	if focused {
		titleStyle = theme.Header
	}
	var b strings.Builder
	b.WriteString(titleStyle.Render(truncate(p.title, w)) + "\n")
	b.WriteString(theme.Dim.Render(strings.Repeat("─", min(w, lipgloss.Width(p.title)+2))) + "\n")
	max := h - 2 // Titel + Trennlinie
	for i := 0; i < max && i < len(p.rows); i++ {
		row := truncate(p.rows[i], w-2)
		if p.isList && i == p.cursor && focused {
			row = theme.Accent.Render("▸ ") + row
		} else if p.isList {
			row = "  " + row
		}
		b.WriteString(row + "\n")
	}
	border := lipgloss.RoundedBorder()
	col := theme.Overlay
	if focused {
		col = theme.Mauve
	}
	return lipgloss.NewStyle().
		Width(w).Height(h).
		Border(border).BorderForeground(col).
		Render(b.String())
}

func (m model) msRows() []string {
	ms := m.visMilestonesRaw()
	rows := make([]string, len(ms))
	for i, x := range ms {
		def := ""
		if x.Deferred == 1 {
			def = theme.Dim.Render(" ⏸")
		}
		rows[i] = fmt.Sprintf("%s %s  %s%s", statusDot(x.Status), x.Name,
			theme.Dim.Render(fmt.Sprintf("%d/%d", x.Done, x.Total)), def)
	}
	if len(rows) == 0 {
		return []string{theme.Dim.Render("(keine — f für Filter)")}
	}
	return rows
}

func (m model) spRows() []string {
	sp := m.visSprints()
	rows := make([]string, len(sp))
	for i, s := range sp {
		rows[i] = fmt.Sprintf("%-8s %s  %s", s.Key, statusText(s.Status),
			theme.Dim.Render(fmt.Sprintf("%d/%d", s.DoneCount, s.ItemCount)))
	}
	if len(rows) == 0 && m.selMilestone() != nil {
		return []string{theme.Dim.Render("(keine Sprints)")}
	}
	return rows
}

func (m model) isRows() []string {
	if m.selSprint() != nil && m.curSprint == nil {
		return []string{theme.Dim.Render("(lädt …)")}
	}
	is := m.visIssues()
	rows := make([]string, len(is))
	for i, it := range is {
		rows[i] = fmt.Sprintf("%s %s %-9s %s", theme.TypeIcon(it.Type), theme.Priority(it.Priority), it.Key, it.Title)
	}
	if len(rows) == 0 && m.selSprint() != nil {
		return []string{theme.Dim.Render("(keine Issues)")}
	}
	return rows
}

// detailRows ist die schmale Vorschau-Spalte (4. Pane).
func (m model) detailRows() []string {
	it := m.selIssue()
	if it == nil {
		return []string{theme.Dim.Render("(Issue wählen →)")}
	}
	rows := []string{
		theme.Key.Render(it.Key),
		fmt.Sprintf("%s %s · %s", theme.TypeIcon(it.Type), theme.TypeStyle(it.Type).Render(it.Type), theme.Priority(it.Priority)),
		theme.StatusStyle(it.Status).Render(it.Status),
		"",
	}
	if g := deref(it.Goal); g != "" {
		rows = append(rows, theme.Dim.Render("Goal:"), g)
	}
	rows = append(rows, "", theme.Dim.Render("enter: Issue Details"))
	return rows
}

// --- Meilenstein-Detail (#1) ---

func (m model) viewMilestone() string {
	ms := m.selMilestone()
	if ms == nil {
		return "\n  (kein Meilenstein)\n"
	}
	var b strings.Builder
	b.WriteString(theme.Header.Render("Meilenstein") + "\n\n")
	b.WriteString(theme.Header.Render(ms.Name) + "\n")
	meta := fmt.Sprintf("Status: %s   Fortschritt: %d/%d", statusText(ms.Status), ms.Done, ms.Total)
	if d := deref(ms.TargetDate); d != "" {
		meta += "   Ziel: " + d
	}
	if ms.Deferred == 1 {
		meta += "   " + theme.Dim.Render("⏸ zurückgestellt")
	}
	b.WriteString(meta + "\n")
	if d := deref(ms.Description); d != "" {
		b.WriteString("\n" + theme.Dim.Render("Beschreibung:") + "\n" + d + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render(fmt.Sprintf("Sprints (%d):", len(ms.Sprints))) + "\n")
	for _, s := range ms.Sprints {
		goal := ""
		if g := deref(s.Goal); g != "" {
			goal = "  " + theme.Dim.Render("— "+truncate(g, 50))
		}
		b.WriteString(fmt.Sprintf("  %-8s %s  %s%s\n", s.Key, statusText(s.Status), truncate(s.Name, 30), goal))
	}
	b.WriteString("\n" + theme.Dim.Render("S: Status   a: Sprints zuweisen   y: kopieren   esc/q: zurück") + "\n")
	return boxed(b.String(), m.termWidth(), theme.Mauve)
}

// --- Sprint-Detail ---

func (m model) viewSprint() string {
	s := m.selSprint()
	if s == nil {
		return "\n  (kein Sprint)\n"
	}
	// Items aus curSprint (geladen), sonst Embedded.
	items := s.Items
	if m.curSprint != nil && m.curSprint.ID == s.ID {
		items = m.curSprint.Items
	}
	var b strings.Builder
	b.WriteString(theme.Header.Render("Sprint "+s.Key) + "  " + statusText(s.Status) + "\n")
	b.WriteString(theme.Header.Render(s.Name) + "\n")
	if g := deref(s.Goal); g != "" {
		b.WriteString("\n" + theme.Accent.Render("Goal:") + "\n" + g + "\n")
	}
	if s.MilestoneName != nil && *s.MilestoneName != "" {
		b.WriteString(theme.Dim.Render("Meilenstein: "+*s.MilestoneName) + "\n")
	}
	b.WriteString(theme.Dim.Render(fmt.Sprintf("Fortschritt: %d/%d", s.DoneCount, s.ItemCount)) + "\n")

	b.WriteString("\n" + theme.Dim.Render(fmt.Sprintf("Issues (%d):", len(items))) + "\n")
	b.WriteString(issueColHeader(40) + "\n")
	for _, it := range items {
		b.WriteString(fmt.Sprintf("  %s %s %-9s %-40s %-12s %-16s %s\n",
			theme.TypeIcon(it.Type), theme.Priority(it.Priority), it.Key,
			truncate(it.Title, 40), statusText(it.Status), reviewBadge(it), resultDot(it)))
	}
	if len(items) > 0 {
		old := m.curSprint
		m.curSprint = &api.Sprint{ID: s.ID, Items: items}
		b.WriteString("\n" + m.reviewSummary() + "\n")
		m.curSprint = old
	}
	b.WriteString("\n" + theme.Dim.Render("R: Review-Cockpit   m: Meilenstein   y: Issues kopieren   esc/q: zurück"))
	return "\n" + boxed(b.String(), m.termWidth(), theme.Mauve)
}

// --- Issue-Detail (#5 Rahmen, #6 alle Felder, #9 Titel) ---

func (m model) viewDetail() string {
	it := m.selIssue()
	if it == nil {
		return "\n  (kein Issue)\n"
	}
	var b strings.Builder
	b.WriteString(theme.Header.Render("Issue Details") + "\n\n")
	b.WriteString(theme.StatusStyle(it.Status).Render(it.Status) + "  " +
		theme.Key.Render(it.Key) + "  " + theme.TypeIcon(it.Type) + " " +
		theme.TypeStyle(it.Type).Render(it.Type) + "  " + theme.Priority(it.Priority) + "\n")
	b.WriteString(theme.Header.Render(it.Title) + "\n")

	meta := []string{}
	if s := deref(it.Milestone); s != "" {
		meta = append(meta, "Meilenstein: "+s)
	}
	if s := deref(it.SprintKey); s != "" {
		meta = append(meta, "Sprint: "+s)
	}
	if len(it.Tags) > 0 {
		names := make([]string, len(it.Tags))
		for i, t := range it.Tags {
			names[i] = t.Name
		}
		meta = append(meta, "Tags: "+strings.Join(names, ", "))
	}
	if len(meta) > 0 {
		b.WriteString(theme.Dim.Render(strings.Join(meta, "   ")) + "\n")
	}

	field := func(label, val string) {
		if strings.TrimSpace(val) == "" {
			return
		}
		b.WriteString("\n" + theme.Accent.Render(label+":") + "\n" + val + "\n")
	}
	field("Goal", deref(it.Goal))
	field("Background", deref(it.Background))
	field("Beschreibung", deref(it.Description))
	field("Context Notes", deref(it.ContextNotes))
	field("Relevant Files", deref(it.RelevantFiles))
	field("PO Notes", deref(it.PoNotes))
	field("Result", deref(it.Result))
	if rs := deref(it.ReviewStatus); rs != "" {
		field("Review", rs+"  "+deref(it.ReviewComment))
	}

	stamp := []string{}
	if s := deref(it.CreatedAt); s != "" {
		stamp = append(stamp, "erstellt "+s)
	}
	if s := deref(it.RefinedAt); s != "" {
		stamp = append(stamp, "refined "+s)
	}
	if len(stamp) > 0 {
		b.WriteString("\n" + theme.Dim.Render(strings.Join(stamp, " · ")) + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("esc/q: zurück") + "\n")
	return boxed(b.String(), m.termWidth(), theme.Mauve)
}

// --- Backlog (#2 Rahmen) ---

func (m model) viewBacklog() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Backlog") + theme.Dim.Render("   (neu + geplant ohne Sprint)") + "\n\n")
	if len(m.backlog) == 0 {
		b.WriteString(theme.Dim.Render("(leer)") + "\n")
	}
	for i, it := range m.backlog {
		cursor := "  "
		if i == m.blist.cursor {
			cursor = theme.Accent.Render("▸ ")
		}
		b.WriteString(cursor + fmt.Sprintf("%s %s %-9s %-46s %s",
			theme.TypeIcon(it.Type), theme.Priority(it.Priority), it.Key,
			truncate(it.Title, 46), statusText(it.Status)) + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("j/k:↑↓  b/esc:zurück  q:quit") + "\n")
	return boxed(b.String(), m.termWidth(), theme.Mauve)
}

// --- Review-Cockpit ---

func (m model) viewReview() string {
	var b strings.Builder
	title := "Review"
	if m.curSprint != nil {
		title = "Review " + m.curSprint.Key + " — " + m.curSprint.Name +
			"  " + statusText(m.curSprint.Status)
	}
	b.WriteString(theme.Header.Render(title) + "\n\n")
	if m.curSprint == nil {
		b.WriteString(theme.Dim.Render("(lädt …)") + "\n")
		return "\n" + boxed(b.String(), m.termWidth(), theme.Mauve)
	}
	b.WriteString(issueColHeader(38) + "\n")
	for i, it := range m.curSprint.Items {
		cursor := "  "
		if i == m.rlist.cursor {
			cursor = theme.Accent.Render("▸ ")
		}
		b.WriteString(cursor + fmt.Sprintf("%s %s %-9s %-38s %-12s %-16s %s",
			theme.TypeIcon(it.Type), theme.Priority(it.Priority), it.Key,
			truncate(it.Title, 38), statusText(it.Status), reviewBadge(it), resultDot(it)) + "\n")
	}
	// Review-Ergebnisse (Runden-Übersicht) unten.
	b.WriteString("\n" + m.reviewSummary() + "\n")

	if it := m.reviewItem(); it != nil {
		b.WriteString("\n" + theme.Header.Render(truncate(it.Key+" — "+it.Title, m.termWidth()-6)) + "\n")
		if g := deref(it.Goal); g != "" {
			b.WriteString(theme.Dim.Render("Goal: "+truncate(g, maxInt(20, m.termWidth()-16))) + "\n")
		}
		if c := deref(it.ReviewComment); c != "" {
			b.WriteString(theme.Dim.Render("Review: "+truncate(c, maxInt(20, m.termWidth()-16))) + "\n")
		}
	}
	b.WriteString("\n")
	if m.inputting {
		b.WriteString(theme.Key.Render(m.status) + m.input + "▏\n")
	} else {
		// Shortcuts IMMER sichtbar (Anfänger), Hinweis separat darunter.
		b.WriteString(theme.Dim.Render(m.reviewHints()) + "\n")
		if m.status != "" {
			b.WriteString(m.status + "\n") // bereits gefärbt (Sapphire)
		}
	}
	base := "\n" + boxed(b.String(), m.termWidth(), theme.Mauve)
	if m.statusPick {
		return placeOverlay(base, m.statusMenu(), m.termWidth(), m.height)
	}
	// sprintPick-Overlay liegt jetzt im View()-Wrapper (T05, view-übergreifend).
	if m.usOpen {
		return placeOverlay(base, m.userStoryModal(), m.termWidth(), m.height)
	}
	return base
}

// issueColHeader liefert die Spalten-Überschrift (macht Status vs. Review-Verdikt
// klar unterscheidbar). titleW = Breite der Titel-Spalte. Letzte Spalte
// "Ergebnisse" = result-Indikator (I01, Gate für Sprint-Abschluss).
func issueColHeader(titleW int) string {
	return theme.Dim.Render(fmt.Sprintf("  %-5s%-10s%-*s %-12s %-16s %s",
		"Typ", "Kennung", titleW, "Titel", "Status", "Review-Verdikt", "Ergebnisse"))
}

// resultDot zeigt, ob das result-Feld gepflegt ist (grün) oder fehlt (rot).
// Fehlendes result blockt den Sprint-Abschluss (Backend-Gate), I01.
func resultDot(it api.Issue) string {
	if strings.TrimSpace(deref(it.Result)) != "" {
		return lipgloss.NewStyle().Foreground(theme.Green).Render("●")
	}
	return lipgloss.NewStyle().Foreground(theme.Red).Render("●")
}

// sprintStatusMenu: schwebendes Sprint-Status-Menü (Taste S), zeigt gültige Transitions.
func (m model) sprintStatusMenu() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Sprint-Status setzen") + "\n")
	b.WriteString(theme.Dim.Render("aktuell: "+m.spCurStatus) + "\n\n")
	for i, s := range m.spopts {
		cursor := "  "
		label := statusText(s)
		if s == "completed" {
			label = statusText(s) + theme.Dim.Render(" (prüft passed-Reviews)")
		}
		if i == m.spmenu.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(s)
			if s == "completed" {
				label = theme.Header.Render(s) + theme.Dim.Render(" (prüft passed-Reviews)")
			}
		}
		b.WriteString(cursor + label + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("enter: setzen   esc: abbrechen"))
	return lipgloss.NewStyle().
		Width(40).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}

// reviewBadge zeigt das Review-Verdikt (review_feedback) je Issue — sichtbar
// macht, was den Sprint-Abschluss blockiert (Gate prüft review_feedback).
func reviewBadge(it api.Issue) string {
	rs := deref(it.ReviewStatus)
	switch rs {
	case "passed":
		return lipgloss.NewStyle().Foreground(theme.Green).Render("✓ passed")
	case "not_passed":
		return lipgloss.NewStyle().Foreground(theme.Red).Render("✗ not_passed")
	default:
		return theme.Dim.Render("· kein Verdikt")
	}
}

// reviewSummary fasst die Review-Runden zusammen (für Sprint-Abschluss-Readiness).
func (m model) reviewSummary() string {
	if m.curSprint == nil {
		return ""
	}
	var passed, rejected, pending int
	for _, it := range m.curSprint.Items {
		if it.Status == "cancelled" {
			continue
		}
		switch deref(it.ReviewStatus) {
		case "passed":
			passed++
		case "not_passed":
			rejected++
		default:
			pending++
		}
	}
	parts := []string{
		lipgloss.NewStyle().Foreground(theme.Green).Render(fmt.Sprintf("✓ %d passed", passed)),
		lipgloss.NewStyle().Foreground(theme.Red).Render(fmt.Sprintf("✗ %d not_passed", rejected)),
		theme.Dim.Render(fmt.Sprintf("· %d offen", pending)),
	}
	head := theme.Dim.Render("Review-Runden: ")
	if pending == 0 && rejected == 0 && passed > 0 {
		head = lipgloss.NewStyle().Foreground(theme.Green).Render("Abschluss-bereit: ")
	}
	return head + strings.Join(parts, "  ")
}

// userStoryModal: schwebendes Abnahme-Modal (goal/background + US-Verdikte).
func (m model) userStoryModal() string {
	var b strings.Builder
	it := m.reviewItem()
	title := "Issue-Abnahme"
	if it != nil {
		title = it.Key + " — " + it.Title
	}
	b.WriteString(theme.Header.Render(truncate(title, 56)) + "\n\n")
	if it != nil {
		if g := deref(it.Goal); g != "" {
			b.WriteString(theme.Accent.Render("Goal: ") + truncate(g, 56) + "\n")
		}
		if bg := deref(it.Background); bg != "" {
			b.WriteString(theme.Accent.Render("Background: ") + truncate(bg, 56) + "\n")
		}
	}
	b.WriteString("\n" + theme.Dim.Render(fmt.Sprintf("User-Stories (%d):", len(m.usList))) + "\n")
	if len(m.usList) == 0 {
		b.WriteString(theme.Dim.Render("(keine — lädt oder keine vorhanden)") + "\n")
	}
	for i, us := range m.usList {
		cursor := "  "
		t := us.Title
		if i == m.uslist.cursor {
			cursor = theme.Accent.Render("▸ ")
			t = theme.Header.Render(t)
		}
		b.WriteString(cursor + usVerdictBox(us.Verdict) + " " + truncate(t, 50) + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("a:accept  r:reject  o:open  j/k:↑↓  enter/esc:schließen"))
	return lipgloss.NewStyle().
		Width(64).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}

func usVerdictBox(v string) string {
	switch v {
	case "accepted":
		return lipgloss.NewStyle().Foreground(theme.Green).Render("[✓]")
	case "rejected":
		return lipgloss.NewStyle().Foreground(theme.Red).Render("[✗]")
	default:
		return theme.Dim.Render("[ ]")
	}
}

// reviewHints zeigt nur die im aktuellen Zustand gültigen Aktionen.
func (m model) reviewHints() string {
	hints := []string{"j/k:↑↓", "enter:Abnahme", "s:Status", "r:Ergebnis", "a:pass", "x:reject"}
	if it := m.reviewItem(); it != nil {
		if it.Status == "to_review" {
			hints = append(hints, "o:reopen")
		} else {
			hints = append(hints, "w:Rework→to_review")
		}
	}
	if m.curSprint != nil {
		hints = append(hints, "S:Sprint-Status")
		if m.curSprint.Status == "review" {
			hints = append(hints, "C:abschließen(PO)")
		}
	}
	hints = append(hints, "q:zurück")
	return strings.Join(hints, "  ")
}

// statusMenu ist das schwebende Issue-Status-Menü (Taste s).
func (m model) statusMenu() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Status setzen") + "\n")
	cur := ""
	if it := m.reviewItem(); it != nil {
		cur = it.Status
	}
	b.WriteString(theme.Dim.Render("aktuell: "+cur) + "\n\n")
	for i, s := range m.sopts {
		cursor := "  "
		label := statusText(s)
		if i == m.smenu.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(s)
		}
		mark := "  "
		if s == cur {
			mark = theme.Dim.Render("• ")
		}
		b.WriteString(cursor + mark + label + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("enter: setzen   esc: abbrechen"))
	return lipgloss.NewStyle().
		Width(30).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}

// noticeText färbt einen transienten Hinweis in Sapphire (gültige Aktionen/Fehler).
func noticeText(s string) string {
	return lipgloss.NewStyle().Foreground(theme.Sapphire).Render(s)
}

// --- Filter-Modal (#4/#8) ---

// filterBox rendert das schwebende Filter-Modal (kompakt, wird zentriert overlaid).
func (m model) filterBox() string {
	col := []string{"Meilensteine", "Sprints", "Issues"}[clampInt(m.ftarget, 0, 2)]
	var b strings.Builder
	b.WriteString(theme.Header.Render("Filter · "+col) + "\n")
	b.WriteString(theme.Dim.Render("space: an/aus   enter/esc: schließen") + "\n\n")
	if len(m.fopts) == 0 {
		b.WriteString(theme.Dim.Render("(keine Werte)") + "\n")
	}
	fs := m.filterFor(m.ftarget)
	for i, o := range m.fopts {
		box := theme.Dim.Render("[ ]")
		if fs.shown(o.value) {
			box = theme.Accent.Render("[x]")
		}
		cursor := "  "
		label := o.label
		if i == m.fcur.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(label)
		}
		b.WriteString(cursor + box + " " + label + "\n")
	}
	return lipgloss.NewStyle().
		Width(38).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).
		Padding(0, 1).
		Render(b.String())
}

// --- Helfer ---

func boxed(s string, w int, border lipgloss.Color) string {
	if w > 8 {
		w = w - 2
	}
	return lipgloss.NewStyle().
		Width(w).
		Border(lipgloss.RoundedBorder()).BorderForeground(border).
		Padding(0, 1).
		Render(s)
}

func (m model) ctxTitle(base string, ok bool, ctx string) string {
	if ok && ctx != "" {
		return base + " · " + ctx
	}
	return base
}

func msName(ms *api.Milestone) string {
	if ms == nil {
		return ""
	}
	return ms.Name
}

func spKey(s *api.Sprint) string {
	if s == nil {
		return ""
	}
	return s.Key
}

func statusDot(status string) string {
	switch status {
	case "active":
		return theme.StatusStyle(status).Render("●")
	case "completed", "closed":
		return theme.StatusStyle(status).Render("○")
	case "cancelled":
		return theme.StatusStyle(status).Render("✗")
	default:
		return theme.StatusStyle(status).Render("◌")
	}
}

func statusText(status string) string {
	return theme.StatusStyle(status).Render(status)
}

// truncate kürzt ANSI-sicher auf w Zellen (schneidet nie Escape-Sequenzen) —
// kritisch, da Zeilen gefärbt sind; Rune-Slicing würde Sequenzen zerstören.
func truncate(s string, w int) string {
	if w < 1 {
		return ""
	}
	return ansi.Truncate(s, w, "…")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
