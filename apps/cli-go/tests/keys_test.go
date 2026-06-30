package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"devd-cli/internal/api"
)

// Faithful-Port-Verifikation von packages/api-types/keys.js parseRef.
func TestParseRef(t *testing.T) {
	cases := []struct {
		in     string
		ok     bool
		isID   bool
		id     int
		prefix string
		number int
	}{
		{"77", true, true, 77, "", 0},
		{"DD#77", true, false, 0, "DD", 77},
		{"DD-77", true, false, 0, "DD", 77},
		{"dd-77", true, false, 0, "DD", 77},
		{"dd77", true, false, 0, "DD", 77},
		{"#77", true, false, 0, "", 77},
		{"DD2-42", true, false, 0, "DD2", 42}, // B01: alnum-Prefix mit Separator
		{"dd2#3", true, false, 0, "DD2", 3},
		{"SPF-104", true, false, 0, "SPF", 104},
		{" SPF-104 ", true, false, 0, "SPF", 104}, // trim
		{"", false, false, 0, "", 0},
		{"garbage", false, false, 0, "", 0},
		{"A77", false, false, 0, "", 0}, // 1-Buchstaben-Prefix ohne Separator = mehrdeutig → abgelehnt
	}
	for _, c := range cases {
		r, ok := api.ParseRef(c.in)
		if ok != c.ok {
			t.Errorf("ParseRef(%q) ok=%v, want %v", c.in, ok, c.ok)
			continue
		}
		if !ok {
			continue
		}
		if r.IsID != c.isID || (c.isID && r.ID != c.id) {
			t.Errorf("ParseRef(%q) IsID=%v id=%d, want IsID=%v id=%d", c.in, r.IsID, r.ID, c.isID, c.id)
		}
		if !c.isID && (r.Prefix != c.prefix || r.Number != c.number) {
			t.Errorf("ParseRef(%q) prefix=%q num=%d, want prefix=%q num=%d", c.in, r.Prefix, r.Number, c.prefix, c.number)
		}
	}
}

func TestResolveSprintIDByKey(t *testing.T) {
	sprints := []map[string]any{
		{"id": 7, "key": "DD2#3", "name": "Sprint 3", "status": "in_progress"},
		{"id": 9, "key": "DD2#20", "name": "Sprint 20", "status": "in_progress"},
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(sprints)
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	id, err := c.ResolveSprintID("DD2#20")
	if err != nil {
		t.Fatal(err)
	}
	if id != 9 {
		t.Errorf("ResolveSprintID(DD2#20) = %d, want 9", id)
	}
	// numerische Roh-ID kurzschließt ohne Fetch
	if id, _ := c.ResolveSprintID("7"); id != 7 {
		t.Errorf("ResolveSprintID(7) = %d, want 7", id)
	}
}

func TestResolveIssueIDByKey(t *testing.T) {
	issues := []map[string]any{
		{"id": 99, "key": "DD2-42", "title": "Fix bug", "status": "new"},
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(issues)
	}))
	defer srv.Close()
	t.Setenv("DEVD_API_URL", srv.URL)
	c := api.NewClient("10")

	id, err := c.ResolveIssueID("dd2-42") // case-insensitiv
	if err != nil {
		t.Fatal(err)
	}
	if id != 99 {
		t.Errorf("ResolveIssueID(dd2-42) = %d, want 99", id)
	}
	if _, err := c.ResolveIssueID("DD2-999"); err == nil {
		t.Error("erwartete not-found-Fehler für DD2-999")
	}
}
