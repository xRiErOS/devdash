package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

// DD2-215: Yank auf einen Sprint muss den vollständigen Kontext tragen — Issues,
// angehängte Dokumente UND die numerische ID/Key zur MCP/CLI-Identifikation.
func TestDD2215SprintClipHasIDKeyAndDocuments(t *testing.T) {
	g := "Layout-Politur"
	s := &api.Sprint{ID: 305, Key: "DD2#44", Name: "S-D", Status: "in_progress", Goal: &g,
		ItemCount: 1, DoneCount: 0,
		Items: []api.Issue{{ID: 1855, Key: "DD2-215", Title: "Yank unvollständig"}}}
	docs := []api.Document{{ID: 12, Title: "Worktree & Merge-Order", Body: "Merge zuletzt.", Status: "active"}}

	out := sprintClip(s, docs)
	for _, want := range []string{
		"- ID: 305",              // numerische ID
		"- Key: DD2#44",          // Key fürs MCP/CLI
		"DD2-215",                // Issue-Zeile
		"## Documents (1)",       // Dokumente-Sektion
		"Worktree & Merge-Order", // Doc-Titel
		"Merge zuletzt.",         // Doc-Body
	} {
		if !strings.Contains(out, want) {
			t.Errorf("sprintClip fehlt %q:\n%s", want, out)
		}
	}
}

// Ohne Dokumente darf keine (leere) Documents-Sektion erscheinen.
func TestDD2215SprintClipNoDocsSection(t *testing.T) {
	s := &api.Sprint{ID: 1, Key: "DD2#1", Name: "S", Items: []api.Issue{{ID: 1, Key: "DD2-1", Title: "A"}}}
	if strings.Contains(sprintClip(s, nil), "## Documents") {
		t.Error("leere Doc-Liste soll keine Documents-Sektion rendern")
	}
}
