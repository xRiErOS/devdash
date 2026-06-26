// Package clip kopiert Text in die System-Zwischenablage über native Tools.
// Reihenfolge: pbcopy (macOS) → wl-copy / xclip / xsel (Linux). Kein Emoji,
// keine externe Go-Dependency.
package clip

import (
	"fmt"
	"os/exec"
	"strings"
)

// candidates sind (Programm, Argumente) in Präferenz-Reihenfolge.
var candidates = [][]string{
	{"pbcopy"},
	{"wl-copy"},
	{"xclip", "-selection", "clipboard"},
	{"xsel", "--clipboard", "--input"},
}

// Copy schreibt s in die Zwischenablage. Fehler, wenn kein Tool gefunden.
func Copy(s string) error {
	for _, c := range candidates {
		if _, err := exec.LookPath(c[0]); err != nil {
			continue
		}
		cmd := exec.Command(c[0], c[1:]...)
		cmd.Stdin = strings.NewReader(s)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("%s: %w", c[0], err)
		}
		return nil
	}
	return fmt.Errorf("kein Clipboard-Tool gefunden (pbcopy/wl-copy/xclip/xsel)")
}
