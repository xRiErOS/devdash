package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func TestFuzzyMatch(t *testing.T) {
	cases := []struct {
		query, target string
		want          bool
	}{
		{"", "create: issue", true},         // leer matcht alles
		{"issue", "create: issue", true},    // direkter Teilstring
		{"cti", "create: issue", true},      // Subsequenz c..t..i
		{"sprint", "create: sprint", true},  // case-insensitiv
		{"zzz", "create: issue", false},     // kein Match
		{"mile", "create: milestone", true}, // Substring
	}
	for _, c := range cases {
		if got := fuzzyMatch(c.query, c.target); got != c.want {
			t.Errorf("fuzzyMatch(%q,%q)=%v, want %v", c.query, c.target, got, c.want)
		}
	}
}

func paletteModel() model {
	m := newModel(api.NewClient("9"), &api.Project{ID: 9, Slug: "sprout", Prefix: "SPF"}, api.NewClient(""))
	m.view = viewBrowseProject
	return m
}

func TestPaletteOpensAndFilters(t *testing.T) {
	m := paletteModel()
	// ctrl+k öffnet
	mi, _ := m.Update(tea.KeyMsg{Type: tea.KeyCtrlK})
	m = mi.(model)
	if !m.paletteOpen {
		t.Fatal("ctrl+k öffnet Palette nicht")
	}
	full := len(m.palFiltered())
	if full < 4 {
		t.Fatalf("erwarte >=4 Aktionen, habe %d", full)
	}
	// "sprint" tippen → nur Sprint-Aktion bleibt
	mi, _ = m.Update(keyMsg("sprint"))
	m = mi.(model)
	got := m.palFiltered()
	if len(got) != 1 || got[0].id != "create_sprint" {
		t.Fatalf("Filter 'sprint' liefert %+v, want nur create_sprint", got)
	}
	if m.palList.length != 1 {
		t.Errorf("palList.length=%d nach Filter, want 1", m.palList.length)
	}
}

func TestPaletteEscCloses(t *testing.T) {
	m := paletteModel()
	mi, _ := m.Update(tea.KeyMsg{Type: tea.KeyCtrlK})
	m = mi.(model)
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.paletteOpen {
		t.Error("esc schließt Palette nicht")
	}
}

func TestPaletteDispatchBacklog(t *testing.T) {
	m := paletteModel()
	mi, _ := m.dispatchPalette("go_backlog")
	m = mi.(model)
	if m.view != viewBrowseBacklog {
		t.Errorf("dispatch go_backlog → view=%d, want viewBrowseBacklog", m.view)
	}
}

func TestPaletteDispatchOpensForm(t *testing.T) {
	for _, kind := range []string{"issue", "milestone", "sprint"} {
		m := paletteModel()
		mi, _ := m.dispatchPalette("create_" + kind)
		m = mi.(model)
		if m.form == nil {
			t.Fatalf("create_%s öffnet kein Formular", kind)
		}
		if m.formKind != kind {
			t.Errorf("formKind=%q, want %q", m.formKind, kind)
		}
	}
}

func TestPaletteEnterDispatchesSelected(t *testing.T) {
	m := paletteModel()
	mi, _ := m.Update(tea.KeyMsg{Type: tea.KeyCtrlK})
	m = mi.(model)
	// Filter auf milestone, dann enter → Formular milestone
	mi, _ = m.Update(keyMsg("milestone"))
	m = mi.(model)
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.paletteOpen {
		t.Error("enter schließt Palette nicht")
	}
	if m.form == nil || m.formKind != "milestone" {
		t.Errorf("enter dispatcht nicht create_milestone (formKind=%q)", m.formKind)
	}
}
