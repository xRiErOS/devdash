package config

import "testing"

func TestDefaultSettings(t *testing.T) {
	d := DefaultSettings()
	if d.Layout.TreeWidth != defTreeWidth || d.Layout.ModalWidth != defModalWidth {
		t.Fatalf("Defaults falsch: %+v", d.Layout)
	}
	if d.Theme.Accent != "" {
		t.Errorf("Default-Accent sollte leer sein, war %q", d.Theme.Accent)
	}
}

func TestParseSettings(t *testing.T) {
	in := []byte("theme:\n  accent: \"#f5a97f\"\nlayout:\n  tree_width: 32\n  modal_width: 56\nkeybindings:\n  down: j\n")
	s, err := parseSettings(in)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if s.Theme.Accent != "#f5a97f" || s.Layout.TreeWidth != 32 || s.Layout.ModalWidth != 56 {
		t.Errorf("falsch geparst: %+v", s)
	}
	if s.Keybindings["down"] != "j" {
		t.Errorf("keybindings nicht geparst: %+v", s.Keybindings)
	}
}

func TestMergeSettings(t *testing.T) {
	base := DefaultSettings() // 36/64, accent ""
	over := Settings{
		Theme:       ThemeSettings{Accent: "#abc123"},
		Layout:      LayoutSettings{TreeWidth: 40}, // ModalWidth 0 = unset → base bleibt
		Keybindings: map[string]string{"up": "k"},
	}
	got := mergeSettings(base, over)
	if got.Layout.TreeWidth != 40 {
		t.Errorf("TreeWidth: got %d, want 40 (override)", got.Layout.TreeWidth)
	}
	if got.Layout.ModalWidth != defModalWidth {
		t.Errorf("ModalWidth: got %d, want %d (unset → base)", got.Layout.ModalWidth, defModalWidth)
	}
	if got.Theme.Accent != "#abc123" {
		t.Errorf("Accent: got %q, want #abc123", got.Theme.Accent)
	}
	if got.Keybindings["up"] != "k" {
		t.Errorf("Keybindings nicht gemerged: %+v", got.Keybindings)
	}
}

func TestValidateSettings(t *testing.T) {
	cases := []struct {
		in              Settings
		wantTree, wantM int
		wantAccent      string
	}{
		{Settings{Layout: LayoutSettings{TreeWidth: 5, ModalWidth: 10}}, minTreeWidth, minModalWidth, ""},
		{Settings{Layout: LayoutSettings{TreeWidth: 999, ModalWidth: 999}}, maxTreeWidth, maxModalWidth, ""},
		{Settings{Layout: LayoutSettings{TreeWidth: 0, ModalWidth: 0}}, defTreeWidth, defModalWidth, ""},
		{Settings{Theme: ThemeSettings{Accent: "nope"}}, defTreeWidth, defModalWidth, ""},
		{Settings{Theme: ThemeSettings{Accent: "#A1B2C3"}}, defTreeWidth, defModalWidth, "#A1B2C3"},
	}
	for i, c := range cases {
		got := validateSettings(c.in)
		if got.Layout.TreeWidth != c.wantTree || got.Layout.ModalWidth != c.wantM || got.Theme.Accent != c.wantAccent {
			t.Errorf("case %d: got tree=%d modal=%d accent=%q; want %d/%d/%q",
				i, got.Layout.TreeWidth, got.Layout.ModalWidth, got.Theme.Accent, c.wantTree, c.wantM, c.wantAccent)
		}
	}
}
