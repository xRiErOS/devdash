package tui

// DD2-186: Der Accordion-Body wird von issueSections auf bodyW = w-2 vorgewrappt.
// renderAccordion darf ihn NICHT in eine engere Box rendern (sonst Re-Wrap/Overflow).
// Mit Width(w).PaddingLeft(2) ist die effektive Content-Breite w-2 == bodyW.

import (
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

func TestDD2186_AccordionBodyNoReWrap(t *testing.T) {
	const w = 60
	bodyW := w - 2 // exakt die Wrap-Breite, die die Caller an issueSections geben

	// Body = eine Zeile aus genau bodyW unbrechbaren Zeichen (worst case: lange
	// URL/ANSI-Token). Darf in der Box NICHT umbrechen.
	body := strings.Repeat("X", bodyW)
	secs := []accordionSection{{title: "Sec", body: body}}
	out := renderAccordion(secs, 1, w, detailFocusView{})

	for _, l := range strings.Split(out, "\n") {
		if got := lipgloss.Width(l); got > w {
			t.Errorf("Zeile überläuft Pane: Breite %d > w %d — %q", got, w, ansi.Strip(l))
		}
	}
	// Genau eine Body-Zeile (Header + 1) — kein Re-Wrap der bodyW-breiten Zeile.
	xLines := 0
	for _, l := range strings.Split(out, "\n") {
		if strings.Contains(ansi.Strip(l), "X") {
			xLines++
		}
	}
	if xLines != 1 {
		t.Errorf("Body in %d Zeilen umgebrochen, want 1 (kein Re-Wrap bei bodyW=w-2)", xLines)
	}
}
