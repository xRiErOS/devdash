package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func sstdTestModel() model {
	m := model{view: viewSSTD, width: 90, height: 22, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	m.topReturn = viewBrowseProject
	arch := "# Architecture\n\nLayered client/server."
	m.sstdSlots = []api.SstdSlot{
		{SlotKey: "architecture", Content: arch},
		{SlotKey: "conventions", Content: ""},
		{SlotKey: "sprint_state", Content: "Sprint DD2#32 in progress."},
		{SlotKey: "roadmap", Content: ""},
		{SlotKey: "cross_refs", Content: ""},
		{SlotKey: "misc", Content: ""},
	}
	m.sstdProj = &api.SstdProjections{NextSteps: "## Next Steps\n\n- Ship DD2-166", Journal: "## Session Log\n\n- did things"}
	m.sstdList.setLen(len(m.sstdEntries()))
	return m
}

func TestSSTDEntriesShape(t *testing.T) {
	m := sstdTestModel()
	e := m.sstdEntries()
	if len(e) != 8 {
		t.Fatalf("want 8 entries (6 slots + 2 proj), got %d", len(e))
	}
	if !e[0].editable || e[0].title != "Architecture" {
		t.Fatalf("slot 0 wrong: %+v", e[0])
	}
	if e[6].editable || e[6].title != "Next Steps" || e[7].title != "Session Log" {
		t.Fatalf("projections wrong: %+v %+v", e[6], e[7])
	}
}

func TestSSTDNavDown(t *testing.T) {
	m := sstdTestModel()
	nm, _ := m.keySSTD(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("k")}) // jkli: k = down
	if nm.(model).sstdList.cursor != 1 {
		t.Fatalf("k should move down, cursor = %d", nm.(model).sstdList.cursor)
	}
}

func TestSSTDEnterOnSlotEdits(t *testing.T) {
	m := sstdTestModel()
	m.sstdList.cursor = 0 // architecture (editable)
	nm, cmd := m.keySSTD(tea.KeyMsg{Type: tea.KeyEnter})
	if nm.(model).sstdEditKey != "architecture" {
		t.Fatalf("editKey not set: %q", nm.(model).sstdEditKey)
	}
	if cmd == nil {
		t.Fatalf("expected editInEditor cmd")
	}
}

func TestSSTDEnterOnProjectionReadOnly(t *testing.T) {
	m := sstdTestModel()
	m.sstdList.cursor = 6 // next_steps projection (read-only)
	nm, cmd := m.keySSTD(tea.KeyMsg{Type: tea.KeyEnter})
	if nm.(model).sstdEditKey != "" {
		t.Fatalf("read-only projection must not set editKey")
	}
	if cmd == nil {
		t.Fatalf("expected a notice cmd")
	}
	if msg := cmd(); msg == nil {
		t.Fatalf("notice cmd produced nil")
	}
}

func TestSSTDEscReturnsHome(t *testing.T) {
	m := sstdTestModel()
	nm, _ := m.keySSTD(tea.KeyMsg{Type: tea.KeyEsc})
	if nm.(model).view != viewBrowseProject {
		t.Fatalf("esc should return to topReturn, view = %v", nm.(model).view)
	}
}

func TestSSTDSavePathDispatch(t *testing.T) {
	m := sstdTestModel()
	m.view = viewSSTD
	m.sstdEditKey = "architecture"
	_, cmd := m.Update(editorFinishedMsg{content: "new content", changed: true})
	if cmd == nil {
		t.Fatalf("changed edit should dispatch a save cmd")
	}
}

// DD2-166 Rework: y yankt den aktiven Slot (Status-Bestätigung), kein Edit.
func TestSSTDYankSlot(t *testing.T) {
	m := sstdTestModel()
	m.sstdList.cursor = 0 // architecture
	nm, _ := m.keySSTD(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("y")})
	got := nm.(model)
	if got.sstdEditKey != "" {
		t.Fatalf("yank must not start an edit")
	}
	if !strings.Contains(got.status, "architecture") {
		t.Fatalf("yank should confirm the slot key in status: %q", got.status)
	}
}

// DD2-166 Rework: alt+y yankt die gesamte SSTD.
func TestSSTDYankAll(t *testing.T) {
	m := sstdTestModel()
	nm, _ := m.keySSTD(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("y"), Alt: true})
	if !strings.Contains(nm.(model).status, "full SSTD") {
		t.Fatalf("alt+y should confirm full-SSTD copy: %q", nm.(model).status)
	}
}

// DD2-166 Rework: die Slot-ID (slot_key) steht in der Listenzeile.
func TestSSTDRowsHaveSlotID(t *testing.T) {
	m := sstdTestModel()
	rows := m.sstdRows()
	if !strings.Contains(rows[0], "architecture") {
		t.Fatalf("row 0 should contain the slot key: %q", rows[0])
	}
}

// DD2-166 Rework: sstdAllClip serialisiert alle Slots + Projektionen als Markdown.
func TestSSTDAllClip(t *testing.T) {
	out := sstdTestModel().sstdAllClip()
	for _, want := range []string{"architecture", "sprint_state", "next_steps", "journal", "Layered client/server"} {
		if !strings.Contains(out, want) {
			t.Fatalf("sstdAllClip missing %q:\n%s", want, out)
		}
	}
}

func TestGoldenSSTD(t *testing.T) {
	assertGolden(t, "sstd", sstdTestModel().View())
}
