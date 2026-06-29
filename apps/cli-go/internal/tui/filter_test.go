package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

func filterModel() model {
	m := newModel(api.NewClient("9"), &api.Project{ID: 9, Slug: "sprout", Prefix: "SPF"}, nil)
	m.milestones = []api.Milestone{
		{ID: 1, Name: "Aktiv", Status: "in_progress"},
		{ID: 2, Name: "Fertig", Status: "completed"},
		{ID: 3, Name: "Abgebrochen", Status: "cancelled"},
		{ID: 4, Name: "Zurückgestellt", Status: "in_progress", Deferred: 1},
	}
	return m
}

func TestMilestoneDefaultHide(t *testing.T) {
	m := filterModel()
	vis := m.visMilestonesRaw()
	if len(vis) != 1 {
		t.Fatalf("default sichtbar=%d, want 1 (nur in_progress, nicht deferred)", len(vis))
	}
	if vis[0].Name != "Aktiv" {
		t.Errorf("sichtbar=%q, want Aktiv", vis[0].Name)
	}
}

func TestFilterToggleShowsDeferred(t *testing.T) {
	m := filterModel()
	m.fMile.toggle(deferredKey) // deferred default hidden → toggle = sichtbar
	vis := m.visMilestonesRaw()
	if len(vis) != 2 {
		t.Fatalf("nach deferred-toggle sichtbar=%d, want 2", len(vis))
	}
}

func TestFilterToggleShowsCompleted(t *testing.T) {
	m := filterModel()
	m.fMile.toggle("completed")
	vis := m.visMilestonesRaw()
	found := false
	for _, x := range vis {
		if x.Status == "completed" {
			found = true
		}
	}
	if !found {
		t.Error("completed nach toggle nicht sichtbar")
	}
}

func TestIssueDefaultHidesCancelled(t *testing.T) {
	m := filterModel()
	m.curSprint = &api.Sprint{ID: 10, Items: []api.Issue{
		{ID: 1, Status: "to_review"},
		{ID: 2, Status: "cancelled"},
		{ID: 3, Status: "completed"},
	}}
	m.milestones = []api.Milestone{{ID: 1, Status: "in_progress", Sprints: []api.Sprint{{ID: 10}}}}
	m.mlist.setLen(1)
	m.depth = 1
	m.slist.setLen(1)
	vis := m.visIssues()
	for _, it := range vis {
		if it.Status == "cancelled" {
			t.Error("cancelled-Issue sollte default ausgeblendet sein")
		}
	}
	if len(vis) != 2 {
		t.Errorf("sichtbar=%d, want 2 (to_review+completed)", len(vis))
	}
}

func TestOpenFilterPopulatesOpts(t *testing.T) {
	m := filterModel()
	mi, _ := m.openFilter()
	m = mi.(model)
	if !m.filtering {
		t.Fatal("filtering nicht aktiv")
	}
	// Meilenstein-Spalte (depth 0): Status-Werte + deferred-Pseudo
	hasDeferred := false
	for _, o := range m.fopts {
		if o.value == deferredKey {
			hasDeferred = true
		}
	}
	if !hasDeferred {
		t.Error("deferred-Pseudo-Option fehlt in Meilenstein-Filter")
	}
}

func TestMilestoneClipTable(t *testing.T) {
	g := "Stillmodus glätten"
	ms := &api.Milestone{ID: 7, Name: "Beta", Status: "in_progress", Done: 2, Total: 5,
		Sprints: []api.Sprint{{ID: 10, Key: "SPF#1", Name: "S1", Goal: &g}}}
	out := milestoneClip(ms)
	if !strings.Contains(out, "| ID | Sprint | Title | Goal |") {
		t.Error("Sprint-Tabellenkopf fehlt")
	}
	if !strings.Contains(out, "SPF#1") || !strings.Contains(out, g) {
		t.Errorf("Sprint-Zeile unvollständig:\n%s", out)
	}
}

func TestSprintClipTable(t *testing.T) {
	g, bg := "Target", "Hintergrund\nmehrzeilig"
	s := &api.Sprint{ID: 10, Key: "SPF#1", Name: "S1", Status: "in_progress", ItemCount: 1, DoneCount: 0,
		Items: []api.Issue{{ID: 100, Key: "SPF-1", Title: "Issue A", Goal: &g, Background: &bg}}}
	out := sprintClip(s)
	if !strings.Contains(out, "| ID | Key | Title | Goal | Background |") {
		t.Error("Issue-Tabellenkopf fehlt")
	}
	if strings.Contains(out, "mehrzeilig\n") {
		t.Error("Background nicht auf eine Zeile kollabiert")
	}
	if !strings.Contains(out, "SPF-1") {
		t.Error("Issue-Zeile fehlt")
	}
}
