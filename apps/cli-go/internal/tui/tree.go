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

func (m model) viewTree() string {
	nodes := m.treeNodes()
	if m.treeCursor >= len(nodes) {
		m.treeCursor = len(nodes) - 1
	}
	if m.treeCursor < 0 {
		m.treeCursor = 0
	}
	w := m.termWidth()
	h := m.bodyHeight()

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
	innerH := h - 2 // Border oben/unten — NICHT via Height() (Golden Rule #1)
	if innerH < 3 {
		innerH = 3
	}

	// Linke Spalte: Baumzeilen, Fenster um den Cursor, auf Höhe auffüllen.
	left := m.treeLeftLines(nodes, lw-2)
	left = windowAround(left, innerH, m.treeCursor)
	for len(left) < innerH {
		left = append(left, "")
	}

	// Rechte Spalte: Detail des selektierten Knotens.
	var sel treeNode
	if len(nodes) > 0 {
		sel = nodes[m.treeCursor]
	}
	detail := strings.Split(m.treeDetail(sel, rw-2), "\n")
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

	hint := "j/k:↑↓  l/→:auf  h/←:zu  t/esc:Ranger  q:quit"
	if m.status != "" {
		hint = m.status
	}
	title := theme.Header.Render(m.screenTitle("Tree+Detail (Prototyp)"))
	return m.header() + "\n" + title + "\n" + body + "\n" + theme.Dim.Render(hint)
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
			lines = append(lines, theme.Accent.Render("▌")+truncate(row, w-1))
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
	switch n.kind {
	case tkMile:
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
		sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
		b.WriteString(theme.Header.Render(sp.Key+" — "+sp.Name) + "\n")
		b.WriteString(theme.Dim.Render("Status: ") + statusText(sp.Status) + "   " +
			theme.Dim.Render("Fortschritt: ") + fmt.Sprintf("%d/%d", sp.DoneCount, sp.ItemCount) + "\n")
		if g := deref(sp.Goal); g != "" {
			b.WriteString("\n" + theme.Accent.Render("Goal:") + "\n" + g + "\n")
		}
	case tkIssue:
		it := m.treeIssues[n.sprintID][n.issIdx]
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
