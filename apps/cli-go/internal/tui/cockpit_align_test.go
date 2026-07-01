package tui

// DD2-53: lipgloss.Width zählt East-Asian-Ambiguous-Glyphen (◆ ● ○ • …) als 1,
// ein ambiguous=wide-Terminal rendert sie als 2 → die rechten Spalten verrutschen
// NUR dort. Da go test keine TTY hat und displaywidth Ambiguous immer 1 nennt, ist
// die einzige terminal-unabhängige Garantie: KEIN gerenderter Glyph darf Ambiguous
// sein. Dieser Test pinnt genau das (hätte ◆/● gefangen).

import (
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/x/ansi"
	"golang.org/x/text/width"
)

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
	for _, st := range []string{"new", "planned", "cancelled", "rejected", "in_progress", "to_review", "passed", "completed"} {
		if r, bad := hasAmbiguous(statusDot(st)); bad {
			t.Errorf("statusDot(%q) nutzt Ambiguous-Glyph U+%04X %q", st, r, string(r))
		}
	}

	// Ganze Cockpit-Zeile inkl. reviewBadge.
	for _, it := range []api.Issue{
		{Key: "DD2-1", Title: "X", Type: "bug", Priority: 1, Status: "passed"},
		{Key: "DD2-2", Title: "Y", Type: "feature", Priority: 3, Status: "in_progress"},
	} {
		typePrio := theme.TypeIcon(it.Type) + " " + theme.Priority(it.Priority)
		row := cockpitRow(typePrio, it.Key, truncate(it.Title, colTitle),
			statusText(it.Status), reviewBadge(it))
		if r, bad := hasAmbiguous(row); bad {
			t.Errorf("cockpitRow(%s) nutzt Ambiguous-Glyph U+%04X %q", it.Key, r, string(r))
		}
	}
}
