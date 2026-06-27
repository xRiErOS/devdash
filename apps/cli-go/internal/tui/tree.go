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

	"devd-cli/internal/theme"
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

// treeNodes flacht den Baum entsprechend der Expansions-Sets in eine sichtbare
// Zeilenliste. Issues werden lazy aus treeIssues[sprintID] gezogen.
func (m *model) treeNodes() []treeNode {
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
func (m model) viewTree() string {
	nodes := m.treeNodes()
	if m.treeCursor >= len(nodes) {
		m.treeCursor = len(nodes) - 1
	}
	if m.treeCursor < 0 {
		m.treeCursor = 0
	}
	w := m.termWidth()

	head := m.breadcrumb("Projekt-Browser") // Zone 1: `> slug: Title` + globale Shortcuts
	// Zone 3 = NUR view-spezifische Tasten; globale (b/R/p/q/Cmd) stehen bereits im
	// Header rechts → nicht doppeln (verwirrt, PO-Befund Augenschein).
	hint := "j/k:↑↓  l/→:auf  h/←:zu  enter:auf  t:Ranger"
	localKeys := theme.Muted.Render(wrapText(hint, w)) // Zone 3: lokale Shortcuts
	footH := lipgloss.Height(localKeys) + 1            // + 1 Status-Zeile (Split-Status)
	avail := m.height - lipgloss.Height(head) - footH
	if avail < 4 {
		avail = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}

	lw := 36 // schmale Baum-Spalte
	if cap := w * 2 / 5; lw > cap {
		lw = cap
	}
	if lw < 24 {
		lw = 24
	}
	rw := w - lw - 4 // je Pane 2 Border-Spalten
	if rw < 20 {
		rw = 20
	}
	innerH := avail - 2 // Border oben/unten — NICHT via Height() (Golden Rule #1)
	if innerH < 3 {
		innerH = 3
	}

	// Linke Spalte: Baumzeilen, Fenster um den Cursor, auf Höhe auffüllen.
	left := m.treeLeftLines(nodes, lw-2)
	left = windowAround(left, innerH, m.treeCursor)
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

// windowAround fenstert lines auf height Zeilen so, dass cursor sichtbar bleibt.
func windowAround(lines []string, height, cursor int) []string {
	if len(lines) <= height {
		return lines
	}
	start := cursor - height/2
	if start < 0 {
		start = 0
	}
	if start+height > len(lines) {
		start = len(lines) - height
	}
	return lines[start : start+height]
}

// keyTree steuert den Tree+Detail-Prototyp.
func (m model) keyTree(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	nodes := m.treeNodes()
	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "t", "esc":
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
