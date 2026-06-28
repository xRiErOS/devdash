package tui

import (
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// DD2-54: renderPane darf KEIN Height() auf dem bordered Style setzen (Golden
// Rule #1). Die Gesamthöhe muss sich aus dem auf Innenhöhe gefüllten Content
// ergeben (h Content-Zeilen + 2 Border = h+2) — egal ob die Pane keine, wenige
// oder mehr Zeilen als Platz hat. Sonst kippt die Ausrichtung, sobald eine Zeile
// mal nicht truncatet wird. Jede Zeile bleibt exakt w+2 breit.
func TestRenderPaneHeightFromContent(t *testing.T) {
	const w, h = 30, 12
	cases := map[string]pane{
		"leer":     {title: "Leer", rows: nil, isList: true},
		"wenige":   {title: "Wenige", rows: []string{"a", "b", "c"}, cursor: 1, isList: true},
		"randvoll": {title: "Voll", rows: make([]string, 50), isList: true},
		"vorschau": {title: "Vorschau", rows: []string{"Zeile 1", "Zeile 2"}, isList: false},
	}
	for name, p := range cases {
		for _, focused := range []bool{false, true} {
			out := renderPane(p, w, h, focused)
			if got := lipgloss.Height(out); got != h+2 {
				t.Errorf("%s focused=%v: Höhe %d, erwartet %d (Content-Fill + Border, kein Height())", name, focused, got, h+2)
			}
			for i, ln := range strings.Split(out, "\n") {
				if got := lipgloss.Width(ln); got != w+2 {
					t.Errorf("%s focused=%v Zeile %d: Breite %d, erwartet %d", name, focused, i, got, w+2)
				}
			}
		}
	}
}

// TrueColor-Variante: gefärbte Marker (Cursor ▸, Header-Titel) dürfen Höhe/Breite
// nicht über ANSI-Bytes verfälschen (B06-Klasse) — lipgloss.Width/Height bleibt maßgeblich.
func TestRenderPaneHeightTrueColor(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)
	const w, h = 24, 8
	p := pane{title: "Issues", rows: []string{"DD2-1 Eins", "DD2-2 Zwei"}, cursor: 0, isList: true}
	out := renderPane(p, w, h, true)
	if got := lipgloss.Height(out); got != h+2 {
		t.Errorf("TrueColor: Höhe %d, erwartet %d", got, h+2)
	}
}
