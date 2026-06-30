package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

// view_navigate_reviews.go — Reviews-Page (T17): Liste offener Review-Sprints.
// Einstieg via R von überall; enter öffnet das Review-Cockpit (view_review_sprint.go).
// Navigations-Kette: Browse-Project → Navigate-Reviews → Review-Sprint.
//
// DD2-230: Die Liste ist klappbar. l/→ (oder erneut zum Schließen) klappt den Sprint
// am Cursor auf und rendert inline eine Verdict-Tabelle aller Issues (id/title/goal/
// User-Stories/verdict/comment); die Items werden dafür lazy nachgeladen (reviewDetail-
// Cache). Der Collapsed-Header zeigt X/Y passed (passed_count). enter führt unverändert
// ins Cockpit, j/← klappt explizit ein.

func (m model) viewNavigateReviews() string {
	var b strings.Builder
	b.WriteString(theme.Dim.Render("(sprints in status review)") + "\n\n")
	if len(m.reviewSprints) == 0 {
		b.WriteString(theme.Dim.Render("(no sprints in review — S in cockpit sets active→review)") + "\n")
	}
	w := m.termWidth()
	for i, s := range m.reviewSprints {
		b.WriteString(m.reviewHeaderLine(s, i == m.rvlist.cursor) + "\n")
		if m.reviewExp[s.ID] {
			for _, ln := range m.reviewIssueTable(m.reviewDetail[s.ID], w) {
				b.WriteString(ln + "\n")
			}
		}
	}
	return m.framed("Offene Reviews", b.String(), "i/k:↑↓  l/j:expand/collapse  enter:cockpit  esc/q:back")
}

// reviewHeaderLine rendert die Collapsed-Zeile eines Review-Sprints (DD2-230): expand-
// Marker (▾ offen / ▸ zu, akzentuiert wenn selektiert) + Key + Name + Status + X/Y passed
// (passed_count) + Meilenstein. Padding ANSI-bewusst via col() (nie fmt %-Ns auf
// gefärbten Zellen, B06).
func (m model) reviewHeaderLine(s api.Sprint, sel bool) string {
	markerStyle := theme.Dim
	marker := "▸ "
	if m.reviewExp[s.ID] {
		marker = "▾ "
	}
	if sel {
		markerStyle = theme.Accent
	}
	keyStyled := theme.Key.Render(s.Key)
	nameStyled := theme.Dim.Render(truncate(s.Name, 30))
	if sel {
		keyStyled = theme.Header.Render(s.Key)
		nameStyled = theme.Header.Render(truncate(s.Name, 30))
	}
	ms := ""
	if s.MilestoneName != nil && *s.MilestoneName != "" {
		ms = theme.Dim.Render("  — " + truncate(*s.MilestoneName, 24))
	}
	passed := theme.Dim.Render(fmt.Sprintf("  %d/%d passed", s.PassedCount, s.ItemCount))
	return markerStyle.Render(marker) + col(keyStyled, 9) + " " + col(nameStyled, 30) + " " +
		statusText(s.Status) + passed + ms
}

// reviewIssueTable rendert die aufgeklappte Inline-Verdict-Tabelle eines Sprints
// (DD2-230, US2): Spalten id|title|goal|User Stories|verdict|comment, gewichtsbasiert
// über grid()/gridColWidths() (Golden Rule #4), Zellen ANSI-sicher getruncatet. Solange
// die Items noch nicht geladen sind (Lazy-Fetch), steht ein (loading …)-Hinweis.
func (m model) reviewIssueTable(s *api.Sprint, w int) []string {
	const indent = "    "
	if s == nil {
		return []string{theme.Dim.Render(indent + "(loading …)")}
	}
	if len(s.Items) == 0 {
		return []string{theme.Dim.Render(indent + "(no issues)")}
	}
	tw := w - len(indent) - 2
	if tw < 40 {
		tw = 40
	}
	cells := func(id, title, goal, us, verdict, comment string) string {
		return grid(tw, 1,
			gridCell{2, id},
			gridCell{4, title},
			gridCell{4, goal},
			gridCell{3, us},
			gridCell{2, verdict},
			gridCell{5, comment},
		)
	}
	lines := []string{indent + cells(
		theme.Dim.Render("id"), theme.Dim.Render("title"), theme.Dim.Render("goal"),
		theme.Dim.Render("User Stories"), theme.Dim.Render("verdict"), theme.Dim.Render("comment"),
	)}
	for _, it := range s.Items {
		lines = append(lines, indent+cells(
			theme.Key.Render(it.Key),
			oneLine(it.Title),
			theme.Dim.Render(oneLine(deref(it.Goal))),
			reviewUSFrac(it),
			reviewVerdictCell(it),
			theme.Dim.Render(oneLine(deref(it.ReviewComment))),
		))
	}
	return lines
}

// reviewUSFrac fasst die User-Story-Abnahme eines Issues als "X/Y passed" (accepted/
// gesamt); alle accepted → grün, keine Stories → "—" (DD2-230). Spiegelt usAllAccepted.
func reviewUSFrac(it api.Issue) string {
	total := len(it.UserStories)
	if total == 0 {
		return theme.Dim.Render("—")
	}
	acc := 0
	for _, us := range it.UserStories {
		if us.Verdict == "accepted" {
			acc++
		}
	}
	txt := fmt.Sprintf("%d/%d passed", acc, total)
	if acc == total {
		return lipgloss.NewStyle().Foreground(theme.Green).Render(txt)
	}
	return txt
}

// reviewVerdictCell färbt das aktuelle Review-Verdikt (review_status): passed grün,
// not_passed rot, sonst pending/dim (DD2-230, konsistent mit reviewBadge/verdictDot).
func reviewVerdictCell(it api.Issue) string {
	switch deref(it.ReviewStatus) {
	case "passed":
		return lipgloss.NewStyle().Foreground(theme.Green).Render("passed")
	case "not_passed":
		return lipgloss.NewStyle().Foreground(theme.Red).Render("not_passed")
	default:
		return theme.Dim.Render("pending")
	}
}

// oneLine kollabiert Zeilenumbrüche zu Leerzeichen, damit mehrzeilige Zell-Inhalte
// (Goal/Comment) die grid()-Zeilenhöhe nicht aufblähen (DD2-230).
func oneLine(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, "\r\n", " "), "\n", " ")
}
