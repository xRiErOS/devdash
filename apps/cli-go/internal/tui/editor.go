package tui

import (
	"os"
	"os/exec"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/glamour"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// DD2-164: Wiederverwendbare Editor-/Render-Helfer für die Edit/Read-Views
// (SSTD, Docs, User-Notes). Q02 (PO): Edit IMMER als ganze Datei via neovim —
// kein Inline-/Line-Edit. Lesen via glamour (Glow-Renderer).

// editorFinishedMsg trägt das Ergebnis einer Editor-Suspend-Session zurück in die
// Update-Schleife. Der aufrufende View merkt sich VOR dem Start, WAS editiert wird
// (Slot-Key / Doc-ID / Note-ID), und schreibt content beim Empfang weg.
type editorFinishedMsg struct {
	content string
	changed bool
	err     error
}

// editorBinary löst den zu nutzenden Editor auf: $VISUAL > $EDITOR > nvim.
// Ein Wert darf Argumente enthalten (z.B. "code -w") — an Whitespace gesplittet.
func editorBinary() []string {
	for _, env := range []string{"VISUAL", "EDITOR"} {
		if v := strings.TrimSpace(os.Getenv(env)); v != "" {
			return strings.Fields(v)
		}
	}
	return []string{"nvim"}
}

// prepareEditor schreibt initial in eine temporäre Datei und baut den exec.Cmd,
// der den Editor auf dieser Datei öffnet. Faktorisiert für Testbarkeit (kein
// tea-Runtime nötig). Aufrufer ist für os.Remove(path) verantwortlich.
func prepareEditor(initial, suffix string) (path string, cmd *exec.Cmd, err error) {
	if suffix == "" {
		suffix = ".md"
	}
	f, err := os.CreateTemp("", "devd-*"+suffix)
	if err != nil {
		return "", nil, err
	}
	path = f.Name()
	if _, err = f.WriteString(initial); err != nil {
		f.Close()
		os.Remove(path)
		return "", nil, err
	}
	if err = f.Close(); err != nil {
		os.Remove(path)
		return "", nil, err
	}
	bin := editorBinary()
	cmd = exec.Command(bin[0], append(bin[1:], path)...)
	return path, cmd, nil
}

// readEditorResult liest die (ggf. editierte) Datei zurück, vergleicht mit initial
// und räumt die temporäre Datei auf. runErr ist der Fehler der Editor-Ausführung.
func readEditorResult(path, initial string, runErr error) editorFinishedMsg {
	defer os.Remove(path)
	if runErr != nil {
		return editorFinishedMsg{err: runErr}
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return editorFinishedMsg{err: err}
	}
	content := string(data)
	return editorFinishedMsg{content: content, changed: content != initial}
}

// editInEditor öffnet initial im konfigurierten Editor (TUI-Suspend via
// tea.ExecProcess) und liefert nach dem Schließen ein editorFinishedMsg mit dem
// neuen Inhalt. suffix steuert die temp-Datei-Endung (z.B. ".md").
func editInEditor(initial, suffix string) tea.Cmd {
	path, cmd, err := prepareEditor(initial, suffix)
	if err != nil {
		return func() tea.Msg { return editorFinishedMsg{err: err} }
	}
	return tea.ExecProcess(cmd, func(runErr error) tea.Msg {
		return readEditorResult(path, initial, runErr)
	})
}

// glowRender rendert Markdown für die Detail-Pane. Fällt auf den rohen Text zurück,
// wenn glamour fehlschlägt. Im Ascii-Profil (Tests/kein TTY → an dasselbe Profil
// gekoppelt wie die Goldens) wird der plain "notty"-Style genutzt, damit
// Golden-Snapshots ANSI-frei und stabil bleiben.
func glowRender(md string, width int) string {
	if strings.TrimSpace(md) == "" {
		return ""
	}
	w := width
	if w <= 0 {
		w = 80
	}
	style := "dark"
	if lipgloss.ColorProfile() == termenv.Ascii {
		style = "notty"
	}
	r, err := glamour.NewTermRenderer(
		glamour.WithStandardStyle(style),
		glamour.WithWordWrap(w),
	)
	if err != nil {
		return md
	}
	out, err := r.Render(md)
	if err != nil {
		return md
	}
	return strings.TrimRight(out, "\n")
}
