package tui

import "testing"

// DD2-25: Modal-/Form-Breite folgt der Terminalbreite, bricht auf schmalen Views
// nicht aus dem Rahmen.
func TestModalBoxWidthShrinks(t *testing.T) {
	if got := modalBoxWidth(100); got != 64 {
		t.Errorf("modalBoxWidth(100)=%d, want 64 (Obergrenze)", got)
	}
	if got := modalBoxWidth(50); got != 46 {
		t.Errorf("modalBoxWidth(50)=%d, want 46 (termW-4)", got)
	}
	if got := modalBoxWidth(10); got != 24 {
		t.Errorf("modalBoxWidth(10)=%d, want 24 (Untergrenze)", got)
	}
	if formInnerWidth(50) >= modalBoxWidth(50) {
		t.Error("formInnerWidth muss kleiner als modalBoxWidth sein (Rahmen/Padding)")
	}
}
