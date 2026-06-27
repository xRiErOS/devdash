package tui

// DD2-50: Issue-Detail als ziffern-aktivierte Accordion-Sections. Exklusiv —
// genau eine Section offen (m.accOpen, 1-basiert), Ziffer toggelt. Section 1 ist
// default offen und zweispaltig (Goal+Beschreibung | PO-Notes) über das
// Grid-Primitiv (DD2-38). Header-BG Mantle, Body-BG Base, Border Mantle (DESIGN/
// D06). Macht das Detail zur Vollbreite-Arbeitsfläche und löst DD2-43.

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

// accordionSection = eine Detail-Sektion: Titel + bereits gerenderter (ggf.
// zweispaltiger) Body. Nur Sektionen mit Inhalt werden gebaut → die Ziffern
// [1..n] bleiben bedeutungsvoll (keine leere Section aufklappbar).
type accordionSection struct {
	title string
	body  string
}

// subhead rendert eine Feld-Überschrift im Body (Accent) gefolgt vom Wert.
func subhead(label, val string) string {
	return theme.Accent.Render(label) + "\n" + val
}

// issueSections baut die vorhandenen Detail-Sektionen eines Issues in fester
// Reihenfolge (Vorschlag DD2-50): 1=Goal/Beschreibung|PO-Notes, 2=Background/
// Context, 3=Relevant Files, 4=User-Stories, 5=Result, 6=Review. bodyW = Innen-
// breite der Body-Box (Border zieht außen 2 ab — s. renderAccordion). Alle Bodies
// werden hier explizit auf bodyW umgebrochen (kein Auto-Wrap in der Box, #2).
func (m model) issueSections(it api.Issue, bodyW int) []accordionSection {
	var secs []accordionSection

	// Sektion 1: zweispaltig — links Goal+Beschreibung, rechts PO-Notes (PO-Wunsch).
	goal, desc, po := deref(it.Goal), deref(it.Description), deref(it.PoNotes)
	if goal != "" || desc != "" || po != "" {
		gw := gridColWidths(bodyW, 2, []int{3, 2}) // linke Spalte breiter
		var left []string
		if goal != "" {
			left = append(left, wrapText(subhead("Goal", goal), gw[0]))
		}
		if desc != "" {
			left = append(left, wrapText(subhead("Beschreibung", desc), gw[0]))
		}
		right := ""
		if po != "" {
			right = wrapText(subhead("PO-Notes", po), gw[1])
		}
		body := grid(bodyW, 2,
			gridCell{weight: 3, content: strings.Join(left, "\n\n")},
			gridCell{weight: 2, content: right})
		secs = append(secs, accordionSection{"Goal / Beschreibung · PO-Notes", body})
	}

	// Sektion 2: Background + Context Notes (einspaltig).
	if bg, cn := deref(it.Background), deref(it.ContextNotes); bg != "" || cn != "" {
		var parts []string
		if bg != "" {
			parts = append(parts, subhead("Background", bg))
		}
		if cn != "" {
			parts = append(parts, subhead("Context Notes", cn))
		}
		secs = append(secs, accordionSection{"Background / Context", wrapText(strings.Join(parts, "\n\n"), bodyW)})
	}

	// Sektion 3: Relevant Files.
	if rf := deref(it.RelevantFiles); rf != "" {
		secs = append(secs, accordionSection{"Relevant Files", wrapText(rf, bodyW)})
	}

	// Sektion 4: User-Stories mit Verdikt + QA.
	if len(it.UserStories) > 0 {
		var b strings.Builder
		for _, us := range it.UserStories {
			b.WriteString(usVerdictBox(us.Verdict) + " " + us.Title + "\n")
			if qa := deref(us.QA); qa != "" {
				b.WriteString(theme.Dim.Render("    QA: "+qa) + "\n")
			}
		}
		secs = append(secs, accordionSection{
			fmt.Sprintf("User-Stories (%d)", len(it.UserStories)),
			wrapText(strings.TrimRight(b.String(), "\n"), bodyW)})
	}

	// Sektion 5: Result.
	if r := deref(it.Result); r != "" {
		secs = append(secs, accordionSection{"Result", wrapText(r, bodyW)})
	}

	// Sektion 6: Review (Status + Kommentar).
	if rs := deref(it.ReviewStatus); rs != "" {
		secs = append(secs, accordionSection{"Review",
			wrapText(rs+"  "+deref(it.ReviewComment), bodyW)})
	}

	return secs
}

// renderAccordion rendert die Sektions-Header (`> [n] Title`, BG Mantle) und
// klappt die offene Sektion (1-basiert, exklusiv) als Body-Box darunter auf
// (Border Mantle, BG Base). w = volle Innenbreite der Detail-Fläche; die Box
// nutzt Width(w-2), die Border wächst außen auf w (Golden Rule #1 — kein Height()).
func renderAccordion(secs []accordionSection, open, w int) string {
	if len(secs) == 0 {
		return theme.Dim.Render("(keine Detail-Felder)")
	}
	headerStyle := lipgloss.NewStyle().Background(theme.Mantle).Width(w)
	boxStyle := lipgloss.NewStyle().Width(w - 2).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mantle).
		Background(theme.Base)

	var b strings.Builder
	for i, s := range secs {
		n := i + 1
		isOpen := n == open
		marker := theme.Chevron.Render("> ") + theme.Key.Render(fmt.Sprintf("[%d]", n)) + " "
		var title, hint string
		if isOpen {
			title = theme.Header.Render(s.title)
			hint = theme.Muted.Render("  ▾")
		} else {
			title = theme.Muted.Render(s.title)
			hint = theme.Muted.Render("  ▸")
		}
		b.WriteString(headerStyle.Render(truncate(marker+title+hint, w)) + "\n")
		if isOpen {
			b.WriteString(boxStyle.Render(s.body) + "\n")
		}
	}
	return strings.TrimRight(b.String(), "\n")
}
