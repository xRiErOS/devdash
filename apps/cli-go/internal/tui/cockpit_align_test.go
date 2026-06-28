package tui

// DD2-B06: Das Cockpit padded gefärbte Spalten mit fmt %-Ns — das zählt ANSI-Bytes
// als Breite, sodass die rechten Spalten unter echter Farbe nach links kollabieren
// und der Ergebnis-Dot NICHT mehr unter seiner Überschrift "Ergebnisse" steht.
// Golden-Tests laufen im Ascii-Profil (ANSI gestrippt) und verfehlen genau diesen
// Fall — darum zwingt dieser Test TrueColor und prüft die sichtbare Spaltenlage.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
	"golang.org/x/text/width"
)

func TestCockpitDotAlignsUnderColor(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii) // Golden-Tests erwarten Ascii

	rs, res := "passed", "done"
	it := api.Issue{Key: "DD2-24", Title: "Beispiel-Issue", Type: "bug", Priority: 1,
		Status: "passed", ReviewStatus: &rs, Result: &res}
	typePrio := theme.TypeIcon(it.Type) + " " + theme.Priority(it.Priority)

	row := cockpitRow(typePrio, it.Key, truncate(it.Title, colTitle),
		statusText(it.Status), reviewBadge(it), resultDot(it))
	hdr := cockpitRow("Typ", "Kennung", "Titel", "Status", "Review-Verdikt", "Ergebnisse")

	rowV, hdrV := ansi.Strip(row), ansi.Strip(hdr)

	dotByte := strings.IndexRune(rowV, '◉')
	ergByte := strings.Index(hdrV, "Ergebnisse")
	if dotByte < 0 || ergByte < 0 {
		t.Fatalf("Marker fehlt: dot=%d erg=%d\nROW:[%s]\nHDR:[%s]", dotByte, ergByte, rowV, hdrV)
	}
	dotCol := lipgloss.Width(rowV[:dotByte]) // sichtbare Spalte, nicht Byte-Offset
	ergCol := lipgloss.Width(hdrV[:ergByte])

	// Erwartete Spalte aus den Konstanten: typPrio+sp+key+sp+title+sp+status+sp+verdikt+sp
	want := colTypePrio + 1 + colKey + 1 + colTitle + 1 + colStatus + 1 + colVerdikt + 1
	if dotCol != ergCol {
		t.Errorf("Ergebnis-Dot bei Spalte %d, 'Ergebnisse'-Header bei Spalte %d — unter Farbe verrutscht\nHDR:[%s]\nROW:[%s]", dotCol, ergCol, hdrV, rowV)
	}
	if dotCol != want {
		t.Errorf("Dot bei Spalte %d, erwartet %d (cockpitCols-Drift)", dotCol, want)
	}
}

// DD2-53: Der Dot-Test oben prüft die SICHTBARE Lage unter Farbe (B06-Klasse). Er
// kann aber das terminalseitige Risiko NICHT sehen: lipgloss.Width zählt East-
// Asian-Ambiguous-Glyphen (◆ ● ○ • …) als 1, ein ambiguous=wide-Terminal rendert
// sie als 2 → die rechten Spalten verrutschen NUR dort. Da go test keine TTY hat
// und displaywidth Ambiguous immer 1 nennt, ist die einzige terminal-unabhängige
// Garantie: KEIN gerenderter Glyph darf Ambiguous sein. Dieser Test pinnt genau das
// (hätte ◆/● gefangen) — Ergänzung statt Glyph-Lage zu simulieren.
func TestCockpitGlyphsUnambiguous(t *testing.T) {
	hasAmbiguous := func(s string) (rune, bool) {
		for _, r := range ansi.Strip(s) {
			if r == ' ' || r == '\n' {
				continue
			}
			if width.LookupRune(r).Kind() == width.EastAsianAmbiguous {
				return r, true
			}
		}
		return 0, false
	}

	// Alle Issue-Typen + Fallback (theme.TypeIcon).
	for _, typ := range []string{"bug", "feature", "improvement", "core", "unbekannt"} {
		if r, bad := hasAmbiguous(theme.TypeIcon(typ)); bad {
			t.Errorf("TypeIcon(%q) nutzt Ambiguous-Glyph U+%04X %q — verrutscht auf ambiguous=wide", typ, r, string(r))
		}
	}

	// statusDot über alle Form-Zweige (hohl/abgebrochen/gefüllt).
	for _, st := range []string{"planned", "cancelled", "rejected", "active", "in_progress", "passed", "done"} {
		if r, bad := hasAmbiguous(statusDot(st)); bad {
			t.Errorf("statusDot(%q) nutzt Ambiguous-Glyph U+%04X %q", st, r, string(r))
		}
	}

	// resultDot (gepflegt/fehlt) + ganze Cockpit-Zeile inkl. reviewBadge.
	withRes, noRes := "done", ""
	for _, it := range []api.Issue{
		{Key: "DD2-1", Title: "X", Type: "bug", Priority: 1, Status: "passed", Result: &withRes},
		{Key: "DD2-2", Title: "Y", Type: "feature", Priority: 3, Status: "in_progress", Result: &noRes},
	} {
		typePrio := theme.TypeIcon(it.Type) + " " + theme.Priority(it.Priority)
		row := cockpitRow(typePrio, it.Key, truncate(it.Title, colTitle),
			statusText(it.Status), reviewBadge(it), resultDot(it))
		if r, bad := hasAmbiguous(row); bad {
			t.Errorf("cockpitRow(%s) nutzt Ambiguous-Glyph U+%04X %q", it.Key, r, string(r))
		}
	}
}
