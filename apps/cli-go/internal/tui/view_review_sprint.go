package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

const (
	colTypePrio = 4  // TypeIcon + " " + Priority (z.B. "◆ P1")
	colKey      = 9  // Issue-Kennung
	colTitle    = 38 // Titel (truncate)
	colStatus   = 12 // Lifecycle-Status
	colVerdikt  = 16 // Review-Verdikt
)

// gridCell ist eine Spalte im Detail-Grid (DD2-38): ein Gewicht + bereits
// gerenderter, ggf. mehrzeiliger Inhalt. Die Spaltenbreite ergibt sich
// proportional aus den Gewichten aller Zellen (Golden Rule #4), nicht aus Pixeln.
type gridCell struct {
	weight  int
	content string
}

// gridColWidths berechnet die Weight-proportionalen Spaltenbreiten (Golden Rule
// #4): avail = totalWidth minus gap*(n-1); jede Spalte bekommt ihren Weight-Anteil,
// die letzte den Rundungsrest, sodass die Summe exakt avail ergibt. Single Source
// der Breitenmathematik für grid() UND vorab-umbrechende Aufrufer (DD2-50 Accordion).
func gridColWidths(totalWidth, gap int, weights []int) []int {
	n := len(weights)
	if n == 0 {
		return nil
	}
	if gap < 0 {
		gap = 0
	}
	totalWeight := 0
	for _, wt := range weights {
		totalWeight += maxInt(wt, 1)
	}
	avail := totalWidth - gap*(n-1)
	if avail < n {
		avail = n // mindestens 1 Spalte je Zelle
	}
	widths := make([]int, n)
	used := 0
	for i := 0; i < n; i++ {
		if i == n-1 {
			widths[i] = avail - used
		} else {
			w := avail * maxInt(weights[i], 1) / totalWeight
			if w < 1 {
				w = 1
			}
			widths[i] = w
			used += w
		}
	}
	return widths
}

// grid setzt mehrere gridCells nebeneinander (lipgloss.JoinHorizontal) auf
// totalWidth Spalten, gap Spalten Abstand dazwischen. Wiederverwendbares
// Zweispalten-/n-Spalten-Primitiv für Detail-Sektionen (DD2-50 Accordion,
// DD2-63 Meta-Strip). Golden Rules: #4 Weights statt Pixel; #2 jede Zeile wird
// auf die Spaltenbreite truncatet (kein Auto-Wrap, der die Höhe verfälscht);
// #1 keine Height() auf bordered Style — Spalten werden auf gemeinsame Höhe
// gefüllt, der Rahmen (falls einer drumherum liegt) wächst natürlich.
func grid(totalWidth, gap int, cells ...gridCell) string {
	if len(cells) == 0 {
		return ""
	}
	if gap < 0 {
		gap = 0
	}
	weights := make([]int, len(cells))
	for i, c := range cells {
		weights[i] = c.weight
	}
	widths := gridColWidths(totalWidth, gap, weights)
	// Je Spalte: Zeilen truncaten (kein Auto-Wrap) und gemeinsame Höhe ermitteln.
	colLines := make([][]string, len(cells))
	maxH := 0
	for i, c := range cells {
		lines := strings.Split(c.content, "\n")
		for j := range lines {
			lines[j] = truncate(lines[j], widths[i])
		}
		colLines[i] = lines
		if len(lines) > maxH {
			maxH = len(lines)
		}
	}
	// Feste Spaltenbreite (Width pad, kein Wrap da Zeilen ≤ widths[i]) + Auffüllen
	// auf gemeinsame Höhe, damit JoinHorizontal die Spalten oben bündig ausrichtet.
	blocks := make([]string, 0, len(cells)*2-1)
	gapBlock := lipgloss.NewStyle().Width(gap).Render(strings.Repeat("\n", maxH-1))
	for i := range cells {
		lines := colLines[i]
		for len(lines) < maxH {
			lines = append(lines, "")
		}
		if i > 0 && gap > 0 {
			blocks = append(blocks, gapBlock)
		}
		blocks = append(blocks, lipgloss.NewStyle().Width(widths[i]).Render(strings.Join(lines, "\n")))
	}
	return lipgloss.JoinHorizontal(lipgloss.Top, blocks...)
}

