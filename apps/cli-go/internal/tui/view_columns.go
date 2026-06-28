package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

func (m model) viewPicker() string {
	// Suchfeld — TextStyle rot wenn Filter aktiv (DD2-41)
	ti := m.projectSearch
	if m.projectQuery != "" {
		ti.TextStyle = lipgloss.NewStyle().Foreground(theme.Red)
	} else {
		ti.TextStyle = lipgloss.NewStyle().Foreground(theme.Text)
	}
	searchLine := lipgloss.NewStyle().Foreground(theme.Hint).Render("[switch] Project  ") + ti.View()

	// Gefilterte Projektliste
	filtered := m.filteredProjects()
	var b strings.Builder
	b.WriteString(searchLine + "\n\n")
	for i, p := range filtered {
		cursor := "  "
		name := lipgloss.NewStyle().Foreground(theme.Text).Render(p.Name)
		hint := lipgloss.NewStyle().Foreground(theme.Hint).Render(fmt.Sprintf("(%s | %s)", p.Prefix, p.Slug))
		if i == m.plist.cursor {
			cursor = theme.Accent.Render("▸ ")
			name = theme.Header.Render(p.Name)
		}
		b.WriteString(cursor + name + "  " + hint + "\n")
	}
	if len(filtered) == 0 && len(m.projects) > 0 {
		b.WriteString(lipgloss.NewStyle().Foreground(theme.Hint).Render("  (keine Treffer)") + "\n")
	}
	return m.framed("[switch] Project", b.String(), "↑↓:navigieren  enter:wählen  esc:schließen  tippen:filtern")
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

	// DD2-73: Footer kann mehrzeilig sein (umgebrochener Hint) — seine Höhe von der
	// Pane-Innenhöhe abziehen, damit der Frame nie über das Terminal hinauswächst.
	foot := m.footer()
	h := m.bodyHeight() - (lipgloss.Height(foot) - 1)
	if h < 5 {
		h = 5
	}
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
	frame := m.header() + "\n" + body + "\n" + foot

	// Filter-Modal schwebt zentriert über dem Frame (Liste bleibt darunter sichtbar).
	if m.filtering {
		return placeOverlay(frame, m.filterBox(), w, m.height)
	}
	return frame
}

// renderPane rendert eine bordered Pane. DD2-54 / Golden Rule #1: KEIN Height()
// auf dem bordered Style — stattdessen den Content auf die Innenhöhe (h Zeilen)
// auffüllen und den Border natürlich darum wachsen lassen (Gesamthöhe h+2). So
// kippt die Ausrichtung nicht, falls eine künftige Zeile nicht truncatet wird:
// die Zeilenzahl ist explizit gedeckelt, nicht von Height() abhängig.
func renderPane(p pane, w, h int, focused bool) string {
	titleStyle := theme.Dim
	if focused {
		titleStyle = theme.Header
	}
	lines := make([]string, 0, h)
	lines = append(lines, titleStyle.Render(truncate(p.title, w)))
	lines = append(lines, theme.Dim.Render(strings.Repeat("─", min(w, lipgloss.Width(p.title)+2))))
	for i := 0; i < len(p.rows) && len(lines) < h; i++ { // max h Zeilen inkl. Titel+Trennlinie
		row := truncate(p.rows[i], w-2)
		if p.isList && i == p.cursor && focused {
			row = theme.Accent.Render("▸ ") + row
		} else if p.isList {
			row = "  " + row
		}
		lines = append(lines, row)
	}
	for len(lines) < h { // auf Innenhöhe auffüllen statt Height() zu erzwingen
		lines = append(lines, "")
	}
	border := lipgloss.RoundedBorder()
	col := theme.Overlay
	if focused {
		col = theme.Mauve
	}
	return lipgloss.NewStyle().
		Width(w).
		Border(border).BorderForeground(col).
		Render(strings.Join(lines, "\n"))
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
		fmt.Sprintf("%s %s ∙ %s", theme.TypeIcon(it.Type), theme.TypeStyle(it.Type).Render(it.Type), theme.Priority(it.Priority)),
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
	b.WriteString(theme.Header.Render(ms.Name) + "\n")
	status := statusText(ms.Status)
	if ms.Deferred == 1 {
		status += " " + theme.Dim.Render("⏸ zurückgestellt")
	}
	slots := []hslot{
		{"Status", status},
		{"Fortschritt", fmt.Sprintf("%d/%d", ms.Done, ms.Total)},
		{"Ziel", deref(ms.TargetDate)},
	}
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
	return m.chrome("Meilenstein", slots, b.String(),
		"S: Status   a: Sprints zuweisen   y: kopieren   i/k: scrollen   esc/q: zurück")
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
	slots := []hslot{
		{"Status", statusText(s.Status)},
		{"Meilenstein", sprintMilestoneName(s, m.selMilestone())},
		{"Fortschritt", fmt.Sprintf("%d/%d", s.DoneCount, s.ItemCount)},
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
		"R: Review-Cockpit   m: Meilenstein   y: kopieren   i/k: scrollen   esc/q: zurück")
}

