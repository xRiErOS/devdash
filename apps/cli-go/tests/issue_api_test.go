package tests

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/api/generated"
)

// TestIssueList deckt die MCP-exakte IssueList (manual.go, DD2-210-Nachfolger
// von ListIssues) ab.
func TestIssueList(t *testing.T) {
	want := []api.Issue{{ID: 1, Key: "DD2-1", Title: "Bug", Status: "new", Type: "bug", Priority: 1}}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/backlog" {
			t.Errorf("Pfad %q", r.URL.Path)
		}
		json.NewEncoder(w).Encode(want)
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	data, err := c.IssueList(generated.IssueListArgs{})
	if err != nil {
		t.Fatal(err)
	}
	var got []api.Issue
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Key != "DD2-1" {
		t.Errorf("unerwartet: %+v", got)
	}
}

func TestIssueListQueryParams(t *testing.T) {
	var q map[string]string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q = map[string]string{
			"status":    r.URL.Query().Get("status"),
			"sprint_id": r.URL.Query().Get("sprint_id"),
			"type":      r.URL.Query().Get("type"),
		}
		json.NewEncoder(w).Encode([]api.Issue{})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")
	status, sprintKey, typ := "new", "7", generated.IssueListArgsTypeBug
	c.IssueList(generated.IssueListArgs{Status: &status, SprintKey: &sprintKey, Type: &typ})
	if q["status"] != "new" || q["sprint_id"] != "7" || q["type"] != "bug" {
		t.Errorf("Query falsch: %+v", q)
	}
}

func TestSetIssueStatus(t *testing.T) {
	var body string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch || !strings.HasSuffix(r.URL.Path, "/status") {
			t.Errorf("erwartete PATCH .../status, bekam %s %s", r.Method, r.URL.Path)
		}
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		json.NewEncoder(w).Encode(api.Issue{ID: 1, Key: "DD2-1", Status: "in_progress"})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	it, err := c.SetIssueStatus(1, "in_progress")
	if err != nil {
		t.Fatal(err)
	}
	if it.Status != "in_progress" || !strings.Contains(body, "in_progress") {
		t.Errorf("Status/Body falsch: %q %q", it.Status, body)
	}
}

func TestAssignSprint(t *testing.T) {
	var body string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch || !strings.HasSuffix(r.URL.Path, "/sprint") {
			t.Errorf("erwartete PATCH .../sprint, bekam %s %s", r.Method, r.URL.Path)
		}
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		json.NewEncoder(w).Encode(api.Issue{ID: 1, Key: "DD2-1", Status: "planned"})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	sid := 7
	if _, err := c.AssignSprint(1, &sid); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(body, "sprint_id") || !strings.Contains(body, "7") {
		t.Errorf("Body ohne sprint_id=7: %q", body)
	}
}

// TestIssueCreateFull deckt die MCP-exakte IssueCreateFull (manual.go, DD2-210-
// Nachfolger von CreateIssue) inkl. Envelope-Unwrap ({id,key,status,item}) ab.
func TestIssueCreateFull(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("erwartete POST, bekam %s", r.Method)
		}
		json.NewEncoder(w).Encode(map[string]any{"id": 42, "key": "DD2-42", "project_prefix": "DD2", "project_number": 42, "status": "new", "title": "Neu", "type": "feature"})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	prio := 2
	data, err := c.IssueCreateFull(generated.IssueCreateFullArgs{Title: "Neu", Type: generated.IssueCreateFullArgsTypeFeature, Priority: &prio})
	if err != nil {
		t.Fatal(err)
	}
	it, err := api.IssueFromCreateFullResult(data)
	if err != nil {
		t.Fatal(err)
	}
	if it.Key != "DD2-42" {
		t.Errorf("Key = %q, want DD2-42", it.Key)
	}
}
