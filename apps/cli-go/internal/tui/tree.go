package tui

// tree.go — Tree+Detail-Layout-Prototyp (DD2-57). Vergleichs-Kandidat zum
// Ranger-Columns-Layout: EINE schmale linke Baum-Spalte (Meilenstein→Sprint→
// Issue, kollabierbar, Pfeiltasten-Nav) zeigt die ganze Hierarchie auf einmal;
// rechts bleibt breite Detail-Fläche. Umschalten aus den Columns mit 't'.
// Bewusst self-contained (leicht vergleichbar/entfernbar). Golden Rule #1:
// Pane-Höhe über Content-Füllung, kein Height() auf bordered Style.

import (
	"fmt"
	"strings"

	"devd-cli/internal/clip"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

type treeKind int

const (
	tkMile treeKind = iota
	tkSprint
	tkIssue
	tkInfo // Platzhalter: (lädt …) / (keine Issues)
)

// treeNode ist eine sichtbare (geflachte) Zeile des Baums. Index-Referenzen statt
// Pointer, damit das Value-Receiver-Modell sauber bleibt.
type treeNode struct {
	kind     treeKind
	mileIdx  int
	sprIdx   int
	sprintID int
	issIdx   int
	depth    int
	expand   bool // ist auf-/zuklappbar?
	open     bool
	label    string // nur tkInfo
}

// treeMatch ist der case-insensitive Substring-Test der Tree-Suche (DD2-62).
func treeMatch(s, q string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(q))
}

// treeNodes flacht den Baum entsprechend der Expansions-Sets in eine sichtbare
// Zeilenliste. Issues werden lazy aus treeIssues[sprintID] gezogen. Bei aktiver
// Suche (treeQuery) ersetzt die Filter-Flachung die Expansions-Logik.
func (m *model) treeNodes() []treeNode {
	if strings.TrimSpace(m.treeQuery) != "" {
		return m.treeNodesFiltered(strings.TrimSpace(m.treeQuery))
	}
	var nodes []treeNode
	for mi := range m.milestones {
		ms := &m.milestones[mi]
		nodes = append(nodes, treeNode{kind: tkMile, mileIdx: mi, depth: 0,
			expand: len(ms.Sprints) > 0, open: m.treeExpMile[ms.ID]})
		if !m.treeExpMile[ms.ID] {
			continue
		}
		for si := range ms.Sprints {
			sp := &ms.Sprints[si]
			nodes = append(nodes, treeNode{kind: tkSprint, mileIdx: mi, sprIdx: si,
				sprintID: sp.ID, depth: 1, expand: true, open: m.treeExpSprint[sp.ID]})
			if !m.treeExpSprint[sp.ID] {
				continue
			}
			items, ok := m.treeIssues[sp.ID]
			if !ok {
				nodes = append(nodes, treeNode{kind: tkInfo, depth: 2, label: "(lädt …)"})
				continue
			}
			if len(items) == 0 {
				nodes = append(nodes, treeNode{kind: tkInfo, depth: 2, label: "(keine Issues)"})
				continue
			}
			for ii := range items {
				nodes = append(nodes, treeNode{kind: tkIssue, mileIdx: mi, sprIdx: si,
					sprintID: sp.ID, issIdx: ii, depth: 2})
			}
		}
	}
	return nodes
}

// viewTree rendert den Primat-View (DD2-61): schmale Baum-Spalte links, breite
// Detail-Fläche rechts. Teilt sich Chrome mit den anderen Screens — globaler
// Header (Breadcrumb `> slug: Title` + globale Shortcuts), Zwei-Pane-Body auf
// volle Resthöhe, Footer = lokale Shortcuts + Split-Status (Info blau | Fehler
// rot). Höhen-Rechnung 1:1 wie chrome(), damit der Footer unten klebt.
// treeNodesFiltered zeigt nur Pfade zu Treffern (DD2-62). Eine Ebene ist sichtbar,
// wenn sie selbst matcht ODER ein sichtbarer Nachfahre matcht; matchende Issues
// werden gelistet, ein Meilenstein-Treffer zeigt seine Sprints als Kontext. Lazy:
// nur gecachte Sprint-Issues (treeIssues) sind durchsuchbar — open/expand spielt
// keine Rolle, der gefilterte Baum ist immer „aufgeklappt".
func (m *model) treeNodesFiltered(q string) []treeNode {
	var nodes []treeNode
	for mi := range m.milestones {
		ms := &m.milestones[mi]
		msMatch := treeMatch(ms.Name, q)
		var subs []treeNode
		for si := range ms.Sprints {
			sp := &ms.Sprints[si]
			spMatch := treeMatch(sp.Key+" "+sp.Name, q)
			var iss []treeNode
			if items, ok := m.treeIssues[sp.ID]; ok {
				for ii := range items {
					it := items[ii]
					if treeMatch(it.Key+" "+it.Title, q) {
						iss = append(iss, treeNode{kind: tkIssue, mileIdx: mi, sprIdx: si,
							sprintID: sp.ID, issIdx: ii, depth: 2})
					}
				}
			}
			if spMatch || len(iss) > 0 || msMatch {
				subs = append(subs, treeNode{kind: tkSprint, mileIdx: mi, sprIdx: si,
					sprintID: sp.ID, depth: 1, expand: true, open: true})
				subs = append(subs, iss...)
			}
		}
		if msMatch || len(subs) > 0 {
			nodes = append(nodes, treeNode{kind: tkMile, mileIdx: mi, depth: 0,
				expand: len(ms.Sprints) > 0, open: true})
			nodes = append(nodes, subs...)
		}
	}
	return nodes
}

