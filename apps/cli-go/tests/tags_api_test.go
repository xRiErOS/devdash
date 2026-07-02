package tests

// tags_api_test.go — DD2-75/DD2-33: HTTP-Smoke des Tag-Clients gegen den exakten
// Wire-Contract (Methode/Pfad/Body/Parse). Stub-Server statt NAS (keine Prod-Mutation).

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/api/generated"
)

func TestListTagsParses(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" || r.URL.Path != "/api/tags" {
			t.Errorf("ListTags: %s %s, want GET /api/tags", r.Method, r.URL.Path)
		}
		json.NewEncoder(w).Encode([]map[string]any{
			{"id": 1, "name": "infra", "color": "blue", "usage_count": 4},
		})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	tags, err := c.ListTags()
	if err != nil {
		t.Fatal(err)
	}
	if len(tags) != 1 || tags[0].Name != "infra" || tags[0].UsageCount != 4 {
		t.Errorf("geparst: %+v", tags)
	}
}

func TestCreateTagSendsBody(t *testing.T) {
	var body map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/api/tags" {
			t.Errorf("CreateTag: %s %s, want POST /api/tags", r.Method, r.URL.Path)
		}
		raw, _ := io.ReadAll(r.Body)
		json.Unmarshal(raw, &body)
		w.WriteHeader(201)
		json.NewEncoder(w).Encode(map[string]any{"id": 7, "name": body["name"], "color": body["color"]})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	tag, err := c.CreateTag("spike", "peach")
	if err != nil {
		t.Fatal(err)
	}
	if body["name"] != "spike" || body["color"] != "peach" {
		t.Errorf("Body = %v, want name=spike color=peach", body)
	}
	if tag.ID != 7 {
		t.Errorf("tag.ID = %d, want 7", tag.ID)
	}
}

func TestUpdateAndDeleteTagPaths(t *testing.T) {
	var hits []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits = append(hits, r.Method+" "+r.URL.Path)
		json.NewEncoder(w).Encode(map[string]any{"id": 7, "name": "x", "color": "mauve", "ok": true})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	if _, err := c.UpdateTag(7, "x", "mauve"); err != nil {
		t.Fatal(err)
	}
	if err := c.DeleteTag(7); err != nil {
		t.Fatal(err)
	}
	want := []string{"PUT /api/tags/7", "DELETE /api/tags/7"}
	for i, w := range want {
		if i >= len(hits) || hits[i] != w {
			t.Errorf("hit %d = %v, want %q", i, hits, w)
		}
	}
}

// TestIssueTagSetResolvesNamesContract deckt die MCP-exakte IssueTagSet (manual.go,
// DD2-210-Nachfolger von SetIssueTags) ab: Namen → GET /api/tags-Resolution → PUT
// tag_ids, Response-Envelope {tags:[]} bleibt gleich.
func TestIssueTagSetResolvesNamesContract(t *testing.T) {
	var putBody struct {
		TagIDs []int `json:"tag_ids"`
	}
	var putHit string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == "GET" && r.URL.Path == "/api/tags":
			json.NewEncoder(w).Encode([]map[string]any{
				{"id": 3, "name": "a", "color": "teal"},
				{"id": 5, "name": "b", "color": "blue"},
			})
		case r.Method == "PUT" && r.URL.Path == "/api/backlog/42/tags":
			putHit = r.URL.Path
			raw, _ := io.ReadAll(r.Body)
			json.Unmarshal(raw, &putBody)
			json.NewEncoder(w).Encode(map[string]any{"tags": []map[string]any{{"id": 3, "name": "a", "color": "teal"}}})
		default:
			t.Errorf("unerwarteter Call: %s %s", r.Method, r.URL.Path)
		}
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	data, err := c.IssueTagSet(generated.IssueTagSetArgs{IdOrKey: "42", Tags: []string{"a", "b"}})
	if err != nil {
		t.Fatal(err)
	}
	if putHit != "/api/backlog/42/tags" {
		t.Errorf("PUT-Pfad = %q, want /api/backlog/42/tags", putHit)
	}
	if len(putBody.TagIDs) != 2 || putBody.TagIDs[0] != 3 || putBody.TagIDs[1] != 5 {
		t.Errorf("resolved tag_ids = %v, want [3 5]", putBody.TagIDs)
	}
	var env struct {
		Tags []api.Tag `json:"tags"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		t.Fatal(err)
	}
	if len(env.Tags) != 1 || env.Tags[0].ID != 3 {
		t.Errorf("Response-Tags geparst: %+v", env.Tags)
	}
}

// Leere Auswahl muss als [] (clear) gehen, nicht als null — sonst ignoriert das
// Backend den Replace (tag_ids fällt auf []).
func TestIssueTagSetEmptyIsArray(t *testing.T) {
	var raw string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && r.URL.Path == "/api/tags" {
			json.NewEncoder(w).Encode([]map[string]any{})
			return
		}
		b, _ := io.ReadAll(r.Body)
		raw = string(b)
		json.NewEncoder(w).Encode(map[string]any{"tags": []any{}})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	if _, err := c.IssueTagSet(generated.IssueTagSetArgs{IdOrKey: "42", Tags: nil}); err != nil {
		t.Fatal(err)
	}
	if raw != `{"tag_ids":[]}` {
		t.Errorf("leerer Replace-Body = %q, want {\"tag_ids\":[]}", raw)
	}
}

// DD2-33 Part B: Issue-Create trägt tag_ids nativ (POST /api/backlog). DD2-210:
// IssueCreateFull (nicht das schlankere IssueCreate) — nur dieses kennt tag_ids.
func TestIssueCreateFullSendsTagIDs(t *testing.T) {
	var body struct {
		Title  string `json:"title"`
		TagIDs []int  `json:"tag_ids"`
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/api/backlog" {
			t.Errorf("IssueCreateFull: %s %s, want POST /api/backlog", r.Method, r.URL.Path)
		}
		raw, _ := io.ReadAll(r.Body)
		json.Unmarshal(raw, &body)
		json.NewEncoder(w).Encode(map[string]any{"id": 1, "project_prefix": "DD2", "project_number": 1, "status": "new", "title": body.Title})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	prio := 2
	if _, err := c.IssueCreateFull(generated.IssueCreateFullArgs{Title: "X", Type: generated.IssueCreateFullArgsTypeFeature, Priority: &prio, TagIds: []int{3, 7}}); err != nil {
		t.Fatal(err)
	}
	if len(body.TagIDs) != 2 || body.TagIDs[0] != 3 || body.TagIDs[1] != 7 {
		t.Errorf("tag_ids im Create-Body = %v, want [3 7]", body.TagIDs)
	}
}

func TestGetSprintAndMilestoneTags(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"tags": []map[string]any{{"id": 9, "name": "z", "color": "green"}}})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	for _, get := range []func() ([]api.Tag, error){
		func() ([]api.Tag, error) { return c.GetSprintTags(1) },
		func() ([]api.Tag, error) { return c.GetMilestoneTags(1) },
	} {
		tags, err := get()
		if err != nil {
			t.Fatal(err)
		}
		if len(tags) != 1 || tags[0].ID != 9 {
			t.Errorf("Envelope-Parse: %+v", tags)
		}
	}
}
