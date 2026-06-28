package tui

// backlog.go — Backlog als Master-Detail (DD2-32). Liste links (neu + geplant ohne
// Sprint), read-only Detail-Preview rechts. Zwei-Pane-Fokus (Liste↔Detail) mit
// Border-Tausch (D03) und Section-Navigation im Detail — dieselben Primitive wie
// der Tree-Detail (detailTitle/metaStrip/renderAccordion/issueSections), kein
// Zweit-Layout (tui-plan.md). Der Inline-Edit-Layer folgt in DD2-74; bis dahin ist
// die Detail-Pane reine Anzeige.

import (
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

// backlogSelected liefert das Issue unter dem Listen-Cursor (bounds-sicher).
func (m model) backlogSelected() *api.Issue {
	if m.blist.cursor < 0 || m.blist.cursor >= len(m.backlog) {
		return nil
	}
	return &m.backlog[m.blist.cursor]
}

// backlogDetailSections sind die navigierbaren Detail-Sektionen des selektierten
// Issues (Single Source = issueSections, kein Drift zur Anzeige). Die Section-Zahl
// hängt nur am Inhalt, nicht an der Breite — die Klemmung braucht nur die Länge.
func (m model) backlogDetailSections() []accordionSection {
	it := m.backlogSelected()
	if it == nil {
		return nil
	}
	return m.issueSections(*it, 60)
}

// backlogLayout liefert Header, lokale Shortcuts und die Pane-Geometrie — analog
// treeLayout (DD2-61), aber ohne Such-Kopfzeile. Single Source für Render.
func (m model) backlogLayout() (head, localKeys string, lw, rw, innerH int) {
	w := m.termWidth()
	head = m.breadcrumb("Backlog")
	hint := "i/k:↑↓  l/→/enter:Detail  j/←:Liste  t:Tags  b/esc:zurück  q:quit"
	if m.blFocus {
		hint = "i/k:Section  1…n:Section  j/←/esc:Liste  t:Tags"
	}
	localKeys = theme.Muted.Render(wrapText(hint, w))
	footH := lipgloss.Height(localKeys) + 1 // + 1 Status-Zeile
	avail := m.height - lipgloss.Height(head) - footH
	if avail < 4 {
		avail = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}
	lw = m.cfg.Layout.TreeWidth // DD2-40: konfigurierbar (layout.tree_width)
	if lw <= 0 {
		lw = 36
	}
	if cap := w * 2 / 5; lw > cap {
		lw = cap
	}
	if lw < 24 {
		lw = 24
	}
	rw = w - lw - 4 // je Pane 2 Border-Spalten
	if rw < 20 {
		rw = 20
	}
	innerH = avail - 2 // Border oben/unten — NICHT via Height() (Golden Rule #1)
	if innerH < 3 {
		innerH = 3
	}
	return
}

// backlogListLines rendert die Issue-Liste (Typ-Icon, Prio, Key, Titel) mit Cursor.
// active=false friert den Cursor ein (Detail-Fokus, D03): Balken bleibt, aber muted.
func (m model) backlogListLines(w int, active bool) []string {
	if len(m.backlog) == 0 {
		return []string{theme.Dim.Render("(leer — neu + geplant ohne Sprint)")}
	}
	lines := make([]string, 0, len(m.backlog))
	for i, it := range m.backlog {
		raw := theme.TypeIcon(it.Type) + " " + theme.Priority(it.Priority) + " " +
			theme.Key.Render(it.Key) + " " + it.Title
		if i == m.blist.cursor {
			plain := truncate(ansi.Strip(raw), w-1)
			if active {
				lines = append(lines, theme.Accent.Render("▌"+plain))
			} else {
				lines = append(lines, theme.Dim.Render("▌"+plain))
			}
		} else {
			lines = append(lines, " "+truncate(raw, w-1))
		}
	}
	return lines
}

// backlogDetail rendert die read-only Detail-Preview des selektierten Issues:
// detailTitle + Meta-Strip + ziffern-Accordion (DD2-50). Bei Detail-Fokus trägt die
// aktive Section den D08-Balken (focus.active).
func (m model) backlogDetail(it api.Issue, w int) string {
	var b strings.Builder
	b.WriteString(detailTitle(it.Key, it.Title, w) + "\n")
	var tags string
	if len(it.Tags) > 0 {
		names := make([]string, len(it.Tags))
		for i, t := range it.Tags {
			names[i] = t.Name
		}
		tags = strings.Join(names, ",")
	}
	b.WriteString(metaStrip([]metaPair{
		{deref(it.Milestone), "milestone"},
		{deref(it.SprintKey), "sprint"},
		{theme.Priority(it.Priority), "prio"},
		{theme.TypeIcon(it.Type) + " " + theme.TypeStyle(it.Type).Render(it.Type), "type"},
		{tags, "tags"},
	}, statusText(it.Status), w))
	b.WriteString("\n\n")
	b.WriteString(theme.Muted.Render("Sections: Ziffer [1..n] öffnet") + "\n")
	secs := m.issueSections(it, w-2)
	focus := detailFocusView{active: m.blFocus, level: 0, sec: m.blSec}
	b.WriteString(renderAccordion(secs, m.blAccOpen, w, focus))
	return b.String()
}

// viewBacklog rendert das Master-Detail-Backlog: Liste links, Detail-Preview rechts,
// fokussierter Pane Mauve-umrandet (D03). Spiegelt die Geometrie von viewTree.
func (m model) viewBacklog() string {
	head, localKeys, lw, rw, innerH := m.backlogLayout()

	// Linke Pane: Issue-Liste, gefenstert um den Cursor.
	listLines := windowAround(m.backlogListLines(lw-2, !m.blFocus), innerH, m.blist.cursor)
	left := append([]string{}, listLines...)
	for len(left) < innerH {
		left = append(left, "")
	}

	// Rechte Pane: read-only Detail des selektierten Issues.
	var detailStr string
	if it := m.backlogSelected(); it != nil {
		detailStr = m.backlogDetail(*it, rw-2)
	} else {
		detailStr = theme.Dim.Render("(nichts gewählt)")
	}
	detail := strings.Split(detailStr, "\n")
	for i := range detail {
		detail[i] = truncate(detail[i], rw-2)
	}
	if len(detail) > innerH {
		detail = detail[:innerH]
	}
	for len(detail) < innerH {
		detail = append(detail, "")
	}

	// D03: Pane-Border-Tausch — der fokussierte Pane ist Mauve, der andere Overlay.
	leftCol, rightCol := paneBorderColors(m.blFocus)
	leftBox := lipgloss.NewStyle().Width(lw).
		Border(lipgloss.RoundedBorder()).BorderForeground(leftCol).
		Render(strings.Join(left, "\n"))
	rightBox := lipgloss.NewStyle().Width(rw).
		Border(lipgloss.RoundedBorder()).BorderForeground(rightCol).
		Render(strings.Join(detail, "\n"))
	body := lipgloss.JoinHorizontal(lipgloss.Top, leftBox, rightBox)

	status := m.statusBar("") // Zone 4: Split-Status (Info blau | Fehler rot)
	return head + "\n" + body + "\n" + localKeys + "\n" + status
}

// keyBacklog steuert das Master-Detail-Backlog. Listen-Fokus: i/k bewegt den Cursor,
// l/→/enter geht in die Detail-Pane, b/esc zurück zur Quell-View. Detail-Fokus läuft
// über keyBacklogDetail.
func (m model) keyBacklog(k string) (tea.Model, tea.Cmd) {
	if m.blFocus {
		return m.keyBacklogDetail(k)
	}
	switch navKey(k) {
	case "up":
		m.blist.move(-1)
		m.blSec, m.blAccOpen = 0, 1 // Auswahl gewechselt → Detail zurücksetzen
		return m, nil
	case "down":
		m.blist.move(1)
		m.blSec, m.blAccOpen = 0, 1
		return m, nil
	case "right": // l/→ : in die Detail-Pane (D01)
		if m.backlogSelected() != nil {
			m.blFocus = true
			m.blSec, m.blAccOpen = 0, 1
		}
		return m, nil
	}
	switch k {
	case "enter":
		if m.backlogSelected() != nil {
			m.blFocus = true
			m.blSec, m.blAccOpen = 0, 1
		}
	case "b", "esc":
		m.view = m.topReturn // zurück zur Quell-View (Tree/Columns, DD2-61)
		m.blFocus = false
	}
	return m, nil
}

// keyBacklogDetail steuert die Detail-Pane im Fokus (DD2-32, read-only): i/k über die
// Sektionen (die offene Accordion-Section folgt dem Cursor), Ziffer-Sprung, j/←/esc
// zurück zur Liste. enter/Edit folgt in DD2-74.
func (m model) keyBacklogDetail(k string) (tea.Model, tea.Cmd) {
	secs := m.backlogDetailSections()
	n := len(secs)
	if m.blSec >= n {
		m.blSec = maxInt(n-1, 0)
	}
	if m.blSec < 0 {
		m.blSec = 0
	}

	// Ziffer 1..n = Direktsprung in die Section (öffnet sie).
	if len(k) == 1 && k[0] >= '1' && k[0] <= '9' {
		if d := int(k[0] - '0'); d <= n {
			m.blSec, m.blAccOpen = d-1, d
		}
		return m, nil
	}

	switch navKey(k) {
	case "down":
		if m.blSec < n-1 {
			m.blSec++
			m.blAccOpen = m.blSec + 1
		}
		return m, nil
	case "up":
		if m.blSec > 0 {
			m.blSec--
			m.blAccOpen = m.blSec + 1
		}
		return m, nil
	case "left": // j/← : zurück zur Liste
		m.blFocus = false
		return m, nil
	}
	switch k {
	case "esc":
		m.blFocus = false
	case "t": // DD2-33: Tag-Picker fürs fokussierte Issue (Konsistenz mit Tree)
		if it := m.backlogSelected(); it != nil {
			return m.openTagPicker("issue", it.ID, it.Key+" "+it.Title, it.Tags)
		}
	}
	return m, nil
}