// col padded s auf w SICHTBARE Spalten — ANSI-bewusst via lipgloss.Width, anders
// als fmt %-Ns (das die ANSI-Bytes als Breite zählt und gefärbte Zellen verkürzt).
func col(s string, w int) string {
	if pad := w - lipgloss.Width(s); pad > 0 {
		return s + strings.Repeat(" ", pad)
	}
	return s
}

// cockpitRow setzt eine Cockpit-Zeile aus den Zellen typprio|key|title|status|
// verdikt; alle bis auf die letzte werden auf ihre Spaltenbreite gepadded.
func cockpitRow(typePrio, key, title, status, verdikt string) string {
	return col(typePrio, colTypePrio) + " " + col(key, colKey) + " " +
		col(title, colTitle) + " " + col(status, colStatus) + " " + verdikt
}

// issueColHeader liefert die Spalten-Überschrift, deckungsgleich mit cockpitRow.
func issueColHeader() string {
	return theme.Dim.Render(cockpitRow("Type", "Key", "Title", "Status", "Review verdict"))
}

// sprintStatusMenu: schwebendes Sprint-Status-Menü (Taste S), zeigt gültige Transitions.
func (m model) sprintStatusMenu() string {
	body := theme.Dim.Render("current: "+m.spCurStatus) + "\n\n"
	body += menuList(len(m.spopts), m.spmenu.cursor, func(i int, sel bool) string {
		s := m.spopts[i]
		label := statusText(s)
		if s == "completed" {
			label = statusText(s) + theme.Dim.Render(" (checks passed reviews)")
		}
		if sel {
			label = theme.Header.Render(s)
			if s == "completed" {
				label = theme.Header.Render(s) + theme.Dim.Render(" (checks passed reviews)")
			}
		}
		return label
	})
	return modalPanel("Set sprint status", body, "enter: set   esc: cancel", clampModalWidth(40, m.width), theme.Mauve)
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
		return theme.Dim.Render("∙ no verdict")
	}
}

// verdictColored färbt einen rohen Verdikt-String (DD2-225): passed grün, not_passed/
// rejected (Legacy) rot, pending/leer dim. Single Source für die Runden-Tabelle.
func verdictColored(v string) string {
	switch v {
	case "passed":
		return lipgloss.NewStyle().Foreground(theme.Green).Render(v)
	case "not_passed", "rejected":
		return lipgloss.NewStyle().Foreground(theme.Red).Render(v)
	case "":
		return theme.Dim.Render("pending")
	default:
		return theme.Dim.Render(v)
	}
}

// reviewRoundsTable rendert den Verlauf aller Review-Runden als Tabelle (DD2-225,
// US-221): Round | Verdict | Comment. Der Kommentar wird in seiner Spalte umgebrochen
// (mehrzeilig), Round/Verdict bleiben oben bündig — so ist bei rejected der PO-Kommentar
// vollständig sichtbar (nicht nur das latest-Verdikt). Breiten ANSI-bewusst via grid().
func reviewRoundsTable(it api.Issue, bodyW int) string {
	widths := gridColWidths(bodyW, 2, []int{1, 2, 5})
	row := func(round, verdict, comment string) string {
		return grid(bodyW, 2,
			gridCell{1, round},
			gridCell{2, verdict},
			gridCell{5, comment})
	}
	lines := []string{row(theme.Dim.Render("Round"), theme.Dim.Render("Verdict"), theme.Dim.Render("Comment"))}
	for _, r := range it.ReviewRounds {
		comment := strings.TrimSpace(deref(r.Comment))
		if comment == "" {
			comment = theme.Dim.Render("—")
		} else {
			comment = wrapText(comment, widths[2])
		}
		lines = append(lines, row(fmt.Sprintf("%d", r.Round), verdictColored(r.Status), comment))
	}
	return strings.Join(lines, "\n")
}

// verdictDot ist der farbige Verdikt-Indikator der Master-Liste (DD2-67 Rework #2):
// grün=passed, rot=not_passed, orange (Peach)=noch im Review / kein Verdikt.
func verdictDot(it api.Issue) string {
	c := theme.Peach
	switch deref(it.ReviewStatus) {
	case "passed":
		c = theme.Green
	case "not_passed":
		c = theme.Red
	}
	return lipgloss.NewStyle().Foreground(c).Render("◉")
}