// --- Issue-Detail (#5 Rahmen, #6 alle Felder, #9 Titel) ---

// issueFields rendert die vollen, untruncated Issue-Felder (Goal, Background,
// …, Result, Review) plus User-Stories+QA als scrollbaren Detail-Block. Single
// Source für viewDetail (Tree/Columns) UND das Review-Cockpit (DD2-67) — eine
// Kopie, kann nicht driften (Fix-in-Root). chrome() bricht den Block um.
func issueFields(it *api.Issue) string {
	var b strings.Builder
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

	// DD2-30: User-Stories (Prüfgrundlage) inkl. Verdikt + QA im Detail anzeigen.
	if len(it.UserStories) > 0 {
		b.WriteString("\n" + theme.Accent.Render(fmt.Sprintf("User-Stories (%d):", len(it.UserStories))) + "\n")
		for _, us := range it.UserStories {
			b.WriteString("  " + usVerdictBox(us.Verdict) + " " + us.Title + "\n")
			if qa := deref(us.QA); qa != "" {
				b.WriteString(theme.Dim.Render("      QA: "+qa) + "\n")
			}
		}
	}
	return b.String()
}

func (m model) viewDetail() string {
	it := m.selIssue()
	if it == nil {
		return "\n  (kein Issue)\n"
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
		{"Typ", theme.TypeIcon(it.Type) + " " + theme.TypeStyle(it.Type).Render(it.Type)},
		{"Prio", theme.Priority(it.Priority)},
		{"Meilenstein", deref(it.Milestone)},
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
		"s: Status   i/k: scrollen   g/G: Anfang/Ende   esc/q: zurück")
}

// --- Backlog (#2 Rahmen) ---

func (m model) viewBacklog() string {
	var b strings.Builder
	b.WriteString(theme.Dim.Render("(neu + geplant ohne Sprint)") + "\n\n")
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
	return m.framed("Backlog", b.String(), "i/k:↑↓  b/esc:zurück  q:quit")
}

// --- Review-Cockpit ---

