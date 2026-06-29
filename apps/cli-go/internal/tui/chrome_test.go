package tui

// Chrome-Refactor (DD2-25/30): globaler Header/Footer, 100% Höhe, scrollbarer Body.

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// framed füllt exakt die Terminalhöhe, hält den Footer und zeigt bei Overflow
// einen Scroll-Indikator — kein Abschneiden des Footers mehr (DD2-25).
func TestFramedFillsHeightKeepsFooter(t *testing.T) {
	long := strings.Repeat("Inhaltszeile\n", 100)
	m := model{width: 80, height: 12}
	out := m.framed("Title", long, "s: Status   esc: zurück")
	if h := lipgloss.Height(out); h != 12 {
		t.Errorf("framed-Höhe=%d, want 12 (volle Terminalhöhe)", h)
	}
	if !strings.Contains(out, "s: Status") {
		t.Error("Footer-Hinweis fehlt (abgeschnitten?)")
	}
	if !strings.Contains(out, "↓") {
		t.Error("Scroll-Indikator (mehr unten) fehlt trotz Overflow")
	}
}

// DD2-30: G scrollt den Detail-Body ans Ende → unterer Inhalt wird sichtbar.
func TestDetailScrollsToBottom(t *testing.T) {
	m := reproColumnsModel(viewDetailIssue, 2)
	m.height = 10 // kleines Terminal erzwingt Overflow
	mi, _ := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("G")})
	m = mi.(model)
	if m.scroll == 0 {
		t.Fatal("G hat den Scroll-Offset nicht erhöht")
	}
	if !strings.Contains(m.View(), "esc/q: back") {
		t.Error("Footer nach Scroll nicht sichtbar")
	}
	// g zurück an den Anfang
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("g")})
	if mi.(model).scroll != 0 {
		t.Error("g setzt den Scroll-Offset nicht auf 0 zurück")
	}
}

// DD2-25: Form-Höhe folgt dem Terminal (kurz → kleiner, gecappt, nie unter 5).
func TestFormInnerHeight(t *testing.T) {
	if got := formInnerHeight(0); got != 16 {
		t.Errorf("unbekannte Höhe: got %d, want 16 (konservativ)", got)
	}
	if got := formInnerHeight(24); got != 17 {
		t.Errorf("Terminal 24: got %d, want 17 (24-7)", got)
	}
	if got := formInnerHeight(60); got != 20 {
		t.Errorf("großes Terminal: got %d, want 20 (Cap)", got)
	}
	if got := formInnerHeight(10); got != 5 {
		t.Errorf("kurz: got %d, want 5 (Untergrenze, 10-7=3→5)", got)
	}
}

// DD2-25: die palette-gerahmte Form (formChrome) darf nie höher als das Terminal
// werden (sonst unten abgeschnitten). styleForm setzt WithHeight(formInnerHeight),
// formChrome addiert Header/Separator/Footer — Guard über kurze und große Terminals.
func TestFormModalNeverOverflows(t *testing.T) {
	for _, h := range []int{12, 14, 20, 24, 34, 50} {
		m := model{width: 90, height: h}
		mm, _ := m.openForm("issue")
		if box := lipgloss.Height(mm.(model).formChrome()); box > h {
			t.Errorf("Form-Chrome h=%d > Terminal h=%d (Overflow → abgeschnitten)", box, h)
		}
	}
}

// DD2-60: Breadcrumb-Header (`> slug: Title`) + globale Shortcuts; Split-Status
// zeigt Meldung (links) und kritischen Fehler (rechts) gleichzeitig.
func TestChromeBreadcrumbAndSplitStatus(t *testing.T) {
	m := model{width: 90, height: 14, status: "Kontext kopiert", errNote: "Clipboard-Fehler: x"}
	out := m.framed("Title", "body", "esc: zurück")
	for _, want := range []string{
		"> dd: Title",         // Breadcrumb mit Titel (Projekt nil → slug "dd")
		"p:project",           // globale Shortcuts rechts
		"esc: zurück",         // lokale Shortcuts (Zone 3)
		"Kontext kopiert",     // Status-Meldung (Zone 4 links)
		"Clipboard-Fehler: x", // kritischer Fehler (Zone 4 rechts)
	} {
		if !strings.Contains(out, want) {
			t.Errorf("Chrome-Ausgabe enthält %q nicht", want)
		}
	}
	if h := lipgloss.Height(out); h != 14 {
		t.Errorf("Chrome-Höhe=%d, want 14 (volle Terminalhöhe trotz 2 Footer-Zeilen)", h)
	}
}

// DD2-60 Review-Fix: keine Zeile überläuft die Terminalbreite — Body (inkl.
// langer Tokens), lokale Shortcuts und Breadcrumb brechen um/kürzen; Höhe stabil.
func TestChromeNeverOverflowsWidth(t *testing.T) {
	body := "Goal:\n" + strings.Repeat("x", 200) + "\nSatz mit vielen Wörtern zum Umbrechen hier."
	hint := strings.Repeat("k:Aktion  ", 20)
	for _, w := range []int{30, 40, 80} {
		m := model{width: w, height: 24}
		out := m.framed("Ein langer Screen-Titel", body, hint)
		for i, ln := range strings.Split(out, "\n") {
			if lw := lipgloss.Width(ln); lw > w {
				t.Errorf("w=%d: Zeile %d überläuft (%d > %d)", w, i, lw, w)
			}
		}
		if h := lipgloss.Height(out); h != 24 {
			t.Errorf("w=%d: Höhe=%d, want 24", w, h)
		}
	}
}
