package tui

import (
	"os"
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// DD2-224: editorBinary löst NUR noch über configuredEditor auf (TUI-Config,
// Default nvim) — $VISUAL/$EDITOR werden bewusst ignoriert (kein Env-Leak).
func TestEditorBinaryResolution(t *testing.T) {
	orig := configuredEditor
	t.Cleanup(func() { configuredEditor = orig })

	t.Setenv("VISUAL", "code") // Env darf das Ergebnis nicht mehr beeinflussen
	t.Setenv("EDITOR", "vim -u NONE")

	configuredEditor = ""
	if got := editorBinary(); len(got) != 1 || got[0] != "nvim" {
		t.Fatalf("leer → default = %v, want [nvim]", got)
	}
	configuredEditor = "vim -u NONE"
	if got := editorBinary(); len(got) != 3 || got[0] != "vim" {
		t.Fatalf("config split = %v", got)
	}
	configuredEditor = "nvim"
	if got := editorBinary(); len(got) != 1 || got[0] != "nvim" {
		t.Fatalf("config nvim gewinnt über Env = %v", got)
	}
}

func TestPrepareAndReadEditor(t *testing.T) {
	path, cmd, err := prepareEditor("hello", ".md")
	if err != nil {
		t.Fatalf("prepareEditor: %v", err)
	}
	if !strings.HasSuffix(path, ".md") {
		t.Fatalf("suffix not applied: %s", path)
	}
	if cmd.Args[len(cmd.Args)-1] != path {
		t.Fatalf("cmd does not target temp file: %v", cmd.Args)
	}
	data, _ := os.ReadFile(path)
	if string(data) != "hello" {
		t.Fatalf("initial not written: %q", data)
	}

	// Editor "changed" the content.
	os.WriteFile(path, []byte("hello world"), 0o644)
	msg := readEditorResult(path, "hello", nil)
	if msg.err != nil || !msg.changed || msg.content != "hello world" {
		t.Fatalf("changed result wrong: %+v", msg)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("temp file not cleaned up")
	}
}

func TestReadEditorResultUnchangedAndError(t *testing.T) {
	p2, _, _ := prepareEditor("same", ".md")
	msg := readEditorResult(p2, "same", nil)
	if msg.changed {
		t.Fatalf("unchanged content flagged changed")
	}
	// Run error path returns err and cleans up.
	p3, _, _ := prepareEditor("x", ".md")
	msg = readEditorResult(p3, "x", os.ErrPermission)
	if msg.err == nil {
		t.Fatalf("run error not propagated")
	}
}

func TestGlowRender(t *testing.T) {
	if glowRender("   ", 80) != "" {
		t.Fatalf("blank input should render empty")
	}
	prev := lipgloss.ColorProfile()
	lipgloss.SetColorProfile(termenv.Ascii)
	defer lipgloss.SetColorProfile(prev)

	out := glowRender("# Title\n\nbody text", 80)
	if !strings.Contains(out, "Title") || !strings.Contains(out, "body text") {
		t.Fatalf("rendered output missing content: %q", out)
	}
	if strings.Contains(out, "\x1b[") {
		t.Fatalf("ascii profile should produce no ANSI: %q", out)
	}
}
