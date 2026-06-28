package tui

// DD2-32: Backlog als Master-Detail (Liste links, read-only Detail-Preview rechts).
// Zwei-Pane-Fokus (Liste↔Detail, D01-D03), Section-Navigation im Detail (read-only).
// Der Schreibpfad (Inline-Edit) folgt in DD2-74. Guardrail: tui-plan.md.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// backlogMDModel: Backlog-View mit zwei Issues. Issue 1 hat Goal+Background → zwei
// Detail-Sektionen; Issue 2 ist feldarm (nur Kopf-Meta).
func backlogMDModel() model {
	g, bg := "Ziel", "Hintergrund"
	return model{
		view: viewBacklog,
		backlog: []api.Issue{
			{ID: 1, Key: "DD2-1", Title: "A", Type: "bug", Priority: 1, Status: "new", Goal: &g, Background: &bg},
			{ID: 2, Key: "DD2-2", Title: "B", Type: "feature", Priority: 2, Status: "planned"},
		},
		blist:     listState{length: 2, cursor: 0},
		blAccOpen: 1,
	}
}

// D01: l/→ (und enter) auf der Liste verlagert den Fokus in die Detail-Pane;
// blSec=0, erste Section offen.
func TestBacklogEnterDetailFocus(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l"))
	m := mi.(model)
	if !m.blFocus {
		t.Fatal("l/→ sollte blFocus setzen")
	}
	if m.blSec != 0 || m.blAccOpen != 1 {
		t.Errorf("blSec=%d blAccOpen=%d, want 0/1", m.blSec, m.blAccOpen)
	}
	me, _ := backlogMDModel().keyBacklog(key("enter"))
	if !me.(model).blFocus {
		t.Error("enter sollte ebenfalls blFocus setzen")
	}
}

// D02: i/k bewegt im Detail-Fokus den Section-Cursor (geklemmt); die offene
// Accordion-Section folgt (blAccOpen = blSec+1).
func TestBacklogDetailSectionNav(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l"))
	m := mi.(model)
	mi, _ = m.keyBacklog(key("k")) // runter: Section 1 → 2
	m = mi.(model)
	if m.blSec != 1 || m.blAccOpen != 2 {
		t.Errorf("k → blSec=%d blAccOpen=%d, want 1/2", m.blSec, m.blAccOpen)
	}
	mi, _ = m.keyBacklog(key("k")) // am Ende (2 Sektionen) geklemmt
	m = mi.(model)
	if m.blSec != 1 {
		t.Errorf("k geklemmt → blSec=%d, want 1", m.blSec)
	}
	mi, _ = m.keyBacklog(key("i")) // hoch zurück
	m = mi.(model)
	if m.blSec != 0 || m.blAccOpen != 1 {
		t.Errorf("i → blSec=%d blAccOpen=%d, want 0/1", m.blSec, m.blAccOpen)
	}
}

// D02: Ziffer 1..n = Direktsprung in die Section.
func TestBacklogDetailDigitJump(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l"))
	mi, _ = mi.(model).keyBacklog(key("2"))
	m := mi.(model)
	if m.blSec != 1 || m.blAccOpen != 2 {
		t.Errorf("Ziffer 2 → blSec=%d blAccOpen=%d, want 1/2", m.blSec, m.blAccOpen)
	}
}

// D02: j/← und esc geben den Fokus an die Liste zurück.
func TestBacklogDetailBackToList(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l"))
	mj, _ := mi.(model).keyBacklog(key("j"))
	if mj.(model).blFocus {
		t.Error("j/← sollte zurück zur Liste (blFocus=false)")
	}
	me, _ := mi.(model).keyBacklog(key("esc"))
	if me.(model).blFocus {
		t.Error("esc sollte zurück zur Liste (blFocus=false)")
	}
}

// Liste: i/k bewegt den Listen-Cursor und setzt das Detail zurück.
func TestBacklogListNav(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("k"))
	m := mi.(model)
	if m.blist.cursor != 1 {
		t.Errorf("k → cursor=%d, want 1", m.blist.cursor)
	}
	if m.blSec != 0 || m.blAccOpen != 1 {
		t.Errorf("Auswahl-Wechsel sollte Detail zurücksetzen: blSec=%d blAccOpen=%d", m.blSec, m.blAccOpen)
	}
}

// backlogSelected liefert das Issue unter dem Cursor (bounds-sicher).
func TestBacklogSelected(t *testing.T) {
	m := backlogMDModel()
	if it := m.backlogSelected(); it == nil || it.Key != "DD2-1" {
		t.Fatalf("backlogSelected = %v, want DD2-1", it)
	}
	m.blist.cursor = 9 // out of range
	if m.backlogSelected() != nil {
		t.Error("out-of-range cursor sollte nil liefern")
	}
	m.backlog = nil
	m.blist.cursor = 0
	if m.backlogSelected() != nil {
		t.Error("leeres Backlog sollte nil liefern")
	}
}

// Render: das selektierte Issue erscheint mit Titel + Status + offener Section im
// rechten Pane; die Pane-Border tauscht je Fokus (D03).
func TestBacklogViewRendersDetail(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := backlogMDModel()
	m.width, m.height = 120, 30
	out := ansi.Strip(m.viewBacklog())
	if !strings.Contains(out, "DD2-1") {
		t.Errorf("Detail-Pane zeigt das selektierte Issue nicht: %q", out)
	}
	if !strings.Contains(out, "Ziel") {
		t.Errorf("offene Section (Goal) fehlt im Detail: %q", out)
	}

	// D03: bei Detail-Fokus ist der rechte Pane Mauve.
	l, r := paneBorderColors(m.blFocus)
	if l != theme.Mauve || r != theme.Overlay {
		t.Errorf("Listen-Fokus: left=%v right=%v, want Mauve/Overlay", l, r)
	}
	l, r = paneBorderColors(true)
	if l != theme.Overlay || r != theme.Mauve {
		t.Errorf("Detail-Fokus: left=%v right=%v, want Overlay/Mauve", l, r)
	}
}
