package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"devd-cli/internal/api"
)

func TestListSprints(t *testing.T) {
	want := []api.Sprint{{ID: 1, Key: "DD2#1", Name: "Sprint 1", Status: "active"}}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/sprints" {
			t.Errorf("Pfad %q", r.URL.Path)
		}
		json.NewEncoder(w).Encode(want)
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	got, err := c.ListSprints("")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Key != "DD2#1" {
		t.Errorf("unerwartet: %+v", got)
	}
}

func TestListSprintsStatusFilter(t *testing.T) {
	var gotQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.Query().Get("status")
		json.NewEncoder(w).Encode([]api.Sprint{})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")
	c.ListSprints("active")
	if gotQuery != "active" {
		t.Errorf("status-Query = %q, want active", gotQuery)
	}
}

func TestGetSprintWithItems(t *testing.T) {
	want := api.Sprint{ID: 7, Key: "DD2#3", Name: "Sprint 3", Status: "active",
		Items: []api.Issue{{ID: 1, Key: "DD2-10", Title: "Issue", Status: "to_review"}}}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/sprints/7" {
			t.Errorf("Pfad %q", r.URL.Path)
		}
		json.NewEncoder(w).Encode(want)
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	s, err := c.GetSprint(7)
	if err != nil {
		t.Fatal(err)
	}
	if s.Key != "DD2#3" || len(s.Items) != 1 || s.Items[0].Key != "DD2-10" {
		t.Errorf("unerwartet: %+v", s)
	}
}
