package tui

// modal.go — Render-Komponenten-Schicht für schwebende Overlays (DD2 I01).
// Single-Source gegen Drift; neue Modals/Menüs = wenige Zeilen statt ~20.
//   modalBox   — die Box-Chrome (RoundedBorder, Base-BG, Padding)
//   modalPanel — Header-Titel + Body + optionaler Dim-Footer, in modalBox
//   menuList   — Auswahlliste mit ▸-Cursor (Accent) vor dem aktiven Eintrag

import (
	"strings"

	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

// modalBox umrahmt vorgerenderten Inhalt als schwebendes Overlay-Modal.
// border = theme.Mauve (Standard) bzw. theme.Red (destruktive Dialoge).
func modalBox(inner string, width int, border lipgloss.Color) string {
	return lipgloss.NewStyle().
		Width(width).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(border).
		Background(theme.Base).
		Padding(0, 1).
		Render(inner)
}

// modalPanel baut ein Standard-Modal: Header-Titel + Body + (optional) Dim-Footer,
// umrahmt von modalBox. Der Body bringt eigene Zwischenzeilen (Subtitle/Separator/
// Items) selbst mit. Single-Source für formChrome, paletteBox und die Menüs.
func modalPanel(title, body, footer string, width int, border lipgloss.Color) string {
	var b strings.Builder
	b.WriteString(theme.Header.Render(title) + "\n")
	b.WriteString(body)
	if footer != "" {
		b.WriteString("\n" + theme.Dim.Render(footer))
	}
	return modalBox(b.String(), width, border)
}

// menuList rendert eine Auswahlliste mit ▸-Cursor (Accent) vor dem aktiven Eintrag.
// render(i, selected) liefert den Eintragstext NACH dem Cursor — der Caller steuert
// Label/Marker/Highlight. Jede Zeile endet mit "\n".
func menuList(n, cursor int, render func(i int, selected bool) string) string {
	var b strings.Builder
	for i := 0; i < n; i++ {
		sel := i == cursor
		c := "  "
		if sel {
			c = theme.Accent.Render("▸ ")
		}
		b.WriteString(c + render(i, sel) + "\n")
	}
	return b.String()
}
