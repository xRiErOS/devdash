package tui

// home_test.go — DD2-124: Lobby (viewHome), projPick-Overlay, Esc-Spine.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// DD2-124: Esc-Spine — aus Columns/Tree/Backlog landet Esc in der Lobby (viewHome).
func TestEscSpineToHome(t *testing.T) {
	key := func(s string) tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)} }

	// Columns → Home
	mc := columnsModel()
	if got, _ := mc.keyColumns("esc"); got.(model).view != viewHome {
		t.Errorf("Columns esc → view=%d, want viewHome", got.(model).view)
	}

	// Tree (kein Filter/Detail-Fokus) → Home
	mt := columnsModel()
	mt.view = viewTree
	if got, _ := mt.keyTree(key("esc")); got.(model).view != viewHome {
		t.Errorf("Tree esc → view=%d, want viewHome", got.(model).view)
	}
}

// DD2-124: enter auf einem Lobby-Projekt lädt es und springt in den Tree.
func TestHomeEnterSelectsProject(t *testing.T) {
	m := pickerModel()
	m.plist.cursor = 0
	m2, _ := m.keyHome(tea.KeyMsg{Type: tea.KeyEnter})
	m2m := m2.(model)
	if m2m.view != viewTree {
		t.Errorf("enter → view=%d, want viewTree", m2m.view)
	}
	if m2m.project == nil || m2m.project.ID != 1 {
		t.Errorf("Projekt nicht gesetzt: %+v", m2m.project)
	}
}

// DD2-124: viewHome rendert Logo + Projektliste ohne Panic (Render-Smoke).
func TestViewHomeRenders(t *testing.T) {
	m := pickerModel()
	m.width, m.height = 100, 30
	out := m.viewHome()
	if !strings.Contains(out, "Developer Dashboard") {
		t.Errorf("viewHome zeigt die Projektliste nicht:\n%s", out)
	}
	// Auch auf schmalem Terminal kein Panic (kompakter Titel-Fallback).
	m.width, m.height = 20, 10
	_ = m.viewHome()
}

// DD2-124: projPick-Overlay rendert als schwebendes Modal über der Base-View.
func TestProjPickBoxRenders(t *testing.T) {
	m := pickerModel()
	m.width, m.height = 100, 30
	m.view = viewTree
	m.projPick = true
	m.project = &api.Project{ID: 9, Slug: "x", Prefix: "X"}
	m.milestones = nil
	out := m.View()
	if !strings.Contains(out, "Projekt wechseln") {
		t.Errorf("projPick-Overlay nicht gerendert:\n%s", out)
	}
}
