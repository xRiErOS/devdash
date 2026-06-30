package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/x/ansi"
)

func sectionByPrefix(secs []accordionSection, prefix string) *accordionSection {
	for i := range secs {
		if strings.HasPrefix(ansi.Strip(secs[i].title), prefix) {
			return &secs[i]
		}
	}
	return nil
}

// DD2-196 #1+#2+#3: Meilenstein-Accordion hat Details (muted empty), Documents,
// Dependencies und eine Sprints-Child-Tabelle mit den Sprint-Keys.
func TestDD2196MilestoneAccordionSections(t *testing.T) {
	g := "Launch"
	ms := api.Milestone{ID: 1, Name: "M1", Status: "in_progress", Done: 1, Total: 3,
		Sprints: []api.Sprint{
			{ID: 10, Key: "DD2#9", Name: "Sprint Neun", Status: "in_progress", Goal: &g},
		}}
	m := model{ownerDocs: map[string][]api.Document{}, depsCache: map[string]*api.Dependencies{}}
	secs := m.milestoneAccordionSections(ms, 80)

	for _, want := range []string{"Details", "Documents", "Dependencies", "Sprints (1)"} {
		if sectionByPrefix(secs, want) == nil {
			t.Errorf("Meilenstein-Accordion fehlt Section %q", want)
		}
	}
	// Details: leeres target_date → muted (empty).
	det := sectionByPrefix(secs, "Details")
	if det == nil || !strings.Contains(ansi.Strip(det.body), "(empty)") {
		t.Errorf("Details-Section ohne muted (empty):\n%v", det)
	}
	// Sprints-Tabelle trägt Key + Name.
	tbl := sectionByPrefix(secs, "Sprints (1)")
	body := ansi.Strip(tbl.body)
	if !strings.Contains(body, "DD2#9") || !strings.Contains(body, "Sprint Neun") {
		t.Errorf("Sprints-Child-Tabelle unvollständig:\n%s", body)
	}
}

// DD2-196 #3: Sprint-Accordion hat eine Issues-Child-Tabelle aus dem Lazy-Cache.
func TestDD2196SprintIssuesTable(t *testing.T) {
	sp := api.Sprint{ID: 10, Key: "DD2#9", Name: "S", Status: "in_progress"}
	m := model{
		ownerDocs: map[string][]api.Document{},
		depsCache: map[string]*api.Dependencies{},
		treeIssues: map[int][]api.Issue{10: {
			{ID: 99, Key: "DD2-99", Type: "bug", Status: "to_review", Title: "Beispiel"},
		}},
	}
	secs := m.sprintAccordionSections(sp, 80)
	tbl := sectionByPrefix(secs, "Issues (1)")
	if tbl == nil {
		t.Fatalf("keine Issues-Section: %v", secs)
	}
	body := ansi.Strip(tbl.body)
	if !strings.Contains(body, "DD2-99") || !strings.Contains(body, "Beispiel") {
		t.Errorf("Issues-Child-Tabelle unvollständig:\n%s", body)
	}
}

// Nicht geladener Sprint zeigt in der Issues-Tabelle einen Lade-Hinweis statt leer.
func TestDD2196SprintIssuesNotLoaded(t *testing.T) {
	sp := api.Sprint{ID: 77, Key: "DD2#77", Name: "S"}
	m := model{ownerDocs: map[string][]api.Document{}, depsCache: map[string]*api.Dependencies{},
		treeIssues: map[int][]api.Issue{}}
	tbl := sectionByPrefix(m.sprintAccordionSections(sp, 80), "Issues (0)")
	if tbl == nil || !strings.Contains(ansi.Strip(tbl.body), "expand sprint") {
		t.Errorf("nicht-geladener Sprint soll Lade-Hinweis zeigen:\n%v", tbl)
	}
}
