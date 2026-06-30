package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	tea "github.com/charmbracelet/bubbletea"
)

// DD2-193: Ein Issue-Knoten im Project-Browser zeigt Kopf (icon + prio + key) und
// darunter den umgebrochenen Titel als Hängeeinzug unter dem Key.
func TestDD2193IssueTreeBlockShowsTitleUnderKey(t *testing.T) {
	it := api.Issue{Key: "DD2-162", Type: "bug", Priority: 2,
		Title: "Hier steht der Titel eines Issues der auch sauber unter dem Key umbricht"}
	lines := issueTreeBlock(it, "  ", 32)
	if len(lines) < 2 {
		t.Fatalf("erwartet Kopf + ≥1 Titelzeile, got %d: %q", len(lines), lines)
	}
	head := ansi.Strip(lines[0])
	if !strings.Contains(head, "DD2-162") || !strings.Contains(head, "P2") {
		t.Errorf("Kopfzeile ohne Key/Prio: %q", head)
	}
	if strings.Contains(head, "Titel") {
		t.Errorf("Titel gehört NICHT in die Kopfzeile: %q", head)
	}
	body := ansi.Strip(lines[1])
	if !strings.Contains(strings.Join(lines, " "), "Titel") {
		t.Errorf("Titel nicht gerendert:\n%q", lines)
	}
	// Hängeeinzug der Titelzeile beginnt visuell unter dem Key (= Displaybreite des
	// Prefix VOR dem Key). Vergleich in Display-Spalten, nicht Bytes (⯁ ist multibyte).
	keyCol := lipgloss.Width(head[:strings.Index(head, "DD2-162")])
	indentLen := lipgloss.Width(body[:len(body)-len(strings.TrimLeft(body, " "))])
	if indentLen != keyCol {
		t.Errorf("Titel-Einzug %d ≠ Key-Spalte %d (nicht unter dem Key)", indentLen, keyCol)
	}
}

// DD2-193: Maus-Klick auf eine Titel-Folgezeile eines Issue-Blocks selektiert
// trotzdem den Issue-Knoten (block-bewusstes Y→Node-Mapping, kein 1:1-Drift).
func TestDD2193MouseClickMapsBlockAware(t *testing.T) {
	m := treeModel()
	m.view = viewBrowseProject
	m.width, m.height = 120, 30
	m.treeExpMile[1] = true
	m.treeExpSprint[10] = true
	m.treeIssues = map[int][]api.Issue{10: {
		{ID: 100, Key: "DD2-99", Type: "bug", Priority: 1, Status: "to_review",
			Title: "Ein sehr langer Titel der ueber mehrere Zeilen umbricht damit der Block hoch wird"},
	}}
	nodes := m.treeNodes()
	issueIdx := -1
	for i, n := range nodes {
		if n.kind == tkIssue {
			issueIdx = i
			break
		}
	}
	if issueIdx < 0 {
		t.Fatalf("kein Issue-Knoten in nodes: %+v", nodes)
	}

	head, _, lw, _, _ := m.treeLayout()
	firstRowY := lipgloss.Height(head) + 1 + 1 // Header + obere Border + Such-Kopfzeile
	blocks := m.treeLeftBlocks(nodes, lw-2, true)
	acc := 0
	for i := 0; i < issueIdx; i++ {
		acc += len(blocks[i])
	}
	clickY := firstRowY + acc + 1 // +1 = Titel-Folgezeile (nicht der Kopf)

	mi, _ := m.Update(tea.MouseMsg{Action: tea.MouseActionPress, Button: tea.MouseButtonLeft, X: 2, Y: clickY})
	if got := mi.(model).treeCursor; got != issueIdx {
		t.Errorf("Klick auf Titel-Folgezeile → cursor=%d, want %d (Issue-Knoten)", got, issueIdx)
	}
}