// treeLayout liefert Header, lokale Shortcuts und die Pane-Geometrie des Primat-
// Views (DD2-61). Single Source für Render (viewTree) UND Maus-Klick-Mapping
// (handleMouse, DD2-51) — sonst driften Render-Zeilen und Klick-Y auseinander.
func (m model) treeLayout() (head, localKeys string, lw, rw, innerH int) {
	w := m.termWidth()
	head = m.breadcrumb("Projekt-Browser") // Zone 1: `> slug: Title` + globale Shortcuts
	// Zone 3 = NUR view-spezifische Tasten; globale (b/R/p/q/Cmd) stehen bereits im
	// Header rechts → nicht doppeln (verwirrt, PO-Befund Augenschein).
	hint := "j/k:↑↓  l/→:auf  h/←:zu  s:Status  S:Meilenstein  d:löschen  y:yank  /:Suche  t:Ranger"
	switch {
	case m.treeSearching:
		hint = "tippen: filtern   enter: übernehmen   esc: abbrechen"
	case m.treeQuery != "":
		hint = "j/k:↑↓  l/→:auf  s:Status  d:löschen  /:Suche  esc: Filter löschen  t:Ranger"
	}
	localKeys = theme.Muted.Render(wrapText(hint, w)) // Zone 3: lokale Shortcuts
	footH := lipgloss.Height(localKeys) + 1           // + 1 Status-Zeile (Split-Status)
	avail := m.height - lipgloss.Height(head) - footH
	if avail < 4 {
		avail = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}
	lw = 36 // schmale Baum-Spalte
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

func (m model) viewTree() string {
	nodes := m.treeNodes()
	if m.treeCursor >= len(nodes) {
		m.treeCursor = len(nodes) - 1
	}
	if m.treeCursor < 0 {
		m.treeCursor = 0
	}
	head, localKeys, lw, rw, innerH := m.treeLayout()

	// Linke Spalte: Such-/Filterbox als Kopfzeile (DD2-62), darunter die Baumzeilen
	// gefenstert um den Cursor. Die Kopfzeile kostet 1 Zeile der Innenhöhe.
	searchLine := m.treeSearchLine(lw - 2)
	treeLines := m.treeLeftLines(nodes, lw-2)
	treeLines = windowAround(treeLines, innerH-1, m.treeCursor)
	left := append([]string{searchLine}, treeLines...)
	for len(left) < innerH {
		left = append(left, "")
	}

	// Rechte Spalte: Detail des selektierten Knotens. Bei leerer Knotenliste
	// (Daten noch nicht geladen, da viewTree Primat-Default ist) NICHT auf die
	// Zero-treeNode{} fallen — die wäre kind=tkMile/mileIdx=0 und würde
	// m.milestones[0] auf leerer Slice greifen (Panic). Platzhalter stattdessen.
	var detailStr string
	if len(nodes) > 0 {
		detailStr = m.treeDetail(nodes[m.treeCursor], rw-2)
	} else {
		detailStr = theme.Dim.Render("(lädt … — l/→ klappt auf)")
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

	leftBox := lipgloss.NewStyle().Width(lw).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Render(strings.Join(left, "\n"))
	rightBox := lipgloss.NewStyle().Width(rw).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Overlay).
		Render(strings.Join(detail, "\n"))
	body := lipgloss.JoinHorizontal(lipgloss.Top, leftBox, rightBox)

	status := m.statusBar("") // Zone 4: Split-Status (Info blau | Fehler rot)
	return head + "\n" + body + "\n" + localKeys + "\n" + status
}

// treeLeftLines rendert die Baumzeilen (mit Expand-Marker, Einrückung, Cursor).
// Der Cursor wird per absolutem Index gesetzt, bevor windowAround fenstert.
func (m model) treeLeftLines(nodes []treeNode, w int) []string {
	lines := make([]string, 0, len(nodes))
	for i, n := range nodes {
		marker := "  "
		if n.expand {
			if n.open {
				marker = "▾ "
			} else {
				marker = "▸ "
			}
		}
		var label string
		switch n.kind {
		case tkMile:
			ms := m.milestones[n.mileIdx]
			label = statusDot(ms.Status) + " " + ms.Name
		case tkSprint:
			sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
			label = sp.Key + " " + statusText(sp.Status)
		case tkIssue:
			it := m.treeIssues[n.sprintID][n.issIdx]
			label = theme.TypeIcon(it.Type) + " " + theme.Key.Render(it.Key)
		case tkInfo:
			label = theme.Dim.Render(n.label)
		}
		row := strings.Repeat("  ", n.depth) + marker + label
		if i == m.treeCursor {
			// D08: Cursor = Balken ▌ + ganze Zeile in Akzentfarbe getönt. Eigen-Farben
			// der Zelle (Status-Dot, Key, Typ-Icon) werden gestrippt und einheitlich
			// in Akzent umgefärbt — die Selektion ist als Ganzes erkennbar.
			plain := truncate(ansi.Strip(row), w-1)
			lines = append(lines, theme.Accent.Render("▌"+plain))
		} else {
			lines = append(lines, " "+truncate(row, w-1))
		}
	}
	return lines
}

// treeDetail rendert die rechte Detail-Fläche für den selektierten Knoten —
// breit, der eigentliche Mehrwert des Layouts (Platz für Felder/Accordion).
func (m model) treeDetail(n treeNode, w int) string {
	var b strings.Builder
	// Bounds-Guard (gleiche Fehlerklasse wie der leere-Knotenliste-Fall): Indizes
	// auf stale/leere Slices nie blind dereferenzieren — sonst Panic im View.
	switch n.kind {
	case tkMile:
		if n.mileIdx < 0 || n.mileIdx >= len(m.milestones) {
			return theme.Dim.Render("(nichts gewählt)")
		}
		ms := m.milestones[n.mileIdx]
		b.WriteString(theme.Header.Render(ms.Name) + "\n")
		b.WriteString(theme.Dim.Render("Status: ") + statusText(ms.Status) + "   " +
			theme.Dim.Render("Fortschritt: ") + fmt.Sprintf("%d/%d", ms.Done, ms.Total) + "\n")
		if d := deref(ms.TargetDate); d != "" {
			b.WriteString(theme.Dim.Render("Ziel: ") + d + "\n")
		}
		if d := deref(ms.Description); d != "" {
			b.WriteString("\n" + d + "\n")
		}
		b.WriteString("\n" + theme.Dim.Render(fmt.Sprintf("Sprints (%d)", len(ms.Sprints))) + "\n")
	case tkSprint:
		if n.mileIdx < 0 || n.mileIdx >= len(m.milestones) ||
			n.sprIdx < 0 || n.sprIdx >= len(m.milestones[n.mileIdx].Sprints) {
			return theme.Dim.Render("(nichts gewählt)")
		}
		sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
		b.WriteString(theme.Header.Render(sp.Key+" — "+sp.Name) + "\n")
		b.WriteString(theme.Dim.Render("Status: ") + statusText(sp.Status) + "   " +
			theme.Dim.Render("Fortschritt: ") + fmt.Sprintf("%d/%d", sp.DoneCount, sp.ItemCount) + "\n")
		if g := deref(sp.Goal); g != "" {
			b.WriteString("\n" + theme.Accent.Render("Goal:") + "\n" + g + "\n")
		}
	case tkIssue:
		items := m.treeIssues[n.sprintID]
		if n.issIdx < 0 || n.issIdx >= len(items) {
			return theme.Dim.Render("(nichts gewählt)")
		}
		it := items[n.issIdx]
		b.WriteString(theme.Header.Render(it.Title) + "\n")
		b.WriteString(theme.TypeIcon(it.Type) + " " + theme.TypeStyle(it.Type).Render(it.Type) +
			" · " + theme.Priority(it.Priority) + " · " + statusText(it.Status) + "\n")
		field := func(label, val string) {
			if strings.TrimSpace(val) != "" {
				b.WriteString("\n" + theme.Accent.Render(label+":") + "\n" + val + "\n")
			}
		}
		field("Goal", deref(it.Goal))
		field("Background", deref(it.Background))
		field("Beschreibung", deref(it.Description))
	default:
		b.WriteString(theme.Dim.Render("(nichts gewählt — l/→ klappt auf)"))
	}
	return b.String()
}

// windowStart berechnet den Fenster-Anfang so, dass cursor sichtbar bleibt —
// geteilt von windowAround (Render) und handleMouse (Klick-Y→Zeilenindex, DD2-51).
func windowStart(n, height, cursor int) int {
	if n <= height {
		return 0
	}
	start := cursor - height/2
	if start < 0 {
		start = 0
	}
	if start+height > n {
		start = n - height
	}
	return start
}

// windowAround fenstert lines auf height Zeilen so, dass cursor sichtbar bleibt.
func windowAround(lines []string, height, cursor int) []string {
	if len(lines) <= height {
		return lines
	}
	start := windowStart(len(lines), height, cursor)
	return lines[start : start+height]
}

// keyTree steuert den Primat-View. Bei aktiver Suche (treeSearching) fließen alle
// Tasten ins Suchfeld (live-Filter), bis enter (übernehmen) oder esc (abbrechen).
func (m model) keyTree(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.treeSearching {
		return m.keyTreeSearch(msg)
	}
	nodes := m.treeNodes()
	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "/": // DD2-62: Suchfeld öffnen, mit aktuellem Filter vorbelegen
		m.treeSearching = true
		m.treeSearch.SetValue(m.treeQuery)
		m.treeSearch.CursorEnd()
		m.treeSearch.Focus()
		return m, textinput.Blink
	case "t":
		m.view = viewColumns
		m.status = ""
		return m, nil
	case "esc":
		if m.treeQuery != "" { // erst den aktiven Filter löschen, dann Ranger
			m.treeQuery = ""
			m.treeSearch.SetValue("")
			m.treeCursor = 0
			return m, nil
		}
		m.view = viewColumns
		m.status = ""
		return m, nil
	case "p": // Projekt-Switch — keyTree fängt vor dem globalen Switch, drum hier wiren
		if m.global != nil {
			m.view = viewPicker
			return m, loadProjects(m.global)
		}
		return m, nil
	case "R": // Reviews-Liste — analog, sonst im Tree verschluckt
		return m.openReviewsList()
	case "b": // Backlog — analog
		return m.openBacklog()
	case "S": // Meilenstein-Status (1:1 Ranger) — nur auf Meilenstein-Knoten
		if m.treeCursor < len(nodes) {
			if n := nodes[m.treeCursor]; n.kind == tkMile {
				return m.openMilestoneStatusFor(&m.milestones[n.mileIdx])
			}
		}
		return m, nil
	case "s": // Sprint-Status (Sprint-Knoten) / Issue-Status (Issue-Knoten), 1:1 Ranger
		if m.treeCursor < len(nodes) {
			n := nodes[m.treeCursor]
			switch n.kind {
			case tkSprint:
				sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
				return m.openSprintStatus(sp.ID, sp.Status)
			case tkIssue:
				it := m.treeIssues[n.sprintID][n.issIdx]
				return m.openIssueStatus(&it, n.sprintID)
			}
		}
		return m, nil
	case "d": // Cascade-Delete (1:1 Ranger) — Meilenstein/Sprint
		if m.treeCursor < len(nodes) {
			n := nodes[m.treeCursor]
			switch n.kind {
			case tkMile:
				ms := m.milestones[n.mileIdx]
				return m.openDelete("milestone", ms.ID, ms.Name)
			case tkSprint:
				sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
				return m.openDelete("sprint", sp.ID, sp.Name)
			}
		}
		return m, nil
	case "y": // Kontext yanken (1:1 Ranger) — Meilenstein/Sprint
		return m.treeYank(nodes)
	}
	switch navKey(msg.String()) {
	case "up":
		if m.treeCursor > 0 {
			m.treeCursor--
		}
		return m, nil
	case "down":
		if m.treeCursor < len(nodes)-1 {
			m.treeCursor++
		}
		return m, nil
	case "right":
		return m.treeExpand(nodes)
	case "left":
		return m.treeCollapse(nodes)
	}
	if msg.String() == "enter" {
		return m.treeExpand(nodes)
	}
	return m, nil
}

