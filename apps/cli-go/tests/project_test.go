package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"devd-cli/internal/api"
)

func projectsServer(t *testing.T) string {
	projects := []map[string]any{
		{"id": 9, "slug": "sprout", "name": "Sproutling", "prefix": "SPF"},
		{"id": 10, "slug": "devd2", "name": "Developer Dashboard 2.0", "prefix": "DD2"},
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/projects" {
			t.Errorf("falscher Pfad: %q", r.URL.Path)
		}
		json.NewEncoder(w).Encode(projects)
	}))
	t.Cleanup(srv.Close)
	return srv.URL
}

func TestResolveProjectBySlug(t *testing.T) {
	t.Setenv("DEVD_API_URL", projectsServer(t))
	c := api.NewClient("")
	p, err := c.ResolveProject("devd2")
	if err != nil {
		t.Fatal(err)
	}
	if p.ID != 10 {
		t.Errorf("slug devd2 → id %d, want 10", p.ID)
	}
}

func TestResolveProjectByPrefixCaseInsensitive(t *testing.T) {
	t.Setenv("DEVD_API_URL", projectsServer(t))
	c := api.NewClient("")
	p, err := c.ResolveProject("spf") // Prefix kleingeschrieben
	if err != nil {
		t.Fatal(err)
	}
	if p.ID != 9 {
		t.Errorf("prefix spf → id %d, want 9", p.ID)
	}
}

func TestResolveProjectNotFound(t *testing.T) {
	t.Setenv("DEVD_API_URL", projectsServer(t))
	c := api.NewClient("")
	if _, err := c.ResolveProject("nope"); err == nil {
		t.Error("erwartete not-found-Fehler")
	}
}
