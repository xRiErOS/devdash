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
	b.WriteString("# DevD Cockpit — Keyboard Shortcuts\n\n")
	b.WriteString("> Generated from the central keymap (`internal/tui/keymap.go`, DD2-47).\n")
	b.WriteString("> Do not edit by hand — regenerate with:\n")
	b.WriteString("> `go test ./internal/tui/ -run TestShortcutDoc -update-golden`\n\n")
	b.WriteString("Direction cross: **jkli** — `i`=up, `j`=left/back, `k`=down, ")
	b.WriteString("`l`=right/in (DD2-34). Arrow keys ↑↓←→ are equivalent everywhere.\n")
	for _, g := range keys.helpGroups() {
		b.WriteString("\n## " + g.title + "\n\n")
		b.WriteString("| Key | Action |\n|-------|--------|\n")
		for _, bind := range g.bindings {
			h := bind.Help()
			b.WriteString("| `" + h.Key + "` | " + h.Desc + " |\n")
		}
	}
	b.WriteString("\n## Context notes\n\n")
	b.WriteString("- `s` / `a` / `c` / `d` act on the **focused node** ")
	b.WriteString("(milestone / sprint / issue) — depending on depth or tree selection.\n")
	b.WriteString("- `q` / `ctrl+c` open the quit confirm at top level (DD2-49); ")
	b.WriteString("in sub-forms/modals they cancel directly.\n")
	b.WriteString("- In search fields (tree `/`, memory `/`) and the command center, typing ")
	b.WriteString("letters as text — the navigation bindings do not apply there.\n")
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

	return modalPanel("Keyboard shortcuts", b.String(), "esc/?/q: close", clampModalWidth(54, m.width), theme.Mauve)
}