// viewReview ist das Review-Cockpit als echtes Master-Detail (DD2-67): links die
// Issue-Liste (Master), rechts die VOLLEN Felder des selektierten Issues (Detail),
// horizontal nebeneinander. Der Detail-Inhalt wird auf die Pane-Innenbreite
// umgebrochen (vollständig lesbar, kein horizontales Truncaten) und ist via
// m.scroll fensterbar. Kopf: globaler Header + Sprint-Titel + Review-Summary
// (★ DD2-70 Abschluss-Bereitschaft); Footer: reviewHints + Status.
func (m model) viewReview() string {
	if m.curSprint == nil {
		return m.framed("Review", theme.Dim.Render("(lädt …)"), "esc/q: zurück")
	}
	s := m.curSprint
	w := m.termWidth()

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("Review "+s.Key)) +
		theme.Dim.Render(fmt.Sprintf("   %s · %d/%d", statusText(s.Status), s.DoneCount, s.ItemCount))
	summary := m.reviewSummary()
	foot := theme.Muted.Render(wrapText(m.reviewHints(), w))
	statusLine := m.statusBar("")
	if m.inputting { // Reject-Kommentar-Eingabe ersetzt die Status-Zeile
		statusLine = theme.Key.Render(m.status) + m.input + "▏"
	}

	// Pane-Innenhöhe = Gesamthöhe minus Kopf/Summary/Footer/Status (+ 3 Trennzeilen).
	chromeH := lipgloss.Height(head) + lipgloss.Height(summary) +
		lipgloss.Height(foot) + lipgloss.Height(statusLine) + 3
	h := m.height - chromeH
	if h < 6 {
		h = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}

	// Master schmaler, Detail breiter; Border frisst je 2 Spalten (Golden Rule #1/#4).
	leftW := w*42/100 - 2
	if leftW < 24 {
		leftW = 24
	}
	rightW := w - leftW - 4
	if rightW < 24 {
		rightW = 24
	}

	listP := pane{
		title:  fmt.Sprintf("Issues (%d)", len(s.Items)),
		rows:   m.reviewRows(),
		cursor: m.rlist.cursor,
		isList: true,
	}

	detTitle := "Detail"
	detRows := []string{theme.Dim.Render("(kein Issue gewählt)")}
	if it := m.reviewItem(); it != nil {
		detTitle = truncate(it.Key+" — "+it.Title, rightW-2)
		// Status/Typ/Prio/Verdikt als Meta-Zeile, dann die vollen Felder; alles auf
		// die Pane-Innenbreite umgebrochen → nichts wird horizontal abgeschnitten.
		meta := theme.StatusStyle(it.Status).Render(it.Status) + "  " +
			theme.TypeIcon(it.Type) + " " + it.Type + "  " + theme.Priority(it.Priority) +
			"  " + reviewBadge(*it)
		content := meta + "\n" + issueFields(it)
		lines := strings.Split(strings.TrimRight(wrapText(content, rightW-2), "\n"), "\n")
		inner := h - 2
		if inner < 1 {
			inner = 1
		}
		off := clampInt(m.scroll, 0, maxInt(len(lines)-inner, 0))
		if off > 0 || off+inner < len(lines) { // Scroll-Indikator nur wenn nötig
			detTitle = truncate(it.Key+" — "+it.Title, rightW-14) +
				theme.Dim.Render(fmt.Sprintf("  [%d–%d/%d]", off+1, min(off+inner, len(lines)), len(lines)))
		}
		detRows = lines[off:]
	}
	detP := pane{title: detTitle, rows: detRows, isList: false}

	left := renderPane(listP, leftW, h, true)
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	frame := head + "\n" + summary + "\n" + body + "\n" + foot + "\n" + statusLine
	if m.usOpen {
		return placeOverlay(frame, m.userStoryModal(), w, m.height)
	}
	return frame
}

// reviewRows baut die kompakten Master-Listenzeilen: result-Dot + Verdikt-Glyph +
// Key + Titel. renderPane setzt Cursor-Präfix und truncatet auf die Pane-Breite.
func (m model) reviewRows() []string {
	if m.curSprint == nil {
		return nil
	}
	rows := make([]string, len(m.curSprint.Items))
	for i, it := range m.curSprint.Items {
		rows[i] = resultDot(it) + " " + reviewGlyph(it) + " " + theme.Key.Render(it.Key) + " " + it.Title
	}
	return rows
}

// reviewGlyph ist die schmale Verdikt-Markierung für die Master-Liste (volle
// Badge-Form via reviewBadge bleibt der Detail-Pane vorbehalten).
func reviewGlyph(it api.Issue) string {
	switch deref(it.ReviewStatus) {
	case "passed":
		return lipgloss.NewStyle().Foreground(theme.Green).Render("✓")
	case "not_passed":
		return lipgloss.NewStyle().Foreground(theme.Red).Render("✗")
	default:
		return theme.Dim.Render("∙")
	}
}

// Cockpit-Spaltenbreiten (sichtbare Breite). Header UND Datenzeile bauen aus
// derselben Quelle (cockpitRow), damit die Spalten deckungsgleich sind — sonst
// rutscht der Ergebnis-Dot aus seiner Spalte (DD2-B06).
