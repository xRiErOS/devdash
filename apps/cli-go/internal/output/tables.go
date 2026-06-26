package output

import (
	"fmt"
	"strings"

	"devd-cli/internal/theme"
)

// ColorStatus rendert einen Status farbig (für Human-Tabellen).
func ColorStatus(status string) string {
	return theme.StatusStyle(status).Render(status)
}

// Key rendert einen Issue/Sprint-Key im Key-Style.
func Key(s string) string { return theme.Key.Render(s) }

// SimpleTable rendert eine schlanke, links-eingerückte Tabelle. Spaltenbreiten
// aus dem rohen Zell-Text (ohne ANSI) — Styling kommt von den Cells selbst.
func SimpleTable(headers []string, rows [][]string) {
	widths := make([]int, len(headers))
	for i, h := range headers {
		widths[i] = len(h)
	}
	for _, row := range rows {
		for i, cell := range row {
			if i < len(widths) {
				if w := visibleLen(cell); w > widths[i] {
					widths[i] = w
				}
			}
		}
	}

	hp := make([]string, len(headers))
	for i, h := range headers {
		hp[i] = theme.Header.Render(pad(h, widths[i]))
	}
	fmt.Println("  " + strings.Join(hp, "  "))

	dp := make([]string, len(widths))
	for i, w := range widths {
		dp[i] = strings.Repeat("─", w)
	}
	fmt.Println("  " + strings.Join(dp, "  "))

	for _, row := range rows {
		rp := make([]string, len(headers))
		for i := range headers {
			cell := ""
			if i < len(row) {
				cell = row[i]
			}
			rp[i] = padVisible(cell, widths[i])
		}
		fmt.Println("  " + strings.Join(rp, "  "))
	}
}

// visibleLen zählt Runen ohne ANSI-Escape-Sequenzen.
func visibleLen(s string) int {
	n, inEsc := 0, false
	for _, r := range s {
		if r == '\x1b' {
			inEsc = true
			continue
		}
		if inEsc {
			if r == 'm' {
				inEsc = false
			}
			continue
		}
		n++
	}
	return n
}

func pad(s string, w int) string {
	if d := w - len([]rune(s)); d > 0 {
		return s + strings.Repeat(" ", d)
	}
	return s
}

// padVisible füllt rechts auf, basierend auf sichtbarer Länge (ANSI-sicher).
func padVisible(s string, w int) string {
	if d := w - visibleLen(s); d > 0 {
		return s + strings.Repeat(" ", d)
	}
	return s
}
