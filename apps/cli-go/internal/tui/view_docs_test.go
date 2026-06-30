package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func docsTestModel() model {
	m := model{view: viewDocs, width: 90, height: 22, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	m.topReturn = viewBrowseProject
	m.docOwnerType = "milestone"
	m.docOwnerID = 45
	m.docOwnerName = "TUI M3"
	mid := 45
	m.docList = []api.Document{
		{ID: 1, MilestoneID: &mid, Title: "Plan", Body: "# Plan\n\nbody one"},
		{ID: 2, MilestoneID: &mid, Title: "Notes", Body: ""},
	}
	m.doclist.setLen(len(m.filteredDocs()))
	return m
}

func TestDocsFilter(t *testing.T) {
	m := docsTestModel()
	m.docQuery = "note"
	got := m.filteredDocs()
	if len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("title filter wrong: %+v", got)
	}
}

func TestDocsEnterEdit(t *testing.T) {
	m := docsTestModel()
	m.doclist.cursor = 0
	nm, cmd := m.keyDocs(tea.KeyMsg{Type: tea.KeyEnter})
	if nm.(model).docEditID != 1 || cmd == nil {
		t.Fatalf("enter should edit doc 1")
	}
}

func TestDocsCreate(t *testing.T) {
	m := docsTestModel()
	m.docEditID = 99
	nm, cmd := m.keyDocs(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("n")})
	if nm.(model).docEditID != 0 || cmd == nil {
		t.Fatalf("n should enter create mode")
	}
}

func TestDocsDeleteConfirm(t *testing.T) {
	m := docsTestModel()
	m.doclist.cursor = 0
	nm, _ := m.keyDocs(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("d")})
	got := nm.(model)
	if !got.delConfirm || got.delKind != "document" || got.delID != 1 {
		t.Fatalf("d should open document delete confirm: %+v", got.delKind)
	}
}

func TestDocsEsc(t *testing.T) {
	m := docsTestModel()
	nm, _ := m.keyDocs(tea.KeyMsg{Type: tea.KeyEsc})
	if nm.(model).view != viewBrowseProject {
		t.Fatalf("esc should return home")
	}
}

func TestDocsOpenFromContextSprint(t *testing.T) {
	m := goldenTreeModel() // tree with milestone 1 + sprint 3 expanded, cursor on sprint row
	nm, cmd := m.openDocsFromContext()
	got := nm.(model)
	if got.view != viewDocs || got.docOwnerType != "sprint" || cmd == nil {
		t.Fatalf("context open should bind sprint owner: type=%q view=%v", got.docOwnerType, got.view)
	}
}

