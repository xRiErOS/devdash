package tui

import (
	"os"
	"path/filepath"
	"testing"
)

// DD2-5: docs/shortcuts.md wird aus der zentralen Keymap generiert und darf nicht
// driften. Neu erzeugen (z.B. nach jkli-Änderung):
//
//	go test ./internal/tui/ -run TestShortcutDoc -update-golden
//
// (teilt sich das -update-golden-Flag mit den Golden-Snapshots).
func TestShortcutDoc(t *testing.T) {
	path := filepath.Join("..", "..", "docs", "shortcuts.md")
	got := shortcutMarkdown()
	if *updateGolden {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(got), 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("docs/shortcuts.md fehlt — mit -update-golden erzeugen: %v", err)
	}
	if got != string(want) {
		t.Errorf("docs/shortcuts.md driftet von der Keymap — neu erzeugen mit:\n  go test ./internal/tui/ -run TestShortcutDoc -update-golden")
	}
}
