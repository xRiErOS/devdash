package tui

// DD2-196: Meilenstein/Sprint-Detail nutzt jetzt dasselbe zwei-stufige Accordion
// wie das Issue (Overview-Kopf + ziffern-toggelbare Sektionen). Diese Tests prüfen
// die Section-Navigation, den Digit-Sprung und das Rendering (muted empty + Child-
// Tabelle). D09 (frühere Flachliste) durch DD2-196 abgelöst.

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

// enter auf einem Meilenstein landet zweistufig auf der Übersicht (Section-Ebene,
// Accordion zu). k bewegt den secCursor über die Sektionen, die offene Section folgt.
func TestMilestoneAccordionSectionNav(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 0 // Meilenstein
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if !m.detailFocus || m.detailLevel != 0 || m.secCursor != 0 {
		t.Fatalf("enter → focus=%v level=%d sec=%d, want true/0/0 (Übersicht)", m.detailFocus, m.detailLevel, m.secCursor)
	}
	mi, _ = m.keyTree(key("k")) // sec 1 (Details)
	m = mi.(model)
	if m.secCursor != 1 || m.accOpen != 1 {
		t.Errorf("k → secCursor=%d accOpen=%d, want 1/1 (Details offen)", m.secCursor, m.accOpen)
	}
	// Bis zur letzten Section (Sprints-Tabelle) klemmen — focusSections = 6 (Overview+5,
	// DD2-270 fügt die DoD-Section ein).
	for i := 0; i < 6; i++ {
		mi, _ = m.keyTree(key("k"))
		m = mi.(model)
	}
	if m.secCursor != 5 {
		t.Errorf("k geklemmt → secCursor=%d, want 5 (Sprints-Tabelle)", m.secCursor)
	}
}

// Ziffer springt direkt in die n-te Content-Section (1 = erste Section nach Overview).
func TestMilestoneAccordionDigitJump(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 0
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("1")) // erste Content-Section (Details)
	m = mi.(model)
	if m.secCursor != 1 || m.accOpen != 1 {
		t.Errorf("Ziffer 1 → secCursor=%d accOpen=%d, want 1/1", m.secCursor, m.accOpen)
	}
}

// Sprint nutzt dasselbe Accordion (Overview + Details/Documents/Dependencies/Issues).
func TestSprintAccordionSectionNav(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 1 // Sprint s10
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if !m.detailFocus || m.detailLevel != 0 {
		t.Fatalf("enter auf Sprint → focus=%v level=%d, want true/0", m.detailFocus, m.detailLevel)
	}
	mi, _ = m.keyTree(key("k")) // Details
	m = mi.(model)
	if m.secCursor != 1 {
		t.Errorf("k → secCursor=%d, want 1", m.secCursor)
	}
}

// j/← auf der obersten Section bzw. esc geben den Fokus an den Tree zurück.
func TestAccordionExitToTree(t *testing.T) {
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
			t.Errorf("%q sollte den Detail-Fokus verlassen (oberste Section → Tree)", k)
		}
	}
}

// DD2-196: das Meilenstein-Detail rendert die Accordion-Sektionen; die offene
// Details-Section zeigt Description/Target date mit muted (empty)-Platzhalter, und
// die Sprints-Tabelle ist als Section vorhanden.
func TestMilestoneAccordionRender(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := detailFocusModel()
	m.treeCursor = 0
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("1")) // Details-Section öffnen
	m = mi.(model)

	node := m.treeNodes()[0]
	out := ansi.Strip(m.treeDetail(node, 60))
	for _, want := range []string{"Details", "Description", "Target date", "Sprints ("} {
		if !strings.Contains(out, want) {
			t.Errorf("Accordion-Render fehlt %q:\n%s", want, out)
		}
	}
	if !strings.Contains(out, "(empty)") {
		t.Errorf("leeres Feld soll muted (empty) zeigen:\n%s", out)
	}
}

// Ohne Detail-Fokus kein D08-Balken im Meilenstein-Detail (Regression).
func TestMilestoneRenderNoBarWithoutFocus(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := detailFocusModel()
	m.treeCursor = 0 // Meilenstein, KEIN Detail-Fokus
	out := ansi.Strip(m.treeDetail(m.treeNodes()[0], 60))
	if strings.Contains(out, "▌") {
		t.Errorf("ohne Detail-Fokus kein D08-Balken erwartet: %q", out)
	}
}