func TestDocsOpenFromContextNoFocus(t *testing.T) {
	m := model{view: viewHome, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	_, cmd := m.openDocsFromContext()
	if cmd == nil {
		t.Fatalf("no focus should still return a notice cmd")
	}
	if msg := cmd(); msg == nil {
		t.Fatalf("notice cmd nil")
	}
}

func TestDocsSaveDispatch(t *testing.T) {
	m := docsTestModel()
	m.view = viewDocs
	m.docEditID = 1
	if _, cmd := m.Update(editorFinishedMsg{content: "changed", changed: true}); cmd == nil {
		t.Fatalf("changed edit should dispatch save")
	}
}

// DD2-169: das Documents-Feld im Meilenstein-/Sprint-Flat-Detail öffnet den
// owner-gebundenen Docs-Browser statt eines skalaren Edits.
func TestFlatDocumentsFieldOpensBrowser(t *testing.T) {
	m := goldenTreeModel()
	m.treeCursor = 0 // milestone node
	nm, cmd := m.editFlatField(detailField{"documents", "Documents", "docs"})
	got := nm.(model)
	if got.view != viewDocs || got.docOwnerType != "milestone" || cmd == nil {
		t.Fatalf("documents field should open docs browser for milestone: view=%v owner=%q", got.view, got.docOwnerType)
	}

	m2 := goldenTreeModel()
	m2.treeCursor = 1 // sprint node
	nm2, _ := m2.editFlatField(detailField{"documents", "Documents", "docs"})
	if nm2.(model).docOwnerType != "sprint" {
		t.Fatalf("documents field on sprint should bind sprint owner, got %q", nm2.(model).docOwnerType)
	}
}

// DD2-167 Rework: Detail-Header zeigt created/updated/status, sobald gesetzt.
func TestDocsMetaHeader(t *testing.T) {
	m := docsTestModel()
	created, updated := "2026-06-29 08:00", "2026-06-30 09:00"
	m.docList[0].CreatedAt = &created
	m.docList[0].UpdatedAt = &updated
	m.docList[0].Status = "draft"
	m.doclist.cursor = 0
	joined := strings.Join(m.docDetailRows(60), "\n")
	for _, want := range []string{"created:", "updated:", "status: draft"} {
		if !strings.Contains(joined, want) {
			t.Fatalf("doc detail meta missing %q:\n%s", want, joined)
		}
	}
}

// DD2-163 Rework: openAllDocs setzt den projektweiten Modus + lädt.
func TestDocsOpenAllMode(t *testing.T) {
	m := docsTestModel()
	nm, cmd := m.openAllDocs()
	got := nm.(model)
	if !got.docAllMode || got.view != viewDocs || cmd == nil {
		t.Fatalf("openAllDocs should set all-mode + load: all=%v", got.docAllMode)
	}
}

// DD2-163 Rework: im All-Modus wird der Owner pro Zeile aufgelöst (enter/delete).
func TestDocsAllModeResolvesOwner(t *testing.T) {
	mid := 45
	sid := 7
	dMile := api.Document{ID: 1, MilestoneID: &mid, Title: "M-Doc"}
	dSprint := api.Document{ID: 2, SprintID: &sid, Title: "S-Doc"}
	if ot, oid := docOwnerOf(&dMile); ot != "milestone" || oid != 45 {
		t.Fatalf("milestone owner wrong: %s %d", ot, oid)
	}
	if ot, oid := docOwnerOf(&dSprint); ot != "sprint" || oid != 7 {
		t.Fatalf("sprint owner wrong: %s %d", ot, oid)
	}
	m := docsTestModel()
	m.docAllMode = true
	m.docList = []api.Document{dSprint}
	m.doclist.setLen(1)
	m.doclist.cursor = 0
	nm, cmd := m.keyDocs(tea.KeyMsg{Type: tea.KeyEnter})
	got := nm.(model)
	if got.docOwnerType != "sprint" || got.docOwnerID != 7 || cmd == nil {
		t.Fatalf("all-mode enter should bind row owner: type=%q id=%d", got.docOwnerType, got.docOwnerID)
	}
}

// DD2-163 Rework: Create ist im All-Modus mangels Owner gesperrt (nur Notice).
func TestDocsAllModeCreateBlocked(t *testing.T) {
	m := docsTestModel()
	m.docAllMode = true
	nm, cmd := m.keyDocs(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("n")})
	if nm.(model).view != viewDocs || cmd == nil {
		t.Fatalf("n in all-mode should stay + notice")
	}
	if msg := cmd(); msg == nil {
		t.Fatalf("notice cmd nil")
	}
}

// DD2-163 Rework: Inline-Doc-Liste im Tree-Detail (lazy load + render).
func TestTreeInlineDocs(t *testing.T) {
	m := goldenTreeModel()
	m.ownerDocs = map[string][]api.Document{}
	nodes := m.treeNodes()
	// syncOwnerDocs liefert für uncached Knoten einen Lade-Cmd …
	if cmd := m.syncOwnerDocs(nodes); cmd == nil {
		t.Fatalf("uncached focused node should yield a load cmd")
	}
	// … und renderOwnerDocs zeigt die gecachten Titel.
	mid := goldenTreeModel().milestones[0].ID
	m.ownerDocs[depCacheKey("m", mid)] = []api.Document{{ID: 1, Title: "Inline Plan"}}
	out := m.docsSectionBody(depCacheKey("m", mid), 40)
	if !strings.Contains(out, "Inline Plan") { // DD2-196: Section-Body ohne eigenen Header
		t.Fatalf("inline docs render wrong:\n%s", out)
	}
}

func TestGoldenDocs(t *testing.T) {
	assertGolden(t, "docs", docsTestModel().View())
}
