package tui

// form_blackbg_test.go — Regression-Guard gegen schwarze Form-Flächen/Ränder.
// Symptom (B01/B02): huh streut interne ESC[0m-Resets, und der Modal-Rahmen hat
// keinen BorderBackground → Zellen ohne Hintergrund-SGR fallen auf die Terminal-
// Default-BG zurück (schwarz auf nicht-Catppuccin-/transparenten Terminals).
// Der Fix garantiert: JEDE sichtbare Zelle der gerenderten Form trägt einen
// expliziten Hintergrund. Nur unter TrueColor prüfbar (Ascii-Profil strippt SGR).

import (
	"regexp"
	"testing"

	"devd-cli/internal/config"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

var sgrRe = regexp.MustCompile(`\x1b\[([0-9;]*)m`)

// countDefaultBgCells zählt sichtbare Zellen (Nicht-Escape-Runen) ohne aktiven
// Hintergrund-SGR — genau die, die das Terminal mit seiner Default-BG (schwarz)
// füllt. Trackt den BG-State über 48;2;r;g;b (set) und 0/49 (reset auf default).
func countDefaultBgCells(s string) int {
	idx, cur, n := 0, "default", 0
	count := func(seg string) {
		if cur == "default" {
			for _, r := range seg {
				if r != '\n' && r != '\r' {
					n++
				}
			}
		}
	}
	for _, m := range sgrRe.FindAllStringSubmatchIndex(s, -1) {
		count(s[idx:m[0]])
		p := s[m[2]:m[3]]
		switch {
		case p == "" || p == "0":
			cur = "default"
		default:
			cc := splitSemis(p)
			for k := 0; k < len(cc); k++ {
				if cc[k] == "48" && k+1 < len(cc) && cc[k+1] == "2" {
					cur = "set"
					k += 4
				} else if cc[k] == "49" {
					cur = "default"
				}
			}
		}
		idx = m[1]
	}
	count(s[idx:])
	return n
}

func splitSemis(s string) []string {
	out := []string{}
	cur := ""
	for _, r := range s {
		if r == ';' {
			out = append(out, cur)
			cur = ""
		} else {
			cur += string(r)
		}
	}
	return append(out, cur)
}

// Die gerenderte Settings-Form darf KEINE Zelle ohne Hintergrund haben (B01/B02).
func TestFormHasNoDefaultBgCells(t *testing.T) {
	old := lipgloss.ColorProfile()
	lipgloss.SetColorProfile(termenv.TrueColor)
	lipgloss.SetHasDarkBackground(true)
	defer lipgloss.SetColorProfile(old)

	m := model{width: 90, height: 40, cfg: config.Settings{Editor: "vim", Layout: config.LayoutSettings{TreeWidth: 36, ModalWidth: 64}}}
	mi, _ := m.openForm("settings")
	out := mi.(model).formChrome()

	if got := countDefaultBgCells(out); got != 0 {
		t.Errorf("Settings-Form hat %d Zellen ohne Hintergrund-SGR (= schwarz auf nicht-Catppuccin-Terminal), want 0", got)
	}
}
