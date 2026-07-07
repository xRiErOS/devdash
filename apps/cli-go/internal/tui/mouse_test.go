package tui

// DD2-51: Maus-Bedienung. Wheel scrollt (Tree-Cursor / m.scroll), Linksklick setzt
// Cursor (Tree, Y-Mapping) bzw. Pane-Fokus (Ranger-Columns, X-Mapping). Golden #3.

import (
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"
)

func wheel(b tea.MouseButton) tea.MouseMsg {
	return tea.MouseMsg{Button: b, Action: tea.MouseActionPress}
}
func click(x, y int) tea.MouseMsg {
	return tea.MouseMsg{Button: tea.MouseButtonLeft, Action: tea.MouseActionPress, X: x, Y: y}
}

// screenLines rendert die VOLLE View und strippt ANSI je Zeile — echte
// Screen-Geometrie inkl. App-Außenrahmen (outerBorder). Klick-Tests erden sich
// daran statt an der Klick-Formel, sonst sind sie blind für die Off-by-
// Außenrahmen-Falle (DD2-274: alle Split-Klick-Y lagen um 1 daneben).
func screenLines(m model) []string {
	return strings.Split(ansi.Strip(m.View()), "\n")
}

// clickAt sucht substr in der gerenderten View — wahlweise linke (right=false)
// oder rechte (right=true) Pane, gesplittet bei lw — und liefert eine echte
// Klick-Koordinate in der Trefferzeile (X = Token-Start + 1, Y = Zeilenindex).
func clickAt(t *testing.T, m model, substr string, right bool) tea.MouseMsg {
	t.Helper()
	_, _, lw, _, _ := m.treeLayout()
	for y, l := range screenLines(m) {
		i := strings.Index(l, substr)
		if i < 0 {
			continue
		}
		if (i >= lw) != right {
			continue // Treffer in der falschen Pane
		}
		return click(i+1, y)
	}
	t.Fatalf("substr %q nicht in gerenderter View gefunden (right=%v)", substr, right)
	return tea.MouseMsg{}
}

func TestMouseWheelMovesTreeCursor(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true // 3 Knoten: M1, S1, S2
	m.view = viewBrowseProject

	down, _ := m.handleMouse(wheel(tea.MouseButtonWheelDown))
	m = down.(model)
	if m.treeCursor != 1 {
		t.Fatalf("Wheel-Down → cursor=%d, want 1", m.treeCursor)
	}
	up, _ := m.handleMouse(wheel(tea.MouseButtonWheelUp))
	if up.(model).treeCursor != 0 {
		t.Errorf("Wheel-Up → cursor=%d, want 0", up.(model).treeCursor)
	}
}

func TestMouseWheelScrollsDetailBody(t *testing.T) {
	m := treeModel()
	m.view = viewDetailIssue

	down, _ := m.handleMouse(wheel(tea.MouseButtonWheelDown))
	m = down.(model)
	if m.scroll != 3 {
		t.Fatalf("Wheel-Down → scroll=%d, want 3", m.scroll)
	}
	m.scroll = 0
	up, _ := m.handleMouse(wheel(tea.MouseButtonWheelUp))
	if up.(model).scroll != 0 {
		t.Errorf("Wheel-Up an Position 0 → scroll=%d, want 0 (geklemmt)", up.(model).scroll)
	}
}

func TestMouseClickSetsTreeCursor(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true // M1(0) S1(1) S2(2)
	m.view = viewBrowseProject
	m.width, m.height = 90, 22

	// Render-geerdet: Klick auf die S1-Zeile (Sprint DD2#1) in der linken Pane.
	mi, _ := m.handleMouse(clickAt(t, m, "DD2#1", false))
	if got := mi.(model).treeCursor; got != 1 {
		t.Errorf("Klick auf S1-Zeile → cursor=%d, want 1", got)
	}
}

func TestMouseClickRightPaneIgnored(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true
	m.view = viewBrowseProject
	m.width, m.height = 90, 22

	// Klick auf die rechte Detail-Titelzeile (M1) darf den Tree-Cursor NICHT bewegen.
	mi, _ := m.handleMouse(clickAt(t, m, "M1", true))
	if got := mi.(model).treeCursor; got != 0 {
		t.Errorf("Klick rechts sollte Cursor nicht ändern, got %d", got)
	}
}

