package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func TestNextMemCategoryCycles(t *testing.T) {
	seq := []string{""}
	cur := ""
	for i := 0; i < len(memCategories)+1; i++ {
		cur = nextMemCategory(cur)
		seq = append(seq, cur)
	}
	// nach allen Kategorien wieder "" (alle)
	if cur != "" {
		t.Errorf("Zyklus endet bei %q, want \"\" (alle)", cur)
	}
	if nextMemCategory("") != "architecture_decision" {
		t.Errorf("erster Schritt = %q, want architecture_decision", nextMemCategory(""))
	}
}

func TestMemCatShort(t *testing.T) {
	if memCatShort("architecture_decision") != "arch" {
		t.Errorf("memCatShort(architecture_decision)=%q", memCatShort("architecture_decision"))
	}
	if memCatShort("unbekannt") != "unbekannt" {
		t.Error("unbekannte Kategorie sollte unverändert bleiben")
	}
}

func memModel() model {
	m := columnsModel()
	m.view = viewMemory
	return m
}

func TestOpenMemorySetsView(t *testing.T) {
	m := columnsModel()
	mi, cmd := m.openMemory()
	m = mi.(model)
	if m.view != viewMemory {
		t.Errorf("openMemory → view=%d, want viewMemory", m.view)
	}
	if cmd == nil {
		t.Error("openMemory sollte loadMemories dispatchen")
	}
}

func TestMemoriesMsgPopulatesAndSyncsDetail(t *testing.T) {
	m := memModel()
	mi, cmd := m.Update(memoriesMsg{[]api.ProjectMemory{
		{ID: 1, Category: "convention", Summary: "Tabs nicht Spaces"},
		{ID: 2, Category: "bug_pattern", Summary: "Null im Save"},
	}})
	m = mi.(model)
	if len(m.memList) != 2 || m.memlist.length != 2 {
		t.Fatalf("memList=%d length=%d, want 2/2", len(m.memList), m.memlist.length)
	}
	if cmd == nil {
		t.Error("nicht-leere Liste sollte Detail-Load (syncMemDetail) auslösen")
	}
}

func TestMemDetailMsgStored(t *testing.T) {
	m := memModel()
	c := "voller Inhalt"
	mi, _ := m.Update(memDetailMsg{&api.ProjectMemory{ID: 5, Summary: "x", Content: &c}})
	m = mi.(model)
	if m.memDetail == nil || m.memDetailID != 5 {
		t.Fatalf("memDetail nicht gesetzt: %+v / id=%d", m.memDetail, m.memDetailID)
	}
}

func TestMemorySearchFlow(t *testing.T) {
	m := memModel()
	m.memList = []api.ProjectMemory{{ID: 1, Summary: "a"}}
	m.memlist.setLen(1)
	// '/' öffnet Suche
	mi, _ := m.Update(keyMsg("/"))
	m = mi.(model)
	if !m.memSearching {
		t.Fatal("'/' öffnet keine Suche")
	}
	// tippen
	mi, _ = m.Update(keyMsg("login"))
	m = mi.(model)
	if m.memQuery != "login" {
		t.Errorf("memQuery=%q, want login", m.memQuery)
	}
	// enter dispatcht Suche + schließt Eingabe
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.memSearching {
		t.Error("enter schließt Such-Eingabe nicht")
	}
	if cmd == nil {
		t.Error("enter sollte searchMemoriesCmd dispatchen")
	}
}

func TestMemoryCategoryCycleReloads(t *testing.T) {
	m := memModel()
	mi, cmd := m.Update(keyMsg("c"))
	m = mi.(model)
	if m.memCat != "architecture_decision" {
		t.Errorf("c → memCat=%q, want architecture_decision", m.memCat)
	}
	if cmd == nil {
		t.Error("Kategorie-Wechsel sollte Liste neu laden")
	}
}

func TestMemoryYankEmpty(t *testing.T) {
	m := memModel()
	mi, _ := m.Update(keyMsg("y"))
	m = mi.(model)
	if m.status == "" {
		t.Error("y auf leerer Liste sollte einen Hinweis setzen")
	}
}

func TestPaletteDispatchMemory(t *testing.T) {
	m := paletteModel()
	mi, _ := m.dispatchPalette("go_memory")
	m = mi.(model)
	if m.view != viewMemory {
		t.Errorf("go_memory → view=%d, want viewMemory", m.view)
	}
	m2 := paletteModel()
	mi, _ = m2.dispatchPalette("create_memory")
	m2 = mi.(model)
	if m2.form == nil || m2.formKind != "memory" {
		t.Errorf("create_memory öffnet kein memory-Formular (kind=%q)", m2.formKind)
	}
}
