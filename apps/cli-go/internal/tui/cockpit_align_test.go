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

	dotByte := strings.IndexRune(rowV, '●')
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
