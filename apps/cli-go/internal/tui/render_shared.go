package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

// render_shared.go — geteilte Render-Primitive, die von mehreren Screens genutzt
// werden (vormals in view_columns.go): die bordered Pane, Tag-Inline-Render und
// der untruncated Issue-Feld-Block. Single Source (Fix-in-Root) — eine Kopie,
// kann nicht driften.

// pane ist eine titelgerahmte Spalte (Master-Listen, Vorschau).
type pane struct {
	title  string
	rows   []string
	cursor int
	isList bool
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

// tagsInline rendert Tag-Swatches space-getrennt (leerer String bei keinen Tags).
// DD2-143: Single Source für Milestone-Tag-Anzeige in TreeView + Detail.
func tagsInline(tags []api.Tag) string {
	if len(tags) == 0 {
		return ""
	}
	chips := make([]string, len(tags))
	for i, t := range tags {
		chips[i] = tagSwatch(t)
	}
	return strings.Join(chips, " ")
}

// issueFields rendert die vollen, untruncated Issue-Felder (Goal, Background,
// …, Result, Review) plus User-Stories+QA als scrollbaren Detail-Block. Single
// Source für viewDetailIssue (Tree) UND das Review-Cockpit (DD2-67) — eine
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
	field("Description", deref(it.Description))
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

// borderedPane füllt/cappt content auf h Innenzeilen und legt den RoundedBorder
// außen an (Golden Rule #1: kein Height() auf bordered Style). Gesamthöhe = h+2.
func borderedPane(lines []string, w, h int, border lipgloss.Color) string {
	out := append([]string{}, lines...)
	if len(out) > h {
		out = out[:h]
	}
	for len(out) < h {
		out = append(out, "")
	}
	return lipgloss.NewStyle().Width(w).
		Border(lipgloss.RoundedBorder()).BorderForeground(border).
		Render(strings.Join(out, "\n"))
}
