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
	g, bg := "Target", "Hintergrund"
	return model{
		view: viewBrowseBacklog,
		backlog: []api.Issue{
			{ID: 1, Key: "DD2-1", Title: "A", Type: "bug", Priority: 1, Status: "new", Goal: &g, Background: &bg},
			{ID: 2, Key: "DD2-2", Title: "B", Type: "feature", Priority: 2, Status: "planned"},
		},
		blist:   listState{length: 2, cursor: 0},
		accOpen: 1, // Detail-Preview: erste Content-Section offen (Listen-Modus)
	}
}

// D01: l/→ (und enter) auf der Liste verlagert den Fokus in die Detail-Pane
// (geteilte Maschine): secCursor=0 (Übersicht), Accordion zu.
func TestBacklogEnterDetailFocus(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l"))
	m := mi.(model)
	if !m.detailFocus {
		t.Fatal("l/→ sollte detailFocus setzen")
	}
	if m.secCursor != 0 || m.accOpen != 0 {
		t.Errorf("secCursor=%d accOpen=%d, want 0/0 (Übersicht)", m.secCursor, m.accOpen)
	}
	me, _ := backlogMDModel().keyBacklog(key("enter"))
	if !me.(model).detailFocus {
		t.Error("enter sollte ebenfalls detailFocus setzen")
	}
}

// D02: i/k bewegt im Detail-Fokus den Section-Cursor (geklemmt); die offene Content-
// Section folgt (accOpen = secCursor, da Übersicht Index 0 ist). focusSections =
// [Übersicht, Goal, Background] → secCursor 0..2.
func TestBacklogDetailSectionNav(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l"))
	m := mi.(model)
	mi, _ = m.keyBacklog(key("k")) // Übersicht → Content-Section 1
	m = mi.(model)
	if m.secCursor != 1 || m.accOpen != 1 {
		t.Errorf("k → secCursor=%d accOpen=%d, want 1/1", m.secCursor, m.accOpen)
	}
	mi, _ = m.keyBacklog(key("k")) // → Content-Section 2
	m = mi.(model)
	if m.secCursor != 2 || m.accOpen != 2 {
		t.Errorf("k → secCursor=%d accOpen=%d, want 2/2", m.secCursor, m.accOpen)
	}
	// Am Ende geklemmt: bis zur letzten Section laufen (DD2-144 fügt Relevant-Files/
	// User-Stories hinzu → Anzahl dynamisch).
	last := len(m.focusSections()) - 1
	for j := 0; j < last+2; j++ {
		mi, _ = m.keyBacklog(key("k"))
		m = mi.(model)
	}
	if m.secCursor != last {
		t.Errorf("k geklemmt → secCursor=%d, want %d", m.secCursor, last)
	}
	mi, _ = m.keyBacklog(key("i")) // hoch zurück
	m = mi.(model)
	if m.secCursor != last-1 || m.accOpen != last-1 {
		t.Errorf("i → secCursor=%d accOpen=%d, want %d/%d", m.secCursor, m.accOpen, last-1, last-1)
	}
}

// D02: Ziffer 1..n = Direktsprung in die Content-Section (focusSections-Index n).
func TestBacklogDetailDigitJump(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l"))
	mi, _ = mi.(model).keyBacklog(key("2")) // Content-Section 2
	m := mi.(model)
	if m.secCursor != 2 || m.accOpen != 2 {
		t.Errorf("Ziffer 2 → secCursor=%d accOpen=%d, want 2/2", m.secCursor, m.accOpen)
	}
}

// D02: j/← (auf oberster Section) und esc geben den Fokus an die Liste zurück.
func TestBacklogDetailBackToList(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l"))
	mj, _ := mi.(model).keyBacklog(key("j"))
	if mj.(model).detailFocus {
		t.Error("j/← auf oberster Section sollte zurück zur Liste (detailFocus=false)")
	}
	me, _ := mi.(model).keyBacklog(key("esc"))
	if me.(model).detailFocus {
		t.Error("esc sollte zurück zur Liste (detailFocus=false)")
	}
}

// Liste: i/k bewegt den Listen-Cursor und setzt die Detail-Preview zurück.
func TestBacklogListNav(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("k"))
	m := mi.(model)
	if m.blist.cursor != 1 {
		t.Errorf("k → cursor=%d, want 1", m.blist.cursor)
	}
	if m.secCursor != 0 || m.accOpen != 1 {
		t.Errorf("Auswahl-Wechsel sollte Preview zurücksetzen: secCursor=%d accOpen=%d, want 0/1", m.secCursor, m.accOpen)
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
	out := ansi.Strip(m.viewBrowseBacklog())
	if !strings.Contains(out, "DD2-1") {
		t.Errorf("Detail-Pane zeigt das selektierte Issue nicht: %q", out)
	}
	if !strings.Contains(out, "Target") {
		t.Errorf("offene Section (Goal) fehlt im Detail: %q", out)
	}

	// D03: bei Detail-Fokus ist der rechte Pane Mauve.
	l, r := paneBorderColors(m.detailFocus)
	if l != theme.Mauve || r != theme.Overlay {
		t.Errorf("Listen-Fokus: left=%v right=%v, want Mauve/Overlay", l, r)
	}
	l, r = paneBorderColors(true)
	if l != theme.Overlay || r != theme.Mauve {
		t.Errorf("Detail-Fokus: left=%v right=%v, want Overlay/Mauve", l, r)
	}
}
