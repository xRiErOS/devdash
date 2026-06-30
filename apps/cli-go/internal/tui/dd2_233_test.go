package tui

// DD2-233: Der ctrl+e-Editor im Create-Issue-Form folgt dem global konfigurierten
// Terminal-Editor (form_edit_settings → configuredEditor), nicht hartkodiert vim
// über $EDITOR. Der Create-Form-Pfad ruft editInEditor → editorBinary →
// configuredEditor (huh's eingebauter $EDITOR-Launch ist auf den Text-Feldern aus).

import (
	"testing"
)

func TestCreateFormEditorUsesConfiguredEditor(t *testing.T) {
	old := configuredEditor
	defer func() { configuredEditor = old }()

	configuredEditor = "nvim"
	if bin := editorBinary(); len(bin) == 0 || bin[0] != "nvim" {
		t.Errorf("editorBinary()=%v, want [nvim] (configuredEditor, nicht $EDITOR/vim)", bin)
	}

	// Editor mit Argumenten bleibt erhalten (z.B. "code -w").
	configuredEditor = "code -w"
	bin := editorBinary()
	if len(bin) != 2 || bin[0] != "code" || bin[1] != "-w" {
		t.Errorf("editorBinary()=%v, want [code -w]", bin)
	}
}
