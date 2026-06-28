package tui

// form_sandbox.go — Styling-Sandbox (Palette-Action "Test Form"): eine huh-Form
// mit allen vier Feldtypen (text/textarea/select/multiselect) OHNE Persistenz.
// Zweck: die huh-Optik schrittweise an die Command-Palette angleichen
// (RoundedBorder/Mauve, Base-BG, Mauve-Akzent, ▸-Cursor, Dim-Hints), entkoppelt
// von den echten Prod-Forms. Bei Zufriedenheit → paletteFormTheme nach openForm
// promoten (T01/T02).

import (
	"strings"

	"devd-cli/internal/theme"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

// paletteFormTheme spiegelt die Command-Palette-Optik auf ein huh.Theme:
// Mauve = Akzent (Titel, Selector, Indikatoren, aktive Option), Overlay = Feld-
// Border, Hint = Placeholder/Beschreibung, Base = Hintergrund.
func paletteFormTheme() *huh.Theme {
	t := huh.ThemeBase()

	// Aktives Feld: Yellow-Signalbalken (Catppuccin) für Orientierung (#2).
	t.Focused.Base = t.Focused.Base.BorderForeground(theme.Yellow).Background(theme.Base)
	t.Focused.Card = t.Focused.Base
	t.Focused.Title = t.Focused.Title.Foreground(theme.Mauve).Bold(true)
	t.Focused.Description = t.Focused.Description.Foreground(theme.Hint)
	t.Focused.ErrorIndicator = t.Focused.ErrorIndicator.Foreground(theme.Red)
	t.Focused.ErrorMessage = t.Focused.ErrorMessage.Foreground(theme.Red)

	// Select: Mauve-Cursor "▸ " + Indikatoren (wie Palette-Cursor)
	t.Focused.SelectSelector = t.Focused.SelectSelector.Foreground(theme.Mauve).SetString("▸ ")
	t.Focused.NextIndicator = t.Focused.NextIndicator.Foreground(theme.Mauve)
	t.Focused.PrevIndicator = t.Focused.PrevIndicator.Foreground(theme.Mauve)
	t.Focused.Option = t.Focused.Option.Foreground(theme.Text)
	t.Focused.SelectedOption = t.Focused.SelectedOption.Foreground(theme.Mauve)

	// Multi-select
	t.Focused.MultiSelectSelector = t.Focused.MultiSelectSelector.Foreground(theme.Mauve).SetString("▸ ")
	t.Focused.SelectedPrefix = lipgloss.NewStyle().Foreground(theme.Mauve).SetString("[•] ")
	t.Focused.UnselectedPrefix = lipgloss.NewStyle().Foreground(theme.Hint).SetString("[ ] ")
	t.Focused.UnselectedOption = t.Focused.UnselectedOption.Foreground(theme.Text)

	// Buttons (Submit) = Mauve-Akzent
	t.Focused.FocusedButton = t.Focused.FocusedButton.Foreground(theme.Base).Background(theme.Mauve)
	t.Focused.BlurredButton = t.Focused.BlurredButton.Foreground(theme.Text).Background(theme.Surface)
	t.Focused.Next = t.Focused.FocusedButton

	// TextInput — Prompt-"> " entfernt (#1: war zusätzliches Zeichen im Input)
	t.Focused.TextInput.Cursor = t.Focused.TextInput.Cursor.Foreground(theme.Mauve)
	t.Focused.TextInput.Placeholder = t.Focused.TextInput.Placeholder.Foreground(theme.Hint)
	t.Focused.TextInput.Prompt = t.Focused.TextInput.Prompt.Foreground(theme.Mauve).SetString("")
	t.Focused.TextInput.Text = t.Focused.TextInput.Text.Foreground(theme.Text)

	t.Form.Base = t.Form.Base.Background(theme.Base)

	// Blurred = Focused, nur Border gedimmt
	t.Blurred = t.Focused
	t.Blurred.Base = t.Focused.Base.BorderForeground(theme.Hint).Background(theme.Base)
	t.Blurred.Card = t.Blurred.Base
	t.Blurred.NextIndicator = lipgloss.NewStyle()
	t.Blurred.PrevIndicator = lipgloss.NewStyle()

	return t
}

// buildTestForm liefert die Sandbox-Form mit allen vier Feldtypen (kein Persist).
func buildTestForm() *huh.Form {
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("text").Title("Text").Placeholder("einzeiliger Input"),
		huh.NewText().Key("textarea").Title("Textarea").Placeholder("mehrzeiliger Text"),
		huh.NewSelect[string]().Key("select").Title("Select").Options(
			huh.NewOption("Feature", "feature"),
			huh.NewOption("Bug", "bug"),
			huh.NewOption("Improvement", "improvement"),
			huh.NewOption("Core", "core"),
		),
		huh.NewMultiSelect[string]().Key("multiselect").Title("Multiselect").Options(
			huh.NewOption("frontend", "1"),
			huh.NewOption("backend", "2"),
			huh.NewOption("tui", "3"),
			huh.NewOption("docs", "4"),
		),
	)).WithShowHelp(false).WithTheme(paletteFormTheme()) // eigener Footer in sandboxFormBox (#3)
}

// sandboxFormBox umrahmt die Test-Form exakt wie paletteBox (RoundedBorder/Mauve,
// Base-BG, Padding(0,1), Header-Titel, Dim-Separator + Dim-Footer). Nur für
// kind=="testform" — Prod-Forms rendern weiter bare (Clean-Cut-Baseline).
func (m model) sandboxFormBox() string {
	innerW := formInnerWidth(m.width)
	var b strings.Builder
	b.WriteString(theme.Header.Render("Test Form") + "\n")
	b.WriteString(theme.Dim.Render(strings.Repeat("─", innerW)) + "\n")
	b.WriteString(m.form.View())
	b.WriteString("\n" + theme.Dim.Render("↑↓ wählen · enter weiter · ctrl+e Editor · esc zu"))
	return lipgloss.NewStyle().
		Width(modalBoxWidth(m.width)).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}
