package tui

import (
	"strings"

	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

// overlayPad = Hintergrund-Füllung für schmale Modal-Zeilen. Alle Modal-Boxen
// nutzen theme.Base als Hintergrund → die Auffüllung trägt dieselbe Farbe, damit
// kein Terminal-Default-Streifen entsteht (sonst wirkt der Form-Footer löchrig).
var overlayPad = lipgloss.NewStyle().Background(theme.Base)

// canvasLines normalisiert bg auf ein lückenloses tw×th-Rechteck mit theme.Base-
// Hintergrund (DD2-216): jede Zelle, die das Overlay nicht selbst belegt — Streifen
// links/rechts neben der Box, Zeilen unter dem Frame — ist dann Base statt Terminal-
// Default (schwarz). spliceLine schneidet anschließend aus einer voll Base-gefüllten
// bg-Zeile, sodass kein plain-space-Pad mehr entsteht. Root-Fix statt Consumer-Patch.
func canvasLines(bg string, tw, th int) []string {
	lines := strings.Split(bg, "\n")
	if tw <= 0 {
		return lines // Breite unbekannt (Init/Tests) → bg unverändert lassen
	}
	n := len(lines)
	if th > n {
		n = th
	}
	out := make([]string, 0, n)
	for i := 0; i < n; i++ {
		var l string
		if i < len(lines) {
			l = lines[i]
		}
		if pad := tw - ansi.StringWidth(l); pad > 0 {
			l += overlayPad.Render(strings.Repeat(" ", pad))
		}
		out = append(out, l)
	}
	return out
}

// placeOverlay legt fg zentriert über bg (Painter's Algorithm, ANSI-sicher).
// bg bleibt rundherum sichtbar — nur die vom Modal belegten Zellen werden
// überschrieben. Kein Z-Index in Bubble Tea, daher Zeilen-Compositing.
func placeOverlay(bg, fg string, tw, th int) string {
	bgLines := canvasLines(bg, tw, th) // DD2-216: voll Base-gefüllte Leinwand
	fgLines := strings.Split(fg, "\n")

	fgW := 0
	for _, l := range fgLines {
		if w := ansi.StringWidth(l); w > fgW {
			fgW = w
		}
	}
	fgH := len(fgLines)

	bgW := tw
	if bgW <= 0 {
		for _, l := range bgLines {
			if w := ansi.StringWidth(l); w > bgW {
				bgW = w
			}
		}
	}

	x := (bgW - fgW) / 2
	if x < 0 {
		x = 0
	}
	y := (len(bgLines) - fgH) / 2
	if y < 0 {
		y = 0
	}

	for i, fl := range fgLines {
		row := y + i
		if row < 0 || row >= len(bgLines) {
			continue
		}
		// Jede fg-Zeile auf die einheitliche Modal-Breite fgW auffüllen, sonst
		// verdecken schmalere Zeilen (huh-Form-Hilfszeile/Leerzeilen) den
		// Hintergrund nicht und der Text dahinter blutet durch (PO-Befund: trans-
		// parenter Form-Footer). Das Modal muss ein lückenloses Rechteck sein.
		if pad := fgW - ansi.StringWidth(fl); pad > 0 {
			fl += overlayPad.Render(strings.Repeat(" ", pad))
		}
		bgLines[row] = spliceLine(bgLines[row], fl, x, fgW)
	}
	return strings.Join(bgLines, "\n")
}

// spliceLine ersetzt in bg die Zellen [x, x+fgW) durch fg (ANSI-sicher).
func spliceLine(bg, fg string, x, fgW int) string {
	left := ansi.Truncate(bg, x, "")
	if lw := ansi.StringWidth(left); lw < x {
		left += strings.Repeat(" ", x-lw)
	}
	right := ansi.TruncateLeft(bg, x+fgW, "")
	return left + "\x1b[0m" + fg + "\x1b[0m" + right
}