// usAllAccepted = alle User-Stories des Issues tragen Verdikt accepted (summativ).
// Ohne Stories: false (nichts geprüft → nicht „grün").
func usAllAccepted(it api.Issue) bool {
	if len(it.UserStories) == 0 {
		return false
	}
	for _, us := range it.UserStories {
		if us.Verdict != "accepted" {
			return false
		}
	}
	return true
}

// usSummaryDot fasst die User-Story-Abnahme summativ als Dot (DD2-67 Rework #4):
// grün=alle accepted, rot=mind. eine offen/rejected, neutral=keine Stories.
func usSummaryDot(it api.Issue) string {
	if len(it.UserStories) == 0 {
		return theme.Dim.Render("◉")
	}
	c := theme.Red
	if usAllAccepted(it) {
		c = theme.Green
	}
	return lipgloss.NewStyle().Foreground(c).Render("◉")
}

// sprintReviewReady prüft den lokalen Abschluss-Zustand (DD2-70): jedes
// nicht-stornierte Issue trägt ein passed-Verdikt.
// Spiegelt das serverseitige completeness-Gate (api.js) ohne Roundtrip, damit
// das Cockpit die Abschluss-Bereitschaft prominent signalisieren kann.
func sprintReviewReady(s *api.Sprint) bool {
	if s == nil {
		return false
	}
	any := false
	for _, it := range s.Items {
		if it.Status == "cancelled" {
			continue
		}
		any = true
		if deref(it.ReviewStatus) != "passed" {
			return false
		}
	}
	return any
}

// reviewSummary fasst die Review-Runden zusammen (für Sprint-Abschluss-Readiness).
// Erst wenn jedes nicht-stornierte Issue ein passed-Verdikt trägt, erscheint der
// prominente „Abschluss-bereit"-Hinweis Richtung C.
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
		theme.Dim.Render(fmt.Sprintf("∙ %d open", pending)),
	}
	head := theme.Dim.Render("Review rounds: ")
	if sprintReviewReady(m.curSprint) {
		head = lipgloss.NewStyle().Foreground(theme.Green).Bold(true).Render("★ ready to complete (C: PO) — ")
	}
	return head + strings.Join(parts, "  ")
}

// reviewStandClip rendert den aktuellen Review-Stand des Sprints als Markdown
// (DD2-121, US-53): Kopf + Verdikt-Zähler + Tabelle (Key/Title/Status/Verdict).
// Funktioniert auch vor Sprint-Abschluss — PO teilt den
// Zwischenstand, ohne den Sprint zu schließen. Vorlage: sprintClip()-Stil.
//
// DD2-157: dünner Wrapper über reviewStandMarkdown. Denselben Markdown yankt der
// Sprint-Complete-Flow (C C) automatisch — siehe doSprintComplete (messages.go),
// damit 'y' und 'C C' konsistent Markdown statt rohem rev-results-JSON kopieren.
func (m model) reviewStandClip() string {
	return reviewStandMarkdown(m.curSprint)
}

// reviewStandMarkdown serialisiert einen Sprint-Review-Stand als Markdown. Single
// Source für den 'y'-Yank (reviewStandClip) UND den Auto-Yank nach Sprint-Complete
// (doSprintComplete in messages.go, DD2-157) — beide MÜSSEN identisches Markdown
// liefern, daher hier zentralisiert statt im Caller dupliziert.
func reviewStandMarkdown(s *api.Sprint) string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("# Review %s — %s\n", s.Key, s.Name))
	b.WriteString(fmt.Sprintf("Status: %s · %d/%d done\n\n", s.Status, s.DoneCount, s.ItemCount))
	var passed, rejected, pending int
	for _, it := range s.Items {
		switch deref(it.ReviewStatus) {
		case "passed":
			passed++
		case "not_passed":
			rejected++
		default:
			pending++
		}
	}
	b.WriteString(fmt.Sprintf("Verdicts: %d passed · %d not_passed · %d open\n\n", passed, rejected, pending))
	b.WriteString("| Key | Title | Status | Verdict |\n")
	b.WriteString("|-----|-------|--------|---------|\n")
	for _, it := range s.Items {
		verdict := deref(it.ReviewStatus)
		if verdict == "" {
			verdict = "—"
		}
		b.WriteString(fmt.Sprintf("| %s | %s | %s | %s |\n", it.Key, it.Title, it.Status, verdict))
	}
	// DD2-152: Reject-Kommentare je not_passed-Issue UNTER der Tabelle anhängen. Der
	// Handover-Markdown (y → Clipboard) trägt damit die Ablehnungsgründe direkt — der
	// KI-Agent muss sie für das Rework nicht separat per Tool nachladen.
	var rej strings.Builder
	for _, it := range s.Items {
		if deref(it.ReviewStatus) != "not_passed" {
			continue
		}
		comment := strings.TrimSpace(deref(it.ReviewComment))
		if comment == "" {
			comment = "(no comment)"
		}
		rej.WriteString(fmt.Sprintf("\n### %s — %s\n%s\n", it.Key, it.Title, comment))
	}
	if rej.Len() > 0 {
		b.WriteString("\n## Reject comments\n")
		b.WriteString(rej.String())
	}
	return b.String()
}

