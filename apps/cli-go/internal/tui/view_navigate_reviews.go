package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/theme"
)

// view_navigate_reviews.go — Reviews-Page (T17): Liste offener Review-Sprints.
// Einstieg via R von überall; enter öffnet das Review-Cockpit (view_review_sprint.go).
// Navigations-Kette: Browse-Project → Navigate-Reviews → Review-Sprint.

func (m model) viewNavigateReviews() string {
	var b strings.Builder
	b.WriteString(theme.Dim.Render("(sprints in status review)") + "\n\n")
	if len(m.reviewSprints) == 0 {
		b.WriteString(theme.Dim.Render("(no sprints in review — S in cockpit sets active→review)") + "\n")
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
	return m.framed("Offene Reviews", b.String(), "i/k:↑↓  enter:cockpit  esc/q:back")
}
