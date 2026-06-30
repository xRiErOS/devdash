package theme

// DD2-194: DEVD_ASCII_ICONS schaltet Type-/Status-Icons auf garantiert darstellbare
// ASCII-Glyphen um (Terminals/Fonts ohne Unicode-Geometrie-Coverage, z.B. WezTerm/
// macOS). ASCII ist trivial EAW-Neutral → kein Spalten-Drift.

import (
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestDD2194_ASCIIIconFallback(t *testing.T) {
	t.Setenv("DEVD_ASCII_ICONS", "1")

	// Type-Icons: ASCII, distinkt pro Typ, single-cell.
	seen := map[string]bool{}
	for _, typ := range []string{"bug", "feature", "improvement", "core"} {
		g := ansi.Strip(TypeIcon(typ))
		if len(g) != 1 || g[0] > 127 {
			t.Errorf("TypeIcon(%q)=%q ist nicht ASCII-single-cell", typ, g)
		}
		if seen[g] {
			t.Errorf("TypeIcon(%q)=%q nicht distinkt", typ, g)
		}
		seen[g] = true
	}
	// Unbekannter Typ → ASCII-Fallback ".".
	if g := ansi.Strip(TypeIcon("unknown")); g != "." {
		t.Errorf("TypeIcon(unknown)=%q, want \".\"", g)
	}
	// Status: einheitlicher ASCII-Glyph "*".
	if g := ansi.Strip(StatusIcon("in_progress")); g != "*" {
		t.Errorf("StatusIcon ASCII=%q, want \"*\"", g)
	}
}

func TestDD2194_DefaultStaysUnicode(t *testing.T) {
	t.Setenv("DEVD_ASCII_ICONS", "") // explizit aus
	if g := ansi.Strip(TypeIcon("bug")); g == "!" {
		t.Errorf("ohne DEVD_ASCII_ICONS sollte TypeIcon(bug) Unicode bleiben, got %q", g)
	}
}
