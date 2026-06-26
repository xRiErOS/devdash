package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"devd-cli/internal/api"
)

func TestClientSetsHeaders(t *testing.T) {
	var gotProject, gotCT string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotProject = r.Header.Get("X-Project-Id")
		gotCT = r.Header.Get("Content-Type")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]any{})
	}))
	defer srv.Close()

	t.Setenv("DEVD_API_URL", srv.URL)
	t.Setenv("DEVD_PROJECT_ID", "9")
	c := api.NewClient("")
	if _, err := c.Do("GET", "/api/sprints", nil); err != nil {
		t.Fatal(err)
	}
	if gotProject != "9" {
		t.Errorf("X-Project-Id = %q, want 9 (aus Env)", gotProject)
	}
	if gotCT != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", gotCT)
	}
}

func TestClientProjectOverrideBeatsEnv(t *testing.T) {
	var got string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Get("X-Project-Id")
		json.NewEncoder(w).Encode([]any{})
	}))
	defer srv.Close()

	t.Setenv("DEVD_API_URL", srv.URL)
	t.Setenv("DEVD_PROJECT_ID", "9")
	c := api.NewClient("5") // expliziter Override schlägt Env
	c.Do("GET", "/api/sprints", nil)
	if got != "5" {
		t.Errorf("X-Project-Id = %q, want 5 (override)", got)
	}
}

func TestClientSetsTokenWhenPresent(t *testing.T) {
	var tok string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tok = r.Header.Get("X-Devd-Token")
		json.NewEncoder(w).Encode([]any{})
	}))
	defer srv.Close()

	t.Setenv("DEVD_API_URL", srv.URL)
	t.Setenv("DEVD_API_TOKEN", "secret")
	c := api.NewClient("9")
	c.Do("GET", "/api/sprints", nil)
	if tok != "secret" {
		t.Errorf("X-Devd-Token = %q, want secret", tok)
	}
}

func TestClientNoTokenHeaderWhenUnset(t *testing.T) {
	got := "unset-marker"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if v, ok := r.Header["X-Devd-Token"]; ok {
			got = v[0]
		} else {
			got = ""
		}
		json.NewEncoder(w).Encode([]any{})
	}))
	defer srv.Close()

	t.Setenv("DEVD_API_URL", srv.URL)
	t.Setenv("DEVD_API_TOKEN", "")
	c := api.NewClient("9")
	c.Do("GET", "/api/sprints", nil)
	if got != "" {
		t.Errorf("X-Devd-Token gesetzt obwohl Env leer: %q", got)
	}
}

func TestClientErrorOn4xx(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"nope"}`))
	}))
	defer srv.Close()

	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("9")
	if _, err := c.Do("GET", "/api/sprints/999", nil); err == nil {
		t.Fatal("erwartete Fehler bei 404, bekam nil")
	}
}
