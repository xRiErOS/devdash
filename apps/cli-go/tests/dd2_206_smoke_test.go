package tests

// DD2-206: Smoke-Test von 5 generierten Client-Funcs (generated.go, DD2-204) gegen
// echte lokale API-Calls, quer über GET/POST/PUT/DELETE. Läuft nur, wenn eine lokale
// API erreichbar ist (npm run dev) — sonst Skip, damit `go test ./...` in Umgebungen
// ohne Dev-Server nicht flakey wird.

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"
	"time"

	"devd-cli/internal/api"
	"devd-cli/internal/api/generated"
)

func localAPIReachable(baseURL string) bool {
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(baseURL + "/api/projects")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 500
}

func TestDD2_206_GeneratedFuncsSmoke(t *testing.T) {
	baseURL := "http://localhost:5556"
	if !localAPIReachable(baseURL) {
		t.Skip("lokale API nicht erreichbar (npm run dev) — Smoke-Test übersprungen")
	}
	t.Setenv("DEVD_API_URL", baseURL)
	c := api.NewClient("2") // lokale Dev-DB: project_id=2 (devd/DD) statt devd2/10 (nur in NAS-Prod)

	// 1) GET — MilestoneList
	if raw, err := c.MilestoneList(generated.MilestoneListArgs{}); err != nil {
		t.Fatalf("MilestoneList: %v", err)
	} else {
		var list []any
		if err := json.Unmarshal(raw, &list); err != nil {
			t.Fatalf("MilestoneList response not a JSON array: %v (%s)", err, raw)
		}
	}

	// 2) POST — IssueCreate
	// type ist im MCP-Zod-Schema optional, im Backend-Contract (backlog.contracts.js:39)
	// aber Pflicht — vorbestehender Schema-Mismatch (B-Fund, nicht DD2#35-Scope), darum
	// hier explizit gesetzt.
	title := "DD2-206 smoke test issue"
	issueType := generated.IssueCreateArgsTypeFeature
	raw, err := c.IssueCreate(generated.IssueCreateArgs{Title: title, Type: &issueType})
	if err != nil {
		t.Fatalf("IssueCreate: %v", err)
	}
	var created struct {
		ID    int    `json:"id"`
		Title string `json:"title"`
	}
	if err := json.Unmarshal(raw, &created); err != nil {
		t.Fatalf("IssueCreate response: %v (%s)", err, raw)
	}
	if created.ID == 0 || created.Title != title {
		t.Fatalf("IssueCreate: unexpected response %s", raw)
	}

	// 3) PUT — IssueUpdate (exercises ResolveIssueID via id_or_key path resolution too)
	newGoal := "created + updated by DD2-206 smoke test"
	idOrKey := strconv.Itoa(created.ID)
	raw, err = c.IssueUpdate(generated.IssueUpdateArgs{IdOrKey: idOrKey, Goal: &newGoal})
	if err != nil {
		t.Fatalf("IssueUpdate: %v", err)
	}
	var updated struct {
		Goal string `json:"goal"`
	}
	if err := json.Unmarshal(raw, &updated); err != nil {
		t.Fatalf("IssueUpdate response: %v (%s)", err, raw)
	}
	if updated.Goal != newGoal {
		t.Fatalf("IssueUpdate: goal = %q, want %q", updated.Goal, newGoal)
	}

	// 4) GET — BacklogExport (query-string building: format=json)
	format := generated.BacklogExportArgsFormatJson
	if raw, err := c.BacklogExport(generated.BacklogExportArgs{Format: &format}); err != nil {
		t.Fatalf("BacklogExport: %v", err)
	} else if len(raw) == 0 {
		t.Fatalf("BacklogExport: empty response")
	}

	// 5) DELETE — IssueDelete (force=true, cleanup)
	force := true
	if _, err := c.IssueDelete(generated.IssueDeleteArgs{IdOrKey: idOrKey, Force: &force}); err != nil {
		t.Fatalf("IssueDelete: %v", err)
	}
}