// userStoryModal: schwebendes Abnahme-Modal (goal/background + US-Verdikte).
// DD2-90/120: Goal/Background/Titel und User-Story-Titel werden auf die Modal-
// Innenbreite UMGEBROCHEN (kein truncate), damit die PO alles vollständig liest.
func (m model) userStoryModal() string {
	var b strings.Builder
	// DD2-90 Rework: das Abnahme-Modal skaliert mit der Terminalbreite. Die fixe
	// 64er-Standardbox (modalBoxWidth) war auf breiten Terminals winzig und der
	// 62-Spalten-Wrap quetschte Goal/Background (PO-Befund „klein/abgeschnitten").
	boxW := m.termWidth() - 8
	if boxW > 110 {
		boxW = 110
	}
	if boxW < 50 {
		boxW = 50
	}
	iw := boxW - 2 // Innenbreite (Box-Padding 0,1)
	it := m.reviewItem()
	title := "Issue acceptance"
	if it != nil {
		title = it.Key + " — " + it.Title
	}
	b.WriteString(theme.Header.Render(wrapText(title, iw)) + "\n\n")
	if it != nil {
		if g := deref(it.Goal); g != "" {
			b.WriteString(wrapText(theme.Accent.Render("Goal: ")+g, iw) + "\n")
		}
		if bg := deref(it.Background); bg != "" {
			b.WriteString(wrapText(theme.Accent.Render("Background: ")+bg, iw) + "\n")
		}
	}
	b.WriteString("\n" + theme.Dim.Render(fmt.Sprintf("User-Stories (%d):", len(m.usList))) + "\n")
	if len(m.usList) == 0 {
		b.WriteString(theme.Dim.Render("(none — loading or none present)") + "\n")
	}
	// Story-Titel umbrechen; Prefix (Cursor 2 + Verdikt-Box 3 + Space 1 = 6 sichtbare
	// Spalten) — Folgezeilen unter den Text einrücken (DD2-120), nicht unter Box/Cursor.
	const usIndent = 6
	for i, us := range m.usList {
		sel := i == m.uslist.cursor
		cursor := "  "
		if sel {
			cursor = theme.Accent.Render("▸ ")
		}
		lines := strings.Split(wrapText(us.Title, iw-usIndent), "\n")
		for j, ln := range lines {
			if sel {
				ln = theme.Header.Render(ln)
			}
			if j == 0 {
				b.WriteString(cursor + usVerdictBox(us.Verdict) + " " + ln + "\n")
			} else {
				b.WriteString(strings.Repeat(" ", usIndent) + ln + "\n")
			}
		}
	}
	content := b.String()
	footer := theme.Dim.Render("a:accept  x:reject  o:open  i/k:↑↓  enter/esc:close")
	// DD2-90 Rework: Höhen-Guard — sehr lange Texte sollen das Modal nicht über den
	// Schirm hinaus wachsen lassen (placeOverlay clippt sonst unten weg). Überlauf →
	// Hinweis auf den Detail-Pane (dort voller, scrollbarer Text). Footer bleibt sichtbar.
	if m.height > 8 {
		maxH := m.height - 6 // Platz für Box-Border + Footer
		lines := strings.Split(content, "\n")
		if len(lines) > maxH {
			lines = append(lines[:maxH], theme.Dim.Render("… (full text in detail pane — scroll ctrl+d/u)"))
			content = strings.Join(lines, "\n")
		}
	}
	return modalBox(content+"\n\n"+footer, boxW, theme.Mauve)
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

// reviewHandoverClip baut das Sprint-Review-Übergabe-Artefakt (DD2-105): ein
// aktionsfähiges Markdown aus dem Review-Ergebnis — Sprint-Goal, Verdikt-Summary,
// Re-Work-Liste (not_passed inkl. Reject-Kommentar, DD2-152-Link), abgenommene und
// offene Issues, Next-Steps. Reicher als reviewStandClip (kompakte State-Tabelle) —
// gedacht für die Hand an PO bzw. die Folge-Session.
func (m model) reviewHandoverClip() string {
	s := m.curSprint
	var b strings.Builder
	b.WriteString(fmt.Sprintf("# Sprint Review Handover — %s\n\n", s.Key))
	b.WriteString(fmt.Sprintf("**Sprint:** %s\n", s.Name))
	if g := deref(s.Goal); g != "" {
		b.WriteString(fmt.Sprintf("**Goal:** %s\n", g))
	}
	b.WriteString(fmt.Sprintf("**Status:** %s · %d/%d done\n\n", s.Status, s.DoneCount, s.ItemCount))

	var passed, rejected, pending []api.Issue
	for _, it := range s.Items {
		switch deref(it.ReviewStatus) {
		case "passed":
			passed = append(passed, it)
		case "not_passed":
			rejected = append(rejected, it)
		default:
			pending = append(pending, it)
		}
	}
	b.WriteString(fmt.Sprintf("Verdicts: %d passed · %d not_passed · %d open\n\n", len(passed), len(rejected), len(pending)))

	if len(rejected) > 0 {
		b.WriteString("## Re-Work (not_passed)\n")
		for _, it := range rejected {
			b.WriteString(fmt.Sprintf("- **%s** %s\n", it.Key, it.Title))
			if c := strings.TrimSpace(deref(it.ReviewComment)); c != "" {
				for _, ln := range strings.Split(c, "\n") {
					b.WriteString("  > " + ln + "\n")
				}
			}
		}
		b.WriteString("\n")
	}
	if len(passed) > 0 {
		b.WriteString("## Passed\n")
		for _, it := range passed {
			b.WriteString(fmt.Sprintf("- %s %s\n", it.Key, it.Title))
		}
		b.WriteString("\n")
	}
	if len(pending) > 0 {
		b.WriteString("## Pending review\n")
		for _, it := range pending {
			b.WriteString(fmt.Sprintf("- %s %s (%s)\n", it.Key, it.Title, it.Status))
		}
		b.WriteString("\n")
	}

	b.WriteString("## Next steps\n")
	switch {
	case len(rejected) > 0:
		b.WriteString("- Address the re-work items above, then move them back to to_review.\n")
	case len(pending) > 0:
		b.WriteString("- Reach a verdict on every pending item before handover.\n")
	default:
		b.WriteString("- All issues passed — sprint complete is the PO's call (DD-186).\n")
	}
	return b.String()
}

// reviewHints zeigt nur die im aktuellen Zustand gültigen Aktionen.
func (m model) reviewHints() string {
	hints := []string{"i/k:↑↓", "1-n:Section", "ctrl+d/u:scroll", "enter:accept", "s:status", "a:pass", "x:reject", "y:copy→clipboard", "H:handover"}
	if it := m.reviewItem(); it != nil {
		if it.Status == "to_review" {
			hints = append(hints, "o:reopen")
		} else {
			hints = append(hints, "w:rework→to_review")
		}
	}
	if m.curSprint != nil {
		hints = append(hints, "P:Review-Pass", "S:sprint-status")
		if m.curSprint.Status == "to_review" {
			c := "C:complete(PO)"
			if sprintReviewReady(m.curSprint) { // DD2-70: bereit → prominent
				c = "★C:complete(PO)"
			}
			hints = append(hints, c)
		}
	}
	hints = append(hints, "q:back")
	return strings.Join(hints, "  ")
}

// statusMenu ist das schwebende Issue-Status-Menü (Taste s).
func (m model) statusMenu() string {
	cur := m.stIssueStatus
	body := theme.Dim.Render("current: "+cur) + "\n\n"
	body += menuList(len(m.sopts), m.smenu.cursor, func(i int, sel bool) string {
		s := m.sopts[i]
		label := statusText(s)
		if sel {
			label = theme.Header.Render(s)
		}
		mark := "  "
		if s == cur {
			mark = theme.Dim.Render("∙ ") // U+2219 (neutral; war • U+2022 = ambiguous, DD2-53)
		}
		return mark + label
	})
	return modalPanel("Set status", body, "enter: set   esc: cancel", clampModalWidth(30, m.width), theme.Mauve)
}

// noticeText färbt einen transienten Hinweis in Sapphire (gültige Aktionen/Fehler).
func noticeText(s string) string {
	return lipgloss.NewStyle().Foreground(theme.Sapphire).Render(s)
}

// --- Filter-Modal (#4/#8) ---

// filterBox rendert das schwebende Filter-Modal (kompakt, wird zentriert overlaid).
func (m model) filterBox() string {
	col := []string{"Milestones", "Sprints", "Issues"}[clampInt(m.ftarget, 0, 2)]
	body := theme.Dim.Render("space: toggle   enter/esc: close") + "\n\n"
	if len(m.fopts) == 0 {
		body += theme.Dim.Render("(no values)") + "\n"
	}
	fs := m.filterFor(m.ftarget)
	body += menuList(len(m.fopts), m.fcur.cursor, func(i int, sel bool) string {
		o := m.fopts[i]
		box := theme.Dim.Render("[ ]")
		if fs.shown(o.value) {
			box = theme.Accent.Render("[x]")
		}
		label := o.label
		if sel {
			label = theme.Header.Render(label)
		}
		return box + " " + label
	})
	return modalPanel("Filter ∙ "+col, body, "", clampModalWidth(38, m.width), theme.Mauve)
}

// --- Review-Cockpit (Vollbild-Render) ---

// viewReviewSprint ist das Review-Cockpit als echtes Master-Detail (DD2-67): links die
// Issue-Liste (Master) mit umgebrochenem Titel + Verdikt-Dot, rechts das Detail
// des selektierten Issues als Tree-Accordion (Ziffern-Toggle) mit Status- und
// User-Story-Dots im Header. Kopf: globaler Header + Sprint-Titel + Review-Summary
// (★ DD2-70 Abschluss-Bereitschaft); Footer: reviewHints + Status.
func (m model) viewReviewSprint() string {
	if m.curSprint == nil {
		return m.framed("Review", theme.Dim.Render("(loading …)"), "esc/q: back")
	}
	s := m.curSprint
	w := m.termWidth()

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("Review "+s.Key)) +
		theme.Dim.Render(fmt.Sprintf("   %s · %d/%d", statusText(s.Status), s.DoneCount, s.ItemCount))
	summary := m.reviewSummary()
	foot := theme.Muted.Render(wrapText(m.reviewHints(), w))
	statusLine := m.statusBar("")

	// Pane-Innenhöhe = Gesamthöhe minus Chrome (Kopf/Summary/Footer/Status),
	// minus 2 für den Pane-Border (der außen wächst → Gesamthöhe = innerH+2).
	// DD2-236: KEIN Trennzeilen-Abzug — die "\n" zwischen den Render-Teilen sind
	// Zeilenterminatoren, keine Extra-Zeilen ("A\nB".Height == H(A)+H(B)). Das alte
	// "+ 3" zog die Pane um 3 Zeilen zu kurz → View endete vor dem unteren Rand
	// (analog treeLayout, das ebenfalls keine Trennzeilen abzieht).
	chromeH := lipgloss.Height(head) + lipgloss.Height(summary) +
		lipgloss.Height(foot) + lipgloss.Height(statusLine)
	h := m.frameH() - chromeH - 2 // DD2-84: Innenhöhe (App-Außenrahmen reserviert)
	if h < 6 {
		h = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}

	// 1fr:2fr über den Goldstandard-Helper (DD2-227/229): tree_width als Mindestbreite,
	// Border frisst je 2 Spalten (Golden Rule #1/#4). Vorher eine inline-Breitenformel (~42/58).
	leftW, rightW := m.masterDetailWidths(w)

	left := m.reviewMasterPane(leftW, h)
	right := m.reviewDetailPane(m.reviewItem(), rightW, h)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	// DD2-84: gerahmter App-Außenrahmen; User-Story-Modal schwebt danach zentriert.
	frame := m.outerBorder(head + "\n" + summary + "\n" + body + "\n" + foot + "\n" + statusLine)
	if m.usOpen {
		return placeOverlay(frame, m.userStoryModal(), m.width, m.height)
	}
	return frame
}

