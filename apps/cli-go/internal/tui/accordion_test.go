package tui

// DD2-50: Accordion-Detail — Default-offen, Ziffern-Toggle (exklusiv), nur
// vorhandene Sektionen, Sektion 1 zweispaltig (Goal+Beschreibung | PO-Notes).

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"
)

func TestAccordionDefaultOpenOne(t *testing.T) {
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	if m.accOpen != 1 {
		t.Errorf("accOpen default = %d, want 1 (erste Section offen)", m.accOpen)
	}
}

// Ziffer wechselt/schließt exklusiv: gleiche Ziffer toggelt zu, andere wechselt.
func TestTreeDigitTogglesAccordion(t *testing.T) {
	key := func(s string) tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)} }
	m := treeModel()
	m.view = viewTree
	m.accOpen = 1

	if mm, _ := m.keyTree(key("2")); mm.(model).accOpen != 2 {
		t.Errorf("2 → accOpen %d, want 2", mm.(model).accOpen)
	}
	m.accOpen = 2
	if mm, _ := m.keyTree(key("2")); mm.(model).accOpen != 0 {
		t.Errorf("2 auf offener Section → accOpen %d, want 0 (zu)", mm.(model).accOpen)
	}
	if mm, _ := m.keyTree(key("3")); mm.(model).accOpen != 3 {
		t.Errorf("3 → accOpen %d, want 3", mm.(model).accOpen)
	}
}

// Nur Sektionen mit Inhalt; Sektion 1 enthält Goal- UND PO-Notes-Text (zweispaltig).
func TestIssueSectionsPresentOnly(t *testing.T) {
	g, d, po, bg := "Das Ziel", "Die Beschreibung", "PO sagt dies", "Hintergrund"
	it := api.Issue{Key: "DD2-1", Title: "T", Type: "bug", Priority: 1, Status: "in_progress",
		Goal: &g, Description: &d, PoNotes: &po, Background: &bg}
	m := treeModel()
	secs := m.issueSections(it, 60)

	if len(secs) != 2 {
		t.Fatalf("Sektionen=%d, want 2 (Goal/Po + Background); Result/Review fehlen", len(secs))
	}
	if !strings.Contains(secs[0].title, "Goal") {
		t.Errorf("Section 1 Titel=%q", secs[0].title)
	}
	flat := ansi.Strip(secs[0].body)
	if !strings.Contains(flat, "Das Ziel") || !strings.Contains(flat, "PO sagt dies") {
		t.Errorf("Section 1 nicht zweispaltig (Goal+PO): %q", flat)
	}
	if !strings.Contains(secs[1].title, "Background") {
		t.Errorf("Section 2 Titel=%q, want Background", secs[1].title)
	}
}

// Exklusiv: nur der Body der offenen Section erscheint; alle Header sind da.
func TestRenderAccordionExclusiveOpen(t *testing.T) {
	secs := []accordionSection{
		{title: "Eins", body: "BODY-EINS"},
		{title: "Zwei", body: "BODY-ZWEI"},
		{title: "Drei", body: "BODY-DREI"},
	}
	out := ansi.Strip(renderAccordion(secs, 2, 60, detailFocusView{}))
	if !strings.Contains(out, "[1]") || !strings.Contains(out, "[2]") || !strings.Contains(out, "[3]") {
		t.Errorf("nicht alle Section-Header da: %q", out)
	}
	if !strings.Contains(out, "BODY-ZWEI") {
		t.Errorf("offene Section-2-Body fehlt: %q", out)
	}
	if strings.Contains(out, "BODY-EINS") || strings.Contains(out, "BODY-DREI") {
		t.Errorf("geschlossene Section-Bodies sichtbar (nicht exklusiv): %q", out)
	}
}
