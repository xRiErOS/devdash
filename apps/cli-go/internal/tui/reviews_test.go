package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func TestReviewsListOpensViaR(t *testing.T) {
	m := browseModel()
	mi, cmd := m.Update(keyMsg("R"))
	m = mi.(model)
	if m.view != viewNavigateReviews {
		t.Errorf("R → view=%d, want viewNavigateReviews", m.view)
	}
	if cmd == nil {
		t.Error("R sollte loadReviewSprints dispatchen")
	}
}

func TestReviewsListMsgPopulates(t *testing.T) {
	m := browseModel()
	mi, _ := m.openReviewsList()
	m = mi.(model)
	mi, _ = m.Update(reviewSprintsMsg{[]api.Sprint{
		{ID: 10, Key: "SPF#1", Name: "S1", Status: "to_review"},
		{ID: 11, Key: "SPF#2", Name: "S2", Status: "to_review"},
	}})
	m = mi.(model)
	if len(m.reviewSprints) != 2 || m.rvlist.length != 2 {
		t.Fatalf("reviewSprints=%d rvlist.length=%d, want 2/2", len(m.reviewSprints), m.rvlist.length)
	}
}

func TestReviewsListEnterOpensCockpit(t *testing.T) {
	m := browseModel()
	m.view = viewNavigateReviews
	m.reviewSprints = []api.Sprint{{ID: 42, Key: "SPF#5", Name: "S5", Status: "to_review"}}
	m.rvlist.setLen(1)
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.view != viewReviewSprint {
		t.Errorf("enter → view=%d, want viewReviewSprint", m.view)
	}
	if m.reviewReturn != viewNavigateReviews {
		t.Error("reviewReturn nicht auf Liste gesetzt (q/esc kehrt sonst nicht zurück)")
	}
	if cmd == nil {
		t.Error("enter sollte loadSprint(42) dispatchen")
	}
}

// DD2-220: q aus der Reviews-Liste kehrt zur Quell-View (Tree) zurück, nicht zur Lobby.
func TestReviewsListQReturnsToSource(t *testing.T) {
	m := browseModel() // view=viewBrowseProject
	mi, _ := m.openReviewsList()
	m = mi.(model)
	if m.view != viewNavigateReviews {
		t.Fatalf("Setup: view=%d, want viewNavigateReviews", m.view)
	}
	mi, _ = m.Update(keyMsg("q"))
	m = mi.(model)
	if m.view != viewBrowseProject {
		t.Errorf("q → view=%d, want viewBrowseProject (topReturn, nicht Lobby)", m.view)
	}
}

// DD2-230: l/→ klappt den Sprint am Cursor auf, lädt die Items lazy (genau ein Fetch),
// erneut togglet zu. Enter bleibt davon unberührt (eigener Test oben).
func TestReviewsListExpandTogglesAndLazyLoads(t *testing.T) {
	m := browseModel()
	m.view = viewNavigateReviews
	m.reviewSprints = []api.Sprint{{ID: 42, Key: "SPF#5", Name: "S5", Status: "to_review"}}
	m.rvlist.setLen(1)

	mi, cmd := m.Update(keyMsg("l")) // l → navKey "right" → expand
	m = mi.(model)
	if !m.reviewExp[42] {
		t.Fatal("l sollte Sprint 42 aufklappen")
	}
	if cmd == nil {
		t.Error("erstes Aufklappen sollte loadReviewDetail(42) dispatchen")
	}

	// Detail im Cache → erneutes Auf-/Zuklappen löst keinen Re-Fetch aus.
	m.reviewDetail[42] = &api.Sprint{ID: 42}
	mi, cmd = m.Update(keyMsg("l")) // togglet zu
	m = mi.(model)
	if m.reviewExp[42] {
		t.Error("erneutes l sollte einklappen")
	}
	mi, cmd = m.Update(keyMsg("l")) // wieder auf, aber Cache-Hit
	m = mi.(model)
	if !m.reviewExp[42] {
		t.Error("drittes l sollte wieder aufklappen")
	}
	if cmd != nil {
		t.Error("Aufklappen bei gefülltem Cache darf NICHT erneut fetchen")
	}
}

// DD2-230: reviewDetailMsg landet im Lazy-Cache (ohne curSprint/View zu verändern).
func TestReviewDetailMsgCaches(t *testing.T) {
	m := browseModel()
	mi, _ := m.Update(reviewDetailMsg{id: 42, sprint: &api.Sprint{ID: 42, Key: "SPF#5"}})
	m = mi.(model)
	if m.reviewDetail[42] == nil || m.reviewDetail[42].Key != "SPF#5" {
		t.Fatal("reviewDetailMsg nicht in m.reviewDetail gecached")
	}
	if m.view == viewReviewSprint || m.curSprint != nil {
		t.Error("reviewDetailMsg darf weder View wechseln noch curSprint setzen")
	}
}

// DD2-230: Collapsed-Header zeigt X/Y passed (passed_count) ohne Aufklappen.
func TestReviewsHeaderShowsPassedCount(t *testing.T) {
	m := browseModel()
	m.width, m.height = 140, 40
	m.view = viewNavigateReviews
	m.reviewSprints = []api.Sprint{{ID: 7, Key: "SPF#7", Name: "S7", Status: "to_review", PassedCount: 4, ItemCount: 9}}
	m.rvlist.setLen(1)
	out := m.viewNavigateReviews()
	if !strings.Contains(out, "4/9 passed") {
		t.Errorf("Header zeigt kein '4/9 passed':\n%s", out)
	}
}

// DD2-230: aufgeklappt rendert die Inline-Tabelle die Issue-Verdicts (US2).
func TestReviewsExpandedTableRendersVerdicts(t *testing.T) {
	m := browseModel()
	m.width, m.height = 160, 40
	m.view = viewNavigateReviews
	m.reviewSprints = []api.Sprint{{ID: 7, Key: "SPF#7", Name: "S7", Status: "to_review", ItemCount: 1}}
	m.rvlist.setLen(1)
	m.reviewExp[7] = true
	passed := "passed"
	m.reviewDetail[7] = &api.Sprint{ID: 7, Items: []api.Issue{
		{Key: "SPF-1", Title: "Verdict cell", ReviewStatus: &passed,
			UserStories: []api.UserStory{{Verdict: "accepted"}, {Verdict: "open"}}},
	}}
	out := m.viewNavigateReviews()
	for _, want := range []string{"SPF-1", "passed", "1/2 passed", "verdict", "comment"} {
		if !strings.Contains(out, want) {
			t.Errorf("Inline-Tabelle ohne %q:\n%s", want, out)
		}
	}
}

func TestCockpitEscReturnsToList(t *testing.T) {
	m := reviewModel() // reviewReturn=viewNavigateReviews
	mi, cmd := m.Update(keyMsg("q"))
	m = mi.(model)
	if m.view != viewNavigateReviews {
		t.Errorf("q im Cockpit → view=%d, want viewNavigateReviews", m.view)
	}
	if cmd == nil {
		t.Error("Rückkehr zur Liste sollte sie neu laden")
	}
}
