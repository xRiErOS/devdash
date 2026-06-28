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

func TestSetIssueTagsContract(t *testing.T) {
	var body struct {
		TagIDs []int `json:"tag_ids"`
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "PUT" || r.URL.Path != "/api/backlog/42/tags" {
			t.Errorf("SetIssueTags: %s %s, want PUT /api/backlog/42/tags", r.Method, r.URL.Path)
		}
		raw, _ := io.ReadAll(r.Body)
		json.Unmarshal(raw, &body)
		json.NewEncoder(w).Encode(map[string]any{"tags": []map[string]any{{"id": 3, "name": "a", "color": "teal"}}})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	tags, err := c.SetIssueTags(42, []int{3, 5})
	if err != nil {
		t.Fatal(err)
	}
	if len(body.TagIDs) != 2 || body.TagIDs[0] != 3 {
		t.Errorf("Body tag_ids = %v, want [3 5]", body.TagIDs)
	}
	if len(tags) != 1 || tags[0].ID != 3 {
		t.Errorf("Response-Tags geparst: %+v", tags)
	}
}

// Leere Auswahl muss als [] (clear) gehen, nicht als null — sonst ignoriert das
// Backend den Replace (tag_ids fällt auf []).
func TestSetIssueTagsEmptyIsArray(t *testing.T) {
	var raw string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		raw = string(b)
		json.NewEncoder(w).Encode(map[string]any{"tags": []any{}})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	if _, err := c.SetIssueTags(42, nil); err != nil {
		t.Fatal(err)
	}
	if raw != `{"tag_ids":[]}` {
		t.Errorf("leerer Replace-Body = %q, want {\"tag_ids\":[]}", raw)
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