// treeYank kopiert den Kontext des selektierten Knotens (1:1 Ranger-yankContext):
// Meilenstein → Sprints-Übersicht, Sprint → Issues-Übersicht.
func (m model) treeYank(nodes []treeNode) (tea.Model, tea.Cmd) {
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil
	}
	n := nodes[m.treeCursor]
	switch n.kind {
	case tkMile:
		ms := m.milestones[n.mileIdx]
		if err := clip.Copy(milestoneClip(&ms)); err != nil {
			m.errNote = "Clipboard-Fehler: " + err.Error()
		} else {
			m.errNote = ""
			m.status = "Meilenstein-Kontext kopiert (" + ms.Name + ")"
		}
	case tkSprint:
		sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
		src := &sp
		if m.curSprint != nil && m.curSprint.ID == sp.ID {
			src = m.curSprint
		}
		if err := clip.Copy(sprintClip(src)); err != nil {
			m.errNote = "Clipboard-Fehler: " + err.Error()
		} else {
			m.errNote = ""
			m.status = "Sprint-Kontext kopiert (" + sp.Key + ")"
		}
	default:
		m.status = "Yank: auf Meilenstein oder Sprint"
	}
	return m, nil
}

// keyTreeSearch behandelt die aktive Tree-Suche (DD2-62): tippen filtert live,
// enter übernimmt den Filter (Feld blurt, Filter bleibt aktiv), esc bricht ab und
// löscht den Filter. Cursor springt bei jeder Filteränderung auf 0.
func (m model) keyTreeSearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		m.treeQuery = strings.TrimSpace(m.treeSearch.Value())
		m.treeSearching = false
		m.treeSearch.Blur()
		m.treeCursor = 0
		return m, nil
	case tea.KeyEsc:
		m.treeSearching = false
		m.treeSearch.Blur()
		m.treeSearch.SetValue("")
		m.treeQuery = ""
		m.treeCursor = 0
		return m, nil
	}
	var cmd tea.Cmd
	m.treeSearch, cmd = m.treeSearch.Update(msg)
	m.treeQuery = strings.TrimSpace(m.treeSearch.Value()) // live-Filter
	m.treeCursor = 0
	return m, cmd
}

