package tui

import (
	"os"
	"regexp"
	"testing"
)

// DD2-275: New-Project-Form description-Feld muss huh.NewText (multi-line,
// Wortumbruch) sein, nicht huh.NewInput (single-line). Source-Grep-Idiom wie
// tests/dd2-110-backlog-list (JS-Pendant) — verankert die Feldwahl gegen
// Regression, da huh.Field keinen laufzeit-introspizierbaren Typ-Getter bietet.
func TestProjectCreateDescriptionIsMultiLine(t *testing.T) {
	src, err := os.ReadFile("form_create_project.go")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`huh\.NewText\(\)\.Key\("description"\)`).MatchString(string(src)) {
		t.Error("description-Feld sollte huh.NewText() sein (multi-line), nicht huh.NewInput()")
	}
}
