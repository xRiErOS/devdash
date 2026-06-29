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
// verdikt|rest; alle bis auf die letzte werden auf ihre Spaltenbreite gepadded.
func cockpitRow(typePrio, key, title, status, verdikt, rest string) string {
	return col(typePrio, colTypePrio) + " " + col(key, colKey) + " " +
		col(title, colTitle) + " " + col(status, colStatus) + " " +
		col(verdikt, colVerdikt) + " " + rest
}

// issueColHeader liefert die Spalten-Überschrift, deckungsgleich mit cockpitRow.
// Letzte Spalte "Results" = result-Indikator (I01, Gate für Sprint-Abschluss).
func issueColHeader() string {
	return theme.Dim.Render(cockpitRow("Type", "Key", "Title", "Status", "Review verdict", "Results"))
}

// resultDot zeigt, ob das result-Feld gepflegt ist (grün) oder fehlt (rot).
// Fehlendes result blockt den Sprint-Abschluss (Backend-Gate), I01.
func resultDot(it api.Issue) string {
	if strings.TrimSpace(deref(it.Result)) != "" {
		return lipgloss.NewStyle().Foreground(theme.Green).Render("◉") // U+25C9 (neutral; war ● U+25CF = ambiguous, DD2-53)
	}
	return lipgloss.NewStyle().Foreground(theme.Red).Render("◉")
}

// sprintStatusMenu: schwebendes Sprint-Status-Menü (Taste S), zeigt gültige Transitions.
func (m model) sprintStatusMenu() string {
	body := theme.Dim.Render("aktuell: "+m.spCurStatus) + "\n\n"
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
// nicht-stornierte Issue trägt ein passed-Verdikt UND ein gepflegtes result-Feld.
// Spiegelt das serverseitige completeness-Gate (api.js:2241) ohne Roundtrip, damit
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
		if strings.TrimSpace(deref(it.Result)) == "" {
			return false
		}
	}
	return any
}

// reviewSummary fasst die Review-Runden zusammen (für Sprint-Abschluss-Readiness).
// DD2-70: result-Lücken bei passed-Issues werden mitgezählt, und die Abschluss-
// Bereitschaft prüft Verdikt UND result (nicht nur Verdikte) — erst dann der
// prominente „Abschluss-bereit"-Hinweis Richtung C.
func (m model) reviewSummary() string {
	if m.curSprint == nil {
		return ""
	}
	var passed, rejected, pending, missingResult int
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
		if strings.TrimSpace(deref(it.Result)) == "" {
			missingResult++
		}
	}
	parts := []string{
		lipgloss.NewStyle().Foreground(theme.Green).Render(fmt.Sprintf("✓ %d passed", passed)),
		lipgloss.NewStyle().Foreground(theme.Red).Render(fmt.Sprintf("✗ %d not_passed", rejected)),
		theme.Dim.Render(fmt.Sprintf("∙ %d open", pending)),
	}
	if missingResult > 0 {
		parts = append(parts, lipgloss.NewStyle().Foreground(theme.Red).Render(fmt.Sprintf("◉ %d without result", missingResult)))
	}
	head := theme.Dim.Render("Review rounds: ")
	if sprintReviewReady(m.curSprint) {
		head = lipgloss.NewStyle().Foreground(theme.Green).Bold(true).Render("★ Abschluss-bereit (C: PO) — ")
	}
	return head + strings.Join(parts, "  ")
}

// reviewStandClip rendert den aktuellen Review-Stand des Sprints als Markdown
// (DD2-121, US-53): Kopf + Verdikt-Zähler + Tabelle (Key/Title/Status/Verdict/
// Result-vorhanden). Funktioniert auch vor Sprint-Abschluss — PO teilt den
// Zwischenstand, ohne den Sprint zu schließen. Vorlage: sprintClip()-Stil.
func (m model) reviewStandClip() string {
	s := m.curSprint
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
	b.WriteString("| Key | Title | Status | Verdict | Result |\n")
	b.WriteString("|-----|-------|--------|---------|--------|\n")
	for _, it := range s.Items {
		verdict := deref(it.ReviewStatus)
		if verdict == "" {
			verdict = "—"
		}
		result := "—"
		if strings.TrimSpace(deref(it.Result)) != "" {
			result = "yes"
		}
		b.WriteString(fmt.Sprintf("| %s | %s | %s | %s | %s |\n", it.Key, it.Title, it.Status, verdict, result))
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
	title := "Issue-Abnahme"
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
	footer := theme.Dim.Render("a:accept  r:reject  o:open  i/k:↑↓  enter/esc:close")
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

// reviewHints zeigt nur die im aktuellen Zustand gültigen Aktionen.
func (m model) reviewHints() string {
	hints := []string{"i/k:↑↓", "1-n:Section", "ctrl+d/u:scroll", "enter:Abnahme", "s:status", "r:result", "a:pass", "x:reject", "y:copy→clipboard"}
	if it := m.reviewItem(); it != nil {
		if it.Status == "to_review" {
			hints = append(hints, "o:reopen")
		} else {
			hints = append(hints, "w:Rework→to_review")
		}
	}
	if m.curSprint != nil {
		hints = append(hints, "P:Review-Pass", "S:sprint-status")
		if m.curSprint.Status == "review" {
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
	body := theme.Dim.Render("aktuell: "+cur) + "\n\n"
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

// --- Helfer ---
