package tui

// help.go — In-App-Shortcut-Übersicht (DD2-31). ? öffnet ein Overlay, das die
// zentrale Keymap (DD2-47) gruppiert rendert. Die Tasten-Labels und Texte kommen
// aus key.Binding.Help() — Single-Source, driftet nicht gegen die echten Bindings.

import (
	"strings"

	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

// shortcutMarkdown generiert die externe Shortcut-Doku (DD2-5) aus derselben
// zentralen Keymap wie die In-App-Hilfe (DD2-31) — eine Quelle, kein Drift. Ein
// Sync-Test hält docs/shortcuts.md gegen diese Ausgabe (TestShortcutDoc).
func shortcutMarkdown() string {
	var b strings.Builder
	b.WriteString("# DevD Cockpit — Tastatur-Shortcuts\n\n")
	b.WriteString("> Generiert aus der zentralen Keymap (`internal/tui/keymap.go`, DD2-47).\n")
	b.WriteString("> Nicht von Hand editieren — neu erzeugen mit:\n")
	b.WriteString("> `go test ./internal/tui/ -run TestShortcutDoc -update-golden`\n\n")
	b.WriteString("Richtungskreuz: **jkli** — `i`=hoch, `j`=links/zurück, `k`=runter, ")
	b.WriteString("`l`=rechts/rein (DD2-34). Pfeiltasten ↑↓←→ sind überall gleichwertig.\n")
	for _, g := range keys.helpGroups() {
		b.WriteString("\n## " + g.title + "\n\n")
		b.WriteString("| Taste | Aktion |\n|-------|--------|\n")
		for _, bind := range g.bindings {
			h := bind.Help()
			b.WriteString("| `" + h.Key + "` | " + h.Desc + " |\n")
		}
	}
	b.WriteString("\n## Kontext-Hinweise\n\n")
	b.WriteString("- `s` / `S` / `d` / `m` / `a` wirken auf den **fokussierten Knoten** ")
	b.WriteString("(Meilenstein / Sprint / Issue) — je nach Tiefe bzw. Tree-Selektion.\n")
	b.WriteString("- `q` / `ctrl+c` öffnen auf Top-Level den Beenden-Confirm (DD2-49); ")
	b.WriteString("in Sub-Formularen/Modals brechen sie direkt ab.\n")
	b.WriteString("- In Suchfeldern (Tree `/`, Memory `/`) und im Command-Center tippen ")
	b.WriteString("Buchstaben als Text — die Navigations-Bindings greifen dort nicht.\n")
	return b.String()
}

// helpBox rendert die schwebende Shortcut-Übersicht aus keys.helpGroups().
func (m model) helpBox() string {
	groups := keys.helpGroups()

	// Spaltenbreite für das Tasten-Label global bestimmen (ANSI-sicher).
	keyW := 0
	for _, g := range groups {
		for _, b := range g.bindings {
			if w := lipgloss.Width(b.Help().Key); w > keyW {
				keyW = w
			}
		}
	}

	var b strings.Builder
	for _, g := range groups {
		b.WriteString("\n" + theme.Accent.Render(g.title) + "\n")
		for _, bind := range g.bindings {
			h := bind.Help()
			pad := strings.Repeat(" ", keyW-lipgloss.Width(h.Key))
			b.WriteString("  " + theme.Header.Render(h.Key) + pad + "  " + theme.Dim.Render(h.Desc) + "\n")
		}
	}

	return modalPanel("Tastatur-Shortcuts", b.String(), "esc/?/q: schließen", clampModalWidth(54, m.width), theme.Mauve)
}
