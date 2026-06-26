package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"devd-cli/internal/api"
)

func TestListMilestonesWithSprints(t *testing.T) {
	want := []api.Milestone{{
		ID: 30, Name: "Beta-Feedback", Status: "active", Total: 28, Done: 28,
		Sprints: []api.Sprint{{ID: 190, Key: "SPF#8", Name: "Stillmodus", Status: "completed"}},
	}}
	var gotStatus string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/milestones" {
			t.Errorf("Pfad %q", r.URL.Path)
		}
		gotStatus = r.URL.Query().Get("status")
		json.NewEncoder(w).Encode(want)
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("9")

	ms, err := c.ListMilestones("all")
	if err != nil {
		t.Fatal(err)
	}
	if gotStatus != "all" {
		t.Errorf("status-Query = %q, want all", gotStatus)
	}
	if len(ms) != 1 || len(ms[0].Sprints) != 1 || ms[0].Sprints[0].Key != "SPF#8" {
		t.Errorf("Sprints nicht embedded: %+v", ms)
	}
}
