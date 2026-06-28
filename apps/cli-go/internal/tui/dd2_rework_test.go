package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// DD2-133 Rework (Review-Reject): abgebrochene Sprints sollen im Tree die ID/Key
// WEISS lassen (wie completed) und NUR den Status-Text grau dimmen — vorher war die
// ganze Zeile inkl. Key gedimmt.
func TestCancelledSprintDimsOnlyStatus(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor) // Ascii-Profil strippt das Dim-SGR → Farbe nicht prüfbar
	defer lipgloss.SetColorProfile(termenv.Ascii)
	m := treeModel()
	m.milestones[0].Sprints[0] = api.Sprint{ID: 99, Key: "DD2#9", Name: "Toter Sprint", Status: "cancelled"}
	m.treeCursor = -1 // keine Cursor-Zeile (sonst recolort D08 alles in Accent)
	node := treeNode{kind: tkSprint, mileIdx: 0, sprIdx: 0, depth: 1}

	lines := m.treeLeftLines([]treeNode{node}, 60, true)
	if len(lines) != 1 {
		t.Fatalf("erwartet 1 Zeile, got %d", len(lines))
	}
	line := lines[0]
	if !strings.Contains(line, theme.Dim.Render("cancelled")) {
		t.Errorf("Status 'cancelled' soll separat gedimmt sein:\n%q", line)
	}
	if strings.Contains(line, theme.Dim.Render("DD2#9 cancelled")) {
		t.Errorf("ID+Status zusammen gedimmt — Key soll WEISS bleiben:\n%q", line)
	}
	if !strings.Contains(ansi.Strip(line), "DD2#9 cancelled") {
		t.Errorf("Key+Status nicht im Text:\n%q", ansi.Strip(line))
	}
}

// DD2-116 Rework (Review-Reject): beim ERSTEN f öffnet der Tree-Filter, bevor die
// projektweiten Issues (inkl. Tags) geladen sind. Treffen sie async ein, müssen die
// Facetten neu gebaut werden — sonst fehlt die Tags-Facette bis zum Reopen.
func TestTagFacetAppearsAfterAsyncLoadWhileFilterOpen(t *testing.T) {
	m := treeModel()
	m.treeFilterOpen = true
	m.ffItems = m.buildFilterItems() // wie openTreeFilter: noch ohne Tags (treeFilterIssues leer)
	for _, it := range m.ffItems {
		if it.facet == "tags" {
			t.Fatal("Vorbedingung verletzt: Tags-Facette schon vor dem Load vorhanden")
		}
	}

	tag := api.Tag{ID: 1, Name: "TUI"}
	items := []api.Issue{{Key: "DD2-1", Title: "x", Type: "bug", Status: "planned", Tags: []api.Tag{tag}}}
	mm, _ := m.Update(allIssuesMsg{items})
	got := mm.(model)

	found := false
	for _, it := range got.ffItems {
		if it.facet == "tags" && it.value == "TUI" {
			found = true
		}
	}
	if !found {
		t.Errorf("Tags-Facette 'TUI' fehlt nach async-Load bei offenem Filter:\n%+v", got.ffItems)
	}
}

// DD2-91 Rework (Review-Reject): die Such-Ansicht trägt jetzt den App-Außenrahmen
// (Chrome-Parität) und nutzt echtes 1fr:2fr statt der auf 36 gepinnten Fixbreite.
func TestSearchIsBorderedAndMasterIsOneThird(t *testing.T) {
	m := reviewModel()
	m.view = viewSearch
	if !m.viewBordered() {
		t.Error("viewSearch soll den App-Außenrahmen tragen (viewBordered)")
	}
	// Breites Terminal: links ~ w/3, NICHT bei 36 gepinnt.
	lw, _ := m.masterDetailWidths(150)
	if lw != 50 {
		t.Errorf("masterDetailWidths(150) lw=%d, want 50 (echtes 1fr, nicht 36-Pin)", lw)
	}
}

// DD2-121 Rework (Review-Reject): der Footer-Hint im Review-Cockpit benennt explizit,
// dass y in die Zwischenablage kopiert.
func TestReviewHintsNamesClipboard(t *testing.T) {
	m := reviewModel()
	if !strings.Contains(m.reviewHints(), "clipboard") {
		t.Errorf("reviewHints soll 'clipboard' benennen:\n%s", m.reviewHints())
	}
}