// DD2-274 D03: Einzelklick auf einen expandierbaren, ZUgeklappten Knoten
// (Meilenstein/Sprint) klappt ihn auf (Klick=expand falls zu). Render-geerdet.
func TestMouseClickExpandsClosedNode(t *testing.T) {
	m := treeModel() // M1 (id1) zu, expandierbar (2 Sprints)
	m.view = viewBrowseProject
	m.width, m.height = 90, 22

	mi, _ := m.handleMouse(clickAt(t, m, "M1", false)) // M1-Zeile, linke Pane
	if !mi.(model).treeExpMile[1] {
		t.Fatalf("Einzelklick auf zugeklappten Meilenstein muss aufklappen (treeExpMile[1] gesetzt)")
	}
}

// DD2-274 D03: Doppelklick auf einen expandierbaren, OFFENEN Knoten klappt ihn
// zu (Doppelklick=collapse falls offen). Clock injiziert (gleiche Zeit → Delta 0).
func TestMouseDoubleClickCollapsesOpenNode(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true // M1 offen
	m.view = viewBrowseProject
	m.width, m.height = 90, 22
	fixed := time.Unix(1000, 0)
	m.clock = func() time.Time { return fixed }

	msg := clickAt(t, m, "M1", false)
	mi, _ := m.handleMouse(msg) // 1. Klick (registriert, M1 bleibt offen)
	m = mi.(model)
	mi2, _ := m.handleMouse(msg) // 2. Klick, gleiche Zeit/Zeile → Doppelklick
	if mi2.(model).treeExpMile[1] {
		t.Fatalf("Doppelklick auf offenen Meilenstein muss zuklappen (treeExpMile[1] gelöscht)")
	}
}

// DD2-274 D03: Einzelklick auf einen OFFENEN Knoten toggelt NICHT sofort (bleibt
// offen) — nur ein Doppelklick klappt zu. Guard gegen Sofort-Toggle.
func TestMouseSingleClickOnOpenNodeStaysOpen(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true // M1 offen
	m.view = viewBrowseProject
	m.width, m.height = 90, 22
	fixed := time.Unix(1000, 0)
	m.clock = func() time.Time { return fixed }

	mi, _ := m.handleMouse(clickAt(t, m, "M1", false)) // isolierter Einzelklick
	if !mi.(model).treeExpMile[1] {
		t.Fatalf("Einzelklick auf offenen Knoten darf NICHT zuklappen")
	}
}

// DD2-274 D02: Klick auf einen ZUgeklappten Accordion-Section-Header in der
// rechten Detail-Pane klappt diese Section auf (accOpen := n). Render-geerdet.
func TestMouseClickAccordionHeaderOpensSection(t *testing.T) {
	m := treeMouseModel()
	m.treeCursor = 2 // Issue DD2-101 (Sections gerendert, full=true)
	m.accOpen = 1    // Section 1 offen, [2] zu
	m.width, m.height = 100, 30

	mi, _ := m.handleMouse(clickAt(t, m, "[2]", true)) // Header Section [2], rechte Pane
	if got := mi.(model).accOpen; got != 2 {
		t.Fatalf("Klick auf Section-[2]-Header sollte Section 2 öffnen, accOpen=%d want 2", got)
	}
}

// DD2-274 D02: Klick auf den Header der bereits OFFENEN Section klappt sie zu
// (Toggle, accOpen := 0) — analog der Zifferntaste.
func TestMouseClickAccordionHeaderClosesOpenSection(t *testing.T) {
	m := treeMouseModel()
	m.treeCursor = 2
	m.accOpen = 1 // Section 1 offen
	m.width, m.height = 100, 30

	mi, _ := m.handleMouse(clickAt(t, m, "[1]", true)) // Header der offenen Section 1
	if got := mi.(model).accOpen; got != 0 {
		t.Fatalf("Klick auf offenen Section-[1]-Header sollte schließen, accOpen=%d want 0", got)
	}
}

func TestMouseIgnoredWhenSearching(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true
	m.view = viewBrowseProject
	m.treeSearching = true // Suche aktiv → Maus inert

	mi, _ := m.handleMouse(wheel(tea.MouseButtonWheelDown))
	if got := mi.(model).treeCursor; got != 0 {
		t.Errorf("bei aktiver Suche sollte Wheel ignoriert werden, cursor=%d", got)
	}
}
