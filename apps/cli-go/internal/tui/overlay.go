package tui

import (
	"strings"

	"github.com/charmbracelet/x/ansi"
)

// placeOverlay legt fg zentriert über bg (Painter's Algorithm, ANSI-sicher).
// bg bleibt rundherum sichtbar — nur die vom Modal belegten Zellen werden
// überschrieben. Kein Z-Index in Bubble Tea, daher Zeilen-Compositing.
func placeOverlay(bg, fg string, tw, th int) string {
	bgLines := strings.Split(bg, "\n")
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
		bgLines[row] = spliceLine(bgLines[row], fl, x, ansi.StringWidth(fl))
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
