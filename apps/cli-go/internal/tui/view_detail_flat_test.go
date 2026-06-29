package tui

// DD2-78: Meilenstein/Sprint-Detail als flache, fokussierbare Feldliste (D09).
// Einstufiger Feld-Fokus (kein Accordion, keine Section-Ebene): i/k bewegt direkt
// zwischen den Feldern, Ziffer springt, h/← und esc geben den Fokus an den Tree.

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// Feld-Sets spiegeln die Update-Contracts (milestoneUpdateContract/sprintUpdateContract).
func TestMilestoneSprintFieldSets(t *testing.T) {
	keys := func(fs []detailField) string {
		out := make([]string, len(fs))
		for i, f := range fs {
			out[i] = f.key
		}
		return strings.Join(out, ",")
	}
	if got := keys(milestoneFields()); got != "name,description,target_date,documents" {
		t.Errorf("milestoneFields=%s, want name,description,target_date,documents", got)
	}
	if got := keys(sprintFields()); got != "name,goal,documents" {
		t.Errorf("sprintFields=%s, want name,goal,documents", got)
	}
}

// enter auf einem Meilenstein landet einstufig auf der Feld-Ebene; i/k bewegt den
// fieldCursor über die 3 Felder, geklemmt.
func TestFlatFieldNavMilestone(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 0 // Meilenstein
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if !m.detailFocus || m.detailLevel != 1 {
		t.Fatalf("enter → detailFocus=%v level=%d, want true/1", m.detailFocus, m.detailLevel)
	}
	mi, _ = m.keyTree(key("k")) // Feld 1
	m = mi.(model)
	if m.fieldCursor != 1 {
		t.Errorf("k → fieldCursor=%d, want 1", m.fieldCursor)
	}
	mi, _ = m.keyTree(key("k"))
	m = mi.(model)
	mi, _ = m.keyTree(key("k")) // DD2-169: 4 Felder (name/desc/target/documents) → Index 3
	m = mi.(model)
	if m.fieldCursor != 3 {
		t.Errorf("k geklemmt → fieldCursor=%d, want 3", m.fieldCursor)
	}
	mi, _ = m.keyTree(key("i")) // hoch
	m = mi.(model)
	if m.fieldCursor != 2 {
		t.Errorf("i → fieldCursor=%d, want 2", m.fieldCursor)
	}
}

// enter auf einem Sprint → flache 2-Feld-Liste (name/goal).
func TestFlatFieldNavSprint(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 1 // Sprint s10
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if !m.detailFocus || m.detailLevel != 1 {
		t.Fatalf("enter auf Sprint → detailFocus=%v level=%d, want true/1", m.detailFocus, m.detailLevel)
	}
	mi, _ = m.keyTree(key("k"))
	m = mi.(model)
	mi, _ = m.keyTree(key("k")) // DD2-169: 3 Felder (name/goal/documents) → Index 2
	m = mi.(model)
	if m.fieldCursor != 2 {
		t.Errorf("k (3 Felder) → fieldCursor=%d, want 2", m.fieldCursor)
	}
}

// h/← und esc geben den Fokus an den Tree zurück (flach: keine Section-Ebene).
func TestFlatExitToTree(t *testing.T) {
	for _, k := range []string{"j", "esc"} {
		m := detailFocusModel()
		m.treeCursor = 0
		mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
		var msg tea.KeyMsg
		if k == "esc" {
			msg = tea.KeyMsg{Type: tea.KeyEsc}
		} else {
			msg = key(k)
		}
		mi, _ = mi.(model).keyTree(msg)
		if mi.(model).detailFocus {
			t.Errorf("%q sollte den Detail-Fokus verlassen (flach → Tree)", k)
		}
	}
}

// Ziffer springt direkt auf das n-te Feld.
func TestFlatDigitJump(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 0
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("3")) // drittes Feld (target_date)
	if fc := mi.(model).fieldCursor; fc != 2 {
		t.Errorf("Ziffer 3 → fieldCursor=%d, want 2", fc)
	}
}

// DD2-78: das Meilenstein-Detail rendert die Felder als flache Liste (Labels), und
// das aktive Feld trägt bei Detail-Fokus den D08-Balken ▌.
func TestFlatRenderMilestoneFields(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := detailFocusModel()
	m.treeCursor = 0
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("k")) // fieldCursor → 1 (Beschreibung)
	m = mi.(model)

	node := m.treeNodes()[0]
	raw := m.treeDetail(node, 60)
	out := ansi.Strip(raw)
	for _, lbl := range []string{"Name", "Description", "Target date"} {
		if !strings.Contains(out, lbl) {
			t.Errorf("flache Liste fehlt Label %q: %q", lbl, out)
		}
	}
	// Der D08-Balken steht an der aktiven Zeile (Beschreibung), nicht woanders.
	var barLine string
	for _, l := range strings.Split(out, "\n") {
		if strings.Contains(l, "▌") {
			barLine = l
		}
	}
	if !strings.Contains(barLine, "Description") {
		t.Errorf("D08-Balken nicht an aktivem Feld 'Beschreibung': %q", barLine)
	}
}

// Ohne Detail-Fokus kein D08-Balken in der flachen Liste (Regression).
func TestFlatRenderNoBarWithoutFocus(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := detailFocusModel()
	m.treeCursor = 0 // Meilenstein, KEIN Detail-Fokus
	out := ansi.Strip(m.treeDetail(m.treeNodes()[0], 60))
	if strings.Contains(out, "▌") {
		t.Errorf("ohne Detail-Fokus kein D08-Balken erwartet: %q", out)
	}
}
