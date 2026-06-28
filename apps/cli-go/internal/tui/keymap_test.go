package tui

import "testing"

// DD2-47: navKey ist keymap-getrieben. Jede in der zentralen keyMap gebundene
// Richtungstaste muss auf ihre kanonische Richtung normalisieren — sonst ist die
// Single-Source gebrochen (Drift-Guard für die jkli-Umstellung DD2-34).
func TestNavKeyDrivenByKeymap(t *testing.T) {
	dirs := []struct {
		name string
		keys []string
		want string
	}{
		{"Up", keys.Up.Keys(), "up"},
		{"Down", keys.Down.Keys(), "down"},
		{"Left", keys.Left.Keys(), "left"},
		{"Right", keys.Right.Keys(), "right"},
	}
	for _, d := range dirs {
		if len(d.keys) == 0 {
			t.Errorf("%s: keine Tasten gebunden", d.name)
		}
		for _, k := range d.keys {
			if got := navKey(k); got != d.want {
				t.Errorf("navKey(%q)=%q, want %q (%s)", k, got, d.want, d.name)
			}
		}
	}
}

// Pfeiltasten müssen in JEDER Richtungs-Bindung mitgeführt sein (DD2-71): sonst
// brechen Handler, die nur über navKey routen, für Arrow-User.
func TestArrowKeysBoundInEveryDirection(t *testing.T) {
	cases := map[string]string{"up": "up", "down": "down", "left": "left", "right": "right"}
	for arrow, want := range cases {
		if got := navKey(arrow); got != want {
			t.Errorf("Pfeiltaste %q normalisiert zu %q, want %q", arrow, got, want)
		}
	}
}

// DD2-34: jkli-Layout ist aktiv — i=hoch, j=links, k=runter, l=rechts. 'h' ist
// freigegeben (kein Richtungsbezug mehr → passthrough).
func TestJkliMapping(t *testing.T) {
	want := map[string]string{"i": "up", "k": "down", "j": "left", "l": "right"}
	for k, dir := range want {
		if got := navKey(k); got != dir {
			t.Errorf("navKey(%q)=%q, want %q (jkli)", k, got, dir)
		}
	}
	if got := navKey("h"); got != "h" {
		t.Errorf("navKey(%q)=%q, want passthrough (h ist frei seit jkli)", "h", got)
	}
}

// Nicht-Richtungstasten werden unverändert durchgereicht.
func TestNavKeyPassthrough(t *testing.T) {
	for _, k := range []string{"enter", "esc", "s", "?", "ctrl+c"} {
		if got := navKey(k); got != k {
			t.Errorf("navKey(%q)=%q, want passthrough %q", k, got, k)
		}
	}
}
