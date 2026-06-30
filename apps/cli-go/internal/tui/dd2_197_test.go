package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/x/ansi"
)

// DD2-197: Hat ein Issue Unteraufgaben (Lazy-Cache befüllt), erscheint eine eigene
// Accordion-Section "Subtasks (done/total)" mit den Titeln; QA wird mitgezeigt.
func TestDD2197SubtaskAccordionSection(t *testing.T) {
	qa := "App startet → kein Crash"
	m := model{subtasks: map[int][]api.Subtask{
		42: {
			{ID: 1, Title: "Migration anlegen", Status: "done"},
			{ID: 2, Title: "Endpoint verdrahten", Status: "open", QACriteria: &qa},
		},
	}}
	it := api.Issue{ID: 42, Key: "DD2-42", Title: "T"}

	secs := m.issueSections(it, 80, false)
	var sub *accordionSection
	for i := range secs {
		if strings.HasPrefix(ansi.Strip(secs[i].title), "Subtasks") {
			sub = &secs[i]
			break
		}
	}
	if sub == nil {
		t.Fatalf("keine Subtasks-Section in %d Sektionen", len(secs))
	}
	if got := ansi.Strip(sub.title); got != "Subtasks (1/2)" {
		t.Errorf("Section-Titel %q, want 'Subtasks (1/2)'", got)
	}
	body := ansi.Strip(sub.body)
	for _, want := range []string{"Migration anlegen", "Endpoint verdrahten", "QA: App startet"} {
		if !strings.Contains(body, want) {
			t.Errorf("Subtasks-Body ohne %q:\n%s", want, body)
		}
	}
}

// Ohne Unteraufgaben gibt es keine Subtasks-Section (kein Rauschen).
func TestDD2197NoSubtasksNoSection(t *testing.T) {
	m := model{subtasks: map[int][]api.Subtask{}}
	it := api.Issue{ID: 7, Key: "DD2-7", Title: "T"}
	for _, s := range m.issueSections(it, 80, true) {
		if strings.HasPrefix(ansi.Strip(s.title), "Subtasks") {
			t.Errorf("Subtasks-Section trotz leerem Cache: %q", s.title)
		}
	}
}

// DD2-197: syncSubtasks lädt nur für Issue-Knoten und nur wenn nicht gecacht.
func TestDD2197SyncSubtasksOnlyForUncachedIssue(t *testing.T) {
	m := treeModel()
	m.subtasks = map[int][]api.Subtask{}
	it := api.Issue{ID: 100, Key: "DD2-100", Title: "X"}
	nodes := []treeNode{{kind: tkIssue, issue: &it}}
	m.treeCursor = 0
	if cmd := m.syncSubtasks(nodes); cmd == nil {
		t.Error("erwartet Load-Cmd für ungecachtes Issue")
	}
	m.subtasks[100] = nil // jetzt gecacht (auch leer)
	if cmd := m.syncSubtasks(nodes); cmd != nil {
		t.Error("kein Reload für bereits gecachtes Issue")
	}
	// Meilenstein-Knoten → kein Subtask-Load
	mnodes := []treeNode{{kind: tkMile, mileIdx: 0}}
	if cmd := m.syncSubtasks(mnodes); cmd != nil {
		t.Error("kein Subtask-Load für Nicht-Issue-Knoten")
	}
}
