package tui

// DD2-217: Das aktuelle (gefilterte/sortierte) Backlog als Markdown yanken (y).
// Spiegelt das Test-Muster von DD2-157 (reine Markdown-Builder-Prüfung) — der
// clip.Copy-Pfad selbst wird nicht getestet (Seiteneffekt OSC52/pbcopy).

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

// Der Export ist Markdown (kein JSON): Kopf mit Issue-Zahl, Tabellen-Header, je
// eine Zeile pro Issue mit Plain-Priority (P<n>, kein ANSI) und pipe-escaptem Titel.
func TestBacklogClipMarkdown(t *testing.T) {
	poNote := "API returns 500 on empty filter"
	vis := []api.Issue{
		{Key: "DD2-2", Title: "Crash | beheben", Type: "bug", Priority: 1, Status: "planned", PoNotes: &poNote},
		{Key: "DD2-1", Title: "Login bauen", Type: "feature", Priority: 3, Status: "new"},
	}
	md := backlogClip(vis, "")
	if !strings.HasPrefix(md, "# Backlog (2 issues)") {
		t.Errorf("Kopf mit Zahl fehlt:\n%s", md)
	}
	if strings.HasPrefix(strings.TrimSpace(md), "{") || strings.HasPrefix(strings.TrimSpace(md), "[") {
		t.Errorf("Ausgabe sieht nach JSON aus statt Markdown:\n%s", md)
	}
	for _, want := range []string{
		"| Key | Type | Prio | Status | Title | PO-Notes |",
		"| DD2-2 | bug | P1 | planned | Crash \\| beheben | API returns 500 on empty filter |",
		"| DD2-1 | feature | P3 | new | Login bauen |  |", // PO-Notes leer (nil) → leere Zelle
	} {
		if !strings.Contains(md, want) {
			t.Errorf("backlogClip fehlt %q\n%s", want, md)
		}
	}
	if strings.Contains(md, "- Filter:") {
		t.Errorf("unerwartete Filter-Zeile bei leerem Summary:\n%s", md)
	}
}

// Ist eine Filter-/Sort-/Such-Zusammenfassung gesetzt, erscheint sie als Filter-Zeile
// im Kopf (Kontext, welcher Ausschnitt kopiert wurde).
func TestBacklogClipWithFilterSummary(t *testing.T) {
	md := backlogClip([]api.Issue{
		{Key: "DD2-2", Title: "x", Type: "bug", Priority: 1, Status: "new"},
	}, "Type:bug Sort:title Search:login")
	if !strings.Contains(md, "- Filter: Type:bug Sort:title Search:login") {
		t.Errorf("Filter-Zeile fehlt:\n%s", md)
	}
}

// y im Listen-Fokus kopiert das sichtbare Backlog und meldet die Anzahl im Status
// (oder setzt errNote bei Clipboard-Fehler) — die Taste ist verdrahtet.
func TestBacklogYankKeyWired(t *testing.T) {
	m := backlogFilterModel()
	out, _ := m.keyBacklog(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'y'}})
	mm := out.(model)
	if mm.toast == nil && mm.errNote == "" {
		t.Error("y im Backlog erzeugte weder Toast noch errNote — Taste nicht verdrahtet")
	}
}

// Leeres (gefiltertes) Backlog: y meldet 'nothing to copy', kein leerer Export.
func TestBacklogYankEmpty(t *testing.T) {
	m := backlogFilterModel()
	m.blSearch = textinput.New()
	m.blQuery = "zzz-no-match-zzz"
	out, _ := m.keyBacklog(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'y'}})
	mm := out.(model)
	if mm.toast == nil || !strings.Contains(strings.ToLower(mm.toast.title), "empty") {
		t.Errorf("leeres Backlog-Yank → Toast %+v, want 'empty…'", mm.toast)
	}
}
