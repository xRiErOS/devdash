package tests

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"devd-cli/internal/api"
)

func TestSubmitReviewBody(t *testing.T) {
	var body, path, method string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		method, path = r.Method, r.URL.Path
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		json.NewEncoder(w).Encode(map[string]any{"ok": true})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	if _, err := c.SubmitReview(99, "not_passed", "bitte fixen", ""); err != nil {
		t.Fatal(err)
	}
	if method != http.MethodPost || !strings.HasSuffix(path, "/backlog/99/reviews") {
		t.Errorf("erwartete POST .../backlog/99/reviews, bekam %s %s", method, path)
	}
	if !strings.Contains(body, "not_passed") || !strings.Contains(body, "bitte fixen") {
		t.Errorf("Body ohne verdict/comment: %q", body)
	}
}

func TestSprintToBody(t *testing.T) {
	var body, path string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		json.NewEncoder(w).Encode(api.Sprint{ID: 7, Key: "DD2#3", Status: "to_review"})
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	s, err := c.SprintTo(7, "to_review")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(path, "/sprints/7/status") {
		t.Errorf("Pfad %q", path)
	}
	if !strings.Contains(body, `"to":"to_review"`) {
		t.Errorf("Body ohne to=to_review: %q", body)
	}
	if s.Status != "to_review" {
		t.Errorf("Status %q", s.Status)
	}
}