// treeSearchLine rendert den Tree-Kopf (DESIGN „Such-/Filterbox"): Shield + Status.
// Inaktiv = Hint, Eingabe aktiv = Suchfeld, Filter gesetzt = Shield+Query rot.
func (m model) treeSearchLine(w int) string {
	const shield = "⛨"
	if m.treeSearching {
		return truncate(shield+" "+m.treeSearch.View(), w)
	}
	if m.treeQuery != "" {
		return truncate(lipgloss.NewStyle().Foreground(theme.Red).Render(shield+" "+m.treeQuery), w)
	}
	return truncate(theme.Muted.Render(shield+" Suchen mit /"), w)
}

// treeExpand klappt den Knoten unter dem Cursor auf; bei Sprints werden die
// Issues lazy nachgeladen (sprintMsg füllt treeIssues).
func (m model) treeExpand(nodes []treeNode) (tea.Model, tea.Cmd) {
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil
	}
	n := nodes[m.treeCursor]
	switch n.kind {
	case tkMile:
		m.treeExpMile[m.milestones[n.mileIdx].ID] = true
	case tkSprint:
		sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
		m.treeExpSprint[sp.ID] = true
		if _, ok := m.treeIssues[sp.ID]; !ok {
			m.status = "lädt Issues …"
			return m, loadSprint(m.client, sp.ID)
		}
	}
	return m, nil
}

// treeCollapse klappt den Knoten (bzw. dessen Eltern-Sprint bei Issues) zu.
func (m model) treeCollapse(nodes []treeNode) (tea.Model, tea.Cmd) {
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil
	}
	n := nodes[m.treeCursor]
	switch n.kind {
	case tkMile:
		delete(m.treeExpMile, m.milestones[n.mileIdx].ID)
	case tkSprint, tkIssue:
		delete(m.treeExpSprint, m.milestones[n.mileIdx].Sprints[n.sprIdx].ID)
	}
	nn := m.treeNodes()
	if m.treeCursor >= len(nn) {
		m.treeCursor = len(nn) - 1
	}
	if m.treeCursor < 0 {
		m.treeCursor = 0
	}
	return m, nil
}
