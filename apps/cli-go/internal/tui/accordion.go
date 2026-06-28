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
	"github.com/charmbracelet/x/ansi"
)

// detailField = ein navigierbares, editierbares Feld einer Detail-Section (DD2-76
// Fokus-Maschine, DD2-77 Edit-Ziel). key = Contract-Feldname (issueUpdateContract),
// editor = Editor-Typ für die huh-Form: input (kurz) ∙ text (lang) ∙ select.
type detailField struct {
	key    string
	label  string
	editor string // input | text | select
}

// detailFocusView trägt den Fokus-Zustand in den Accordion-Renderer (DD2-76):
// welche Section/welches Feld aktiv ist und ob die Detail-Pane den Fokus hält —
// nur dann wird der D08-Balken gezeichnet. Leerwert = kein Fokus (Render wie bisher).
type detailFocusView struct {
	active bool // Detail-Pane fokussiert
	level  int  // 0 = Section, 1 = Feld
	sec    int  // aktive Section (0-basiert)
	field  int  // aktives Feld in der offenen Section
}

// accordionSection = eine Detail-Sektion: Titel + bereits gerenderter (ggf.
// zweispaltiger) Body + die editierbaren Felder (für Fokus-Nav/Edit; nil =
// read-only Section). Nur Sektionen mit Inhalt werden gebaut → die Ziffern
// [1..n] bleiben bedeutungsvoll (keine leere Section aufklappbar).
type accordionSection struct {
	title  string
	body   string
	fields []detailField
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
	// Editierbare Felder werden in Anzeige-Reihenfolge nur für vorhandene Werte
	// geführt (gleiche Gating-Prädikate wie der Body → kein Drift Nav↔Render).
	goal, desc, po := deref(it.Goal), deref(it.Description), deref(it.PoNotes)
	if goal != "" || desc != "" || po != "" {
		gw := gridColWidths(bodyW, 2, []int{3, 2}) // linke Spalte breiter
		var left []string
		var fields []detailField
		if goal != "" {
			left = append(left, wrapText(subhead("Goal", goal), gw[0]))
			fields = append(fields, detailField{"goal", "Goal", "text"})
		}
		if desc != "" {
			left = append(left, wrapText(subhead("Beschreibung", desc), gw[0]))
			fields = append(fields, detailField{"description", "Beschreibung", "text"})
		}
		right := ""
		if po != "" {
			right = wrapText(subhead("PO-Notes", po), gw[1])
			fields = append(fields, detailField{"po_notes", "PO-Notes", "text"})
		}
		body := grid(bodyW, 2,
			gridCell{weight: 3, content: strings.Join(left, "\n\n")},
			gridCell{weight: 2, content: right})
		secs = append(secs, accordionSection{"Goal / Beschreibung ∙ PO-Notes", body, fields})
	}

	// Sektion 2: Background + Context Notes (einspaltig).
	if bg, cn := deref(it.Background), deref(it.ContextNotes); bg != "" || cn != "" {
		var parts []string
		var fields []detailField
		if bg != "" {
			parts = append(parts, subhead("Background", bg))
			fields = append(fields, detailField{"background", "Background", "text"})
		}
		if cn != "" {
			parts = append(parts, subhead("Context Notes", cn))
			fields = append(fields, detailField{"context_notes", "Context Notes", "text"})
		}
		secs = append(secs, accordionSection{"Background / Context", wrapText(strings.Join(parts, "\n\n"), bodyW), fields})
	}

	// Sektion 3: Relevant Files.
	if rf := deref(it.RelevantFiles); rf != "" {
		secs = append(secs, accordionSection{"Relevant Files", wrapText(rf, bodyW),
			[]detailField{{"relevant_files", "Relevant Files", "text"}}})
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
			title: fmt.Sprintf("User-Stories (%d)", len(it.UserStories)),
			body:  wrapText(strings.TrimRight(b.String(), "\n"), bodyW)})
	}

	// Sektion 5: Result (read-only, nur Review — D06).
	if r := deref(it.Result); r != "" {
		secs = append(secs, accordionSection{title: "Result", body: wrapText(r, bodyW)})
	}

	// Sektion 6: Review (Status + Kommentar, read-only).
	if rs := deref(it.ReviewStatus); rs != "" {
		secs = append(secs, accordionSection{title: "Review",
			body: wrapText(rs+"  "+deref(it.ReviewComment), bodyW)})
	}

	return secs
}

// renderAccordion rendert die Sektions-Header (`> [n] Title`, BG Mantle) und
// klappt die offene Sektion (1-basiert, exklusiv) als Body-Box darunter auf
// (Border Mantle, BG Base). w = volle Innenbreite der Detail-Fläche; die Box
// nutzt Width(w-2), die Border wächst außen auf w (Golden Rule #1 — kein Height()).
func renderAccordion(secs []accordionSection, open, w int, focus detailFocusView) string {
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
		activeSec := focus.active && focus.sec == i // D08: Fokus liegt auf dieser Section
		marker := theme.Chevron.Render("> ") + theme.Key.Render(fmt.Sprintf("[%d]", n)) + " "
		var title, hint string
		if isOpen {
			title = theme.Header.Render(s.title)
			hint = theme.Muted.Render("  ▾")
		} else {
			title = theme.Muted.Render(s.title)
			hint = theme.Muted.Render("  ▸")
		}
		header := truncate(marker+title+hint, w)
		if activeSec {
			// D08: aktive Section = Balken ▌ + ganze Zeile akzentgetönt (wie der
			// Tree-Cursor). Eigen-Farben werden gestrippt, einheitlich Accent.
			header = theme.Accent.Render("▌" + truncate(ansi.Strip(marker+title+hint), w-1))
		}
		b.WriteString(headerStyle.Render(header) + "\n")
		if isOpen {
			// Auf Feld-Ebene zeigt die aktive Section den Feld-Streifen (welches Feld
			// editiert würde) vor dem Body.
			if activeSec && focus.level == 1 {
				b.WriteString(fieldStrip(s.fields, focus.field, w) + "\n")
			}
			b.WriteString(boxStyle.Render(s.body) + "\n")
		}
	}
	return strings.TrimRight(b.String(), "\n")
}

// fieldStrip rendert die editierbaren Felder einer Section als kompakte Zeile mit
// dem aktiven Feld (D08-Balken + Accent), die übrigen muted. Read-only Sektionen
// (keine Felder) bekommen einen Hinweis statt eines Streifens.
func fieldStrip(fields []detailField, active, w int) string {
	if len(fields) == 0 {
		return theme.Muted.Render("Felder: (keine editierbaren)")
	}
	parts := make([]string, len(fields))
	for i, f := range fields {
		if i == active {
			parts[i] = theme.Accent.Render("▌" + f.label)
		} else {
			parts[i] = theme.Muted.Render(f.label)
		}
	}
	return truncate(theme.Muted.Render("Felder: ")+strings.Join(parts, "  "), w)
}