// reviewMasterPane rendert die Master-Liste (DD2-67 Rework #1/#2): je Issue ein
// Verdikt-Dot + Key, darunter der auf Pane-Breite UMGEBROCHENE Titel (kein
// horizontales Truncaten). Die Selektion hebt den ganzen Block akzentuiert hervor.
func (m model) reviewMasterPane(w, h int) string {
	header := []string{
		theme.Header.Render(truncate(fmt.Sprintf("Issues (%d)", len(m.curSprint.Items)), w)),
		theme.Dim.Render(strings.Repeat("─", min(w, 14))),
	}
	var body []string
	cursorLine := 0
	for i, it := range m.curSprint.Items {
		sel := i == m.rlist.cursor
		if sel {
			cursorLine = len(body) // Body-Zeilenindex des selektierten Issues
		}
		cur := "  "
		key := theme.Key.Render(it.Key)
		if sel {
			cur = theme.Accent.Render("▸ ")
			key = theme.Header.Render(it.Key)
		}
		body = append(body, truncate(cur+verdictDot(it)+" "+key, w))
		for _, tl := range strings.Split(wrapText(it.Title, w-4), "\n") {
			styled := theme.Dim.Render(tl)
			if sel {
				styled = tl
			}
			body = append(body, "    "+styled)
		}
	}
	// Master-Liste um den Cursor fenstern, damit das selektierte Issue sichtbar
	// bleibt — borderedPane cappte vorher hart auf die ersten h Zeilen (selektiertes
	// Issue verschwand unten bei langen Sprints, z.B. DD2#25 mit 16 Issues).
	avail := h - len(header)
	if avail < 1 {
		avail = 1
	}
	body = windowAround(body, avail, cursorLine)
	return borderedPane(append(header, body...), w, h, theme.Mauve)
}

