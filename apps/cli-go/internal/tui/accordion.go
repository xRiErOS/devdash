package tui

// DD2-50: Issue-Detail als ziffern-aktivierte Accordion-Sections. Exklusiv —
// genau eine Section offen (m.accOpen, 1-basiert), Ziffer toggelt. Section 1 ist
// default offen und zweispaltig (Goal+Beschreibung | PO-Notes) über das
// Grid-Primitiv (DD2-38). Header-BG Mantle, Body-BG Base, Border Mantle (DESIGN/
// D06). Macht das Detail zur Vollbreite-Arbeitsfläche und löst DD2-43.

import (
	"fmt"
	"strconv"
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

// subtaskGlyph rendert den Status-Marker einer Unteraufgabe (DD2-197): done ✓ grün,
// open ○ muted — analog der Verdikt-Glyphen-Sprache.
func subtaskGlyph(status string) string {
	if status == "done" {
		return lipgloss.NewStyle().Foreground(theme.Green).Render("✓")
	}
	return theme.Muted.Render("○")
}

// subhead rendert eine Feld-Überschrift im Body (Accent) gefolgt vom Wert.
func subhead(label, val string) string {
	return theme.Accent.Render(label) + "\n" + val
}

// placeholderOr zeigt einen mutedem Platzhalter, wenn der Wert leer ist (DD2-135:
// leere, aber editierbare Felder kenntlich machen — enter ergänzt sie).
func placeholderOr(s string) string {
	if strings.TrimSpace(s) == "" {
		return theme.Muted.Render("(empty)") // kurz: bricht in schmaler Spalte nicht um
	}
	return s
}

// userStoryFields baut die navigierbaren Felder der User-Story-Section (DD2-144):
// ein Feld je Story (key "us:<id>", Label = gekürzter Titel) + eine Add-Zeile
// (key "us:new"). editor "userstory" routet enter in die US-Form statt scalar-Edit.
func userStoryFields(stories []api.UserStory) []detailField {
	fields := make([]detailField, 0, len(stories)+1)
	for _, us := range stories {
		fields = append(fields, detailField{"us:" + strconv.Itoa(us.ID), truncate(us.Title, 22), "userstory"})
	}
	return append(fields, detailField{"us:new", "+ Add", "userstory"})
}

// issueSections baut die Detail-Sektionen eines Issues in fester Reihenfolge
// (Vorschlag DD2-50): 1=Goal/Beschreibung|PO-Notes, 2=Background/Context,
// 3=Relevant Files, 4=User-Stories, 5=Review. bodyW = Innenbreite der
// Body-Box (Border zieht außen 2 ab — s. renderAccordion). Alle Bodies werden hier
// explizit auf bodyW umgebrochen (kein Auto-Wrap in der Box, #2).
//
// full (DD2-144): true für die editierbaren Detail-Flächen (Backlog/Tree-Fokus) —
// dann sind Background/Context/Relevant-Files/User-Stories IMMER vorhanden (auch
// leer, mit Platzhalter + Edit-Feldern), damit der PO alle Felder nachtragen und
// User-Stories anlegen kann (US-115). false für read-only Previews (Review-Cockpit)
// — dort nur befüllte Sektionen, unverändert.
func (m model) issueSections(it api.Issue, bodyW int, full bool) []accordionSection {
	var secs []accordionSection

	// Sektion 1: zweispaltig — links Goal+Beschreibung, rechts PO-Notes (PO-Wunsch).
	// DD2-135: Section 1 ist PO-wesentlich und IMMER vorhanden; goal + po_notes sind
	// auch leer editierbar (Platzhalter), damit der PO sie nachtragen kann. description
	// (deprecated) wird nur geführt, wenn bereits gesetzt — kein Neu-Anlegen.
	goal, desc, po := deref(it.Goal), deref(it.Description), deref(it.PoNotes)
	{
		gw := gridColWidths(bodyW, 2, []int{3, 2}) // linke Spalte breiter
		var left []string
		var fields []detailField
		left = append(left, wrapText(subhead("Goal", placeholderOr(goal)), gw[0]))
		fields = append(fields, detailField{"goal", "Goal", "text"})
		if desc != "" {
			left = append(left, wrapText(subhead("Description", desc), gw[0]))
			fields = append(fields, detailField{"description", "Description", "text"})
		}
		right := wrapText(subhead("PO-Notes", placeholderOr(po)), gw[1])
		fields = append(fields, detailField{"po_notes", "PO-Notes", "text"})
		body := grid(bodyW, 2,
			gridCell{weight: 3, content: strings.Join(left, "\n\n")},
			gridCell{weight: 2, content: right})
		secs = append(secs, accordionSection{"Goal / Description ∙ PO notes", body, fields})
	}

	// Sektion 2: Background + Context Notes (einspaltig). full → immer editierbar
	// (auch leer, mit Platzhalter), sonst nur wenn befüllt.
	if bg, cn := deref(it.Background), deref(it.ContextNotes); full || bg != "" || cn != "" {
		var parts []string
		var fields []detailField
		if full || bg != "" {
			parts = append(parts, subhead("Background", placeholderOr(bg)))
			fields = append(fields, detailField{"background", "Background", "text"})
		}
		if full || cn != "" {
			parts = append(parts, subhead("Context Notes", placeholderOr(cn)))
			fields = append(fields, detailField{"context_notes", "Context Notes", "text"})
		}
		secs = append(secs, accordionSection{"Background / Context", wrapText(strings.Join(parts, "\n\n"), bodyW), fields})
	}

	// Sektion 3: Relevant Files. full → immer editierbar (auch leer).
	if rf := deref(it.RelevantFiles); full || rf != "" {
		secs = append(secs, accordionSection{"Relevant Files", wrapText(placeholderOr(rf), bodyW),
			[]detailField{{"relevant_files", "Relevant Files", "text"}}})
	}

	// Sektion 4: User-Stories mit Verdikt + QA. full → immer vorhanden inkl.
	// Add-/Edit-Feldern (DD2-144), sonst nur wenn vorhanden (read-only Preview).
	if full || len(it.UserStories) > 0 {
		var b strings.Builder
		if len(it.UserStories) == 0 {
			b.WriteString(theme.Muted.Render("(none yet — enter on + Add)"))
		}
		for _, us := range it.UserStories {
			b.WriteString(usVerdictBox(us.Verdict) + " " + us.Title + "\n")
			if qa := deref(us.QA); qa != "" {
				b.WriteString(theme.Dim.Render("    QA: "+qa) + "\n")
			}
		}
		sec := accordionSection{
			title: fmt.Sprintf("User-Stories (%d)", len(it.UserStories)),
			body:  wrapText(strings.TrimRight(b.String(), "\n"), bodyW)}
		if full {
			sec.fields = userStoryFields(it.UserStories)
		}
		secs = append(secs, sec)
	}

	// Sektion: Subtasks (DD2-197, read-only). Nur wenn vorhanden — Quelle = Lazy-
	// Cache m.subtasks (beim Issue-Fokus geladen). Titel zeigt done/total, Body je
	// Unteraufgabe Status-Glyph + Titel (+ QA, falls gesetzt).
	if subs := m.subtasks[it.ID]; len(subs) > 0 {
		var sb strings.Builder
		done := 0
		for _, st := range subs {
			if st.Status == "done" {
				done++
			}
			sb.WriteString(subtaskGlyph(st.Status) + " " + st.Title + "\n")
			if qa := deref(st.QACriteria); qa != "" {
				sb.WriteString(theme.Dim.Render("    QA: "+qa) + "\n")
			}
		}
		secs = append(secs, accordionSection{
			title: fmt.Sprintf("Subtasks (%d/%d)", done, len(subs)),
			body:  wrapText(strings.TrimRight(sb.String(), "\n"), bodyW)})
	}

	// Sektion 6: Review (read-only). DD2-225: alle Runden als Tabelle (Round/Verdict/
	// Comment), damit bei rejected der PO-Kommentar sichtbar ist (latest-only versteckte
	// ihn bei auto-reopen). Fallback auf das Latest-Verdikt, falls keine Runden geladen.
	if len(it.ReviewRounds) > 0 {
		secs = append(secs, accordionSection{title: "Review", body: reviewRoundsTable(it, bodyW)})
	} else if rs := deref(it.ReviewStatus); rs != "" {
		secs = append(secs, accordionSection{title: "Review",
			body: wrapText(rs+"  "+deref(it.ReviewComment), bodyW)})
	}

	return secs
}

// renderAccordion rendert die Sektions-Header (`> [n] Title`) und klappt die
// offene Sektion (1-basiert, exklusiv) als eingerückten Body darunter auf. Ruhige
// Ein-Ebenen-Darstellung (keine Mantle-Leiste, kein Body-Kasten) — Heading vs.
// Body nur über Chevron + Mauve/Muted-FG + Einrückung unterschieden.
func renderAccordion(secs []accordionSection, open, w int, focus detailFocusView) string {
	if len(secs) == 0 {
		return theme.Dim.Render("(no detail fields)")
	}
	headerStyle := lipgloss.NewStyle().Width(w)
	// DD2-186: lipgloss.Width INKLUDIERT PaddingLeft → bei Width(w-2).PaddingLeft(2)
	// schrumpft die Content-Breite auf w-4, der Body ist aber von issueSections auf
	// bodyW=w-2 vorgewrappt → Overflow/Fehl-Umbruch um 2. Width(w) (= Header-Breite)
	// macht die effektive Content-Breite w-2 == bodyW, der Einzug bleibt 2.
	boxStyle := lipgloss.NewStyle().Width(w).PaddingLeft(2)

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
		return theme.Muted.Render("Fields: (none editable)")
	}
	parts := make([]string, len(fields))
	for i, f := range fields {
		if i == active {
			parts[i] = theme.Accent.Render("▌" + f.label)
		} else {
			parts[i] = theme.Muted.Render(f.label)
		}
	}
	return truncate(theme.Muted.Render("Fields: ")+strings.Join(parts, "  "), w)
}
