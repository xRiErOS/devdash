package tui

import (
	"encoding/json"
	"testing"

	"devd-cli/internal/api"
)

// DD2-30: user_stories aus dem Sprint-Items-Payload landen jetzt in api.Issue
// (Feld fehlte vorher → wurde verworfen).
func TestIssueDecodesUserStories(t *testing.T) {
	var it api.Issue
	raw := `{"id":1,"title":"X","user_stories":[{"id":5,"title":"US-A","qa":"klick→sieht","us_verdict":"open"}]}`
	if err := json.Unmarshal([]byte(raw), &it); err != nil {
		t.Fatal(err)
	}
	if len(it.UserStories) != 1 {
		t.Fatalf("UserStories=%d, want 1", len(it.UserStories))
	}
	if it.UserStories[0].Title != "US-A" {
		t.Errorf("Title=%q, want US-A", it.UserStories[0].Title)
	}
}

// DD2-23: Sprint-Meilenstein-Name fällt auf den Eltern-Meilenstein zurück, wenn
// der Sprint-Payload milestone_name nicht mitliefert.
func TestSprintMilestoneNameFallback(t *testing.T) {
	name := "M1"
	s := &api.Sprint{MilestoneName: &name}
	if got := sprintMilestoneName(s, nil); got != "M1" {
		t.Errorf("eigener Name: got %q, want M1", got)
	}
	parent := &api.Milestone{Name: "Eltern-M"}
	if got := sprintMilestoneName(&api.Sprint{}, parent); got != "Eltern-M" {
		t.Errorf("Fallback: got %q, want Eltern-M", got)
	}
	if got := sprintMilestoneName(&api.Sprint{}, nil); got != "" {
		t.Errorf("ohne Quelle: got %q, want \"\"", got)
	}
}