// reviewDetailPane rendert das Detail des selektierten Issues als Tree-Accordion
// (DD2-67 Rework #3): Header mit Issue-Key + User-Story-Dot (#4) + Meta-
// Zeile, darunter die ziffern-toggelbaren Sektionen (issueSections/renderAccordion),
// via m.scroll fensterbar.
func (m model) reviewDetailPane(it *api.Issue, w, h int) string {
	if it == nil {
		return borderedPane([]string{theme.Dim.Render("(no issue selected)")}, w, h, theme.Overlay)
	}
	header := []string{
		truncate(theme.Header.Render(it.Key+" — "+it.Title), w),
		truncate(theme.StatusStyle(it.Status).Render(it.Status)+"  "+
			theme.TypeIcon(it.Type)+" "+it.Type+"  "+theme.Priority(it.Priority)+"  "+reviewBadge(*it), w),
	}
	// DD2-117: Kontext-Meta (Milestone/Sprint/Tags) wie im Issue-Detail einblenden —
	// gibt dem PO beim Review die Einordnung, ohne die View zu verlassen. Leere Werte
	// fallen via metaStrip weg; ist alles leer, bleibt die Zeile ganz aus.
	if deref(it.Milestone) != "" || deref(it.SprintKey) != "" || len(it.Tags) > 0 {
		header = append(header, truncate(metaStrip([]metaPair{
			{deref(it.Milestone), "milestone"},
			{deref(it.SprintKey), "sprint"},
			{tagsInline(it.Tags), "tags"},
		}, "", w), w))
	}
	header = append(header,
		truncate(theme.Dim.Render("User-Stories ")+usSummaryDot(*it), w),
		theme.Dim.Render(strings.Repeat("─", min(w, 24))),
	)
	acc := renderAccordion(m.issueSections(*it, w-2, false), m.accOpen, w, detailFocusView{}) // read-only Preview (DD2-144)
	accLines := strings.Split(acc, "\n")
	bodyH := h - len(header)
	if bodyH < 1 {
		bodyH = 1
	}
	off := clampInt(m.scroll, 0, maxInt(len(accLines)-bodyH, 0))
	lines := append(header, accLines[off:]...)
	return borderedPane(lines, w, h, theme.Overlay)
}

// --- Helfer ---
