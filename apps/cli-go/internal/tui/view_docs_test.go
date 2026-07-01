package tui

import (
	"fmt"
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

// DD2-244: ein langer Dokumenttitel wird im Detail mehrzeilig gewrappt statt
// (via renderPane) auf eine Zeile abgeschnitten.
func TestDocsDetailTitleWraps(t *testing.T) {
	m := docsTestModel()
	long := "This is a very long document title that should wrap onto multiple lines"
	m.docList[0].Title = long
	m.doclist.cursor = 0
	rows := m.docDetailRows(26)
	joined := strings.Join(rows, "\n")
	if !strings.Contains(joined, "multiple") || !strings.Contains(joined, "wrap") {
		t.Fatalf("long title should wrap (full text visible), got:\n%s", joined)
	}
	if rows[0] == long {
		t.Fatalf("title should be split across rows, not one long row: %v", rows)
	}
}

// DD2-244 (Reject-Fix): der Titel muss auch in der MASTER-LISTE (linke Ranleiste)
// mehrzeilig umbrechen, nicht nur im Detail — PO-Reject: "In der Ranleiste (links)
// brechen die Dokumententitel weiterhin nicht um".
func TestDocsListTitleWraps(t *testing.T) {
	m := docsTestModel()
	long := "This is a very long document title that should wrap onto multiple lines"
	m.docList[0].Title = long
	m.doclist.cursor = 0
	out := m.docLeftPane(26, 18)
	if !strings.Contains(out, "multiple") || !strings.Contains(out, "wrap") {
		t.Fatalf("long title should wrap in the list pane (full text visible), got:\n%s", out)
	}
}

// DD2-251: Master-Liste zeigt Zeile 1 = Dateiname, Zeile 2 = Titel darunter.
func TestDocsListShowsFilename(t *testing.T) {
	m := docsTestModel()
	fp := "docs/plan.md"
	m.docList[0].FilePath = &fp
	m.doclist.cursor = 0
	out := m.docLeftPane(30, 10)
	if !strings.Contains(out, "[plan.md]") {
		t.Fatalf("filename [plan.md] should be shown above the title, got:\n%s", out)
	}
}

// DD2-251: ohne file_path zeigt die Liste einen Platzhalter statt leerer Zeile.
func TestDocsListShowsFilenamePlaceholder(t *testing.T) {
	m := docsTestModel()
	m.doclist.cursor = 0
	out := m.docLeftPane(30, 10)
	if !strings.Contains(out, "[(no file)]") {
		t.Fatalf("missing file_path should render placeholder, got:\n%s", out)
	}
}

// DD2-244: die Liste muss der Selektion nachscrollen (gleiche Fensterung wie ToDos,
// DD2-239) — sonst würde das Wrappen den Cursor schneller aus dem Fenster laufen lassen.
func TestDocsListFollowsCursor(t *testing.T) {
	m := docsTestModel()
	mid := 45
	docs := make([]api.Document, 20)
	for i := range docs {
		docs[i] = api.Document{ID: i + 1, MilestoneID: &mid, Title: fmt.Sprintf("Doc%d", i)}
	}
	m.docList = docs
	m.doclist.setLen(len(docs))
	m.doclist.cursor = 19

	out := m.docLeftPane(30, 10)
	if !strings.Contains(out, "Doc19") {
		t.Fatalf("cursor item Doc19 must stay visible, got:\n%s", out)
	}
}

// DD2-243: docAssignOpts sammelt nur offene Meilensteine + deren nicht-finale Sprints.
func TestDocAssignOptsFilter(t *testing.T) {
	milestones := []api.Milestone{
		{ID: 1, Name: "Open MS", Status: "in_progress", Sprints: []api.Sprint{
			{ID: 10, Key: "DD2#10", Name: "Open Sprint", Status: "new"},
			{ID: 11, Key: "DD2#11", Name: "Done Sprint", Status: "completed"},
		}},
		{ID: 2, Name: "Closed MS", Status: "completed", Sprints: []api.Sprint{
			{ID: 12, Key: "DD2#12", Name: "Orphan Sprint", Status: "new"},
		}},
	}
	opts := docAssignOpts(milestones)
	if len(opts) != 2 {
		t.Fatalf("want 2 targets (Open MS + its open sprint), got %d: %+v", len(opts), opts)
	}
	if opts[0].ownerType != "milestone" || opts[0].ownerID != 1 {
		t.Fatalf("first opt should be Open MS: %+v", opts[0])
	}
	if opts[1].ownerType != "sprint" || opts[1].ownerID != 10 {
		t.Fatalf("second opt should be its open sprint: %+v", opts[1])
	}
}

// DD2-243: a im Docs-Browser öffnet den Zuweisungs-Picker für das selektierte Doc.
func TestDocsOpenAssign(t *testing.T) {
	m := docsTestModel()
	m.milestones = []api.Milestone{{ID: 1, Name: "M1", Status: "in_progress"}}
	m.doclist.cursor = 0
	nm, _ := m.keyDocs(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("a")})
	got := nm.(model)
	if !got.docAsPick || got.docAsDocID != 1 || len(got.docAsOpts) != 1 {
		t.Fatalf("a should open assign picker for doc 1: pick=%v docID=%d opts=%d", got.docAsPick, got.docAsDocID, len(got.docAsOpts))
	}
}

// DD2-243: enter im Picker schließt ihn und feuert die Zuweisung.
func TestDocAssignPickAndFire(t *testing.T) {
	m := docsTestModel()
	m.milestones = []api.Milestone{{ID: 1, Name: "M1", Status: "in_progress"}}
	m.doclist.cursor = 0
	nm, _ := m.keyDocs(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("a")})
	m = nm.(model)
	nm2, cmd := m.keyDocAssign(tea.KeyMsg{Type: tea.KeyEnter})
	if nm2.(model).docAsPick {
		t.Fatal("enter sollte den Picker schließen")
	}
	if cmd == nil {
		t.Fatal("enter sollte die Zuweisung auslösen")
	}
}

// DD2-243: docMovedMsg lädt die Docs-Liste neu (Erfolg) bzw. zeigt den Fehler (Notice).
func TestDocMovedMsgReloads(t *testing.T) {
	m := docsTestModel()
	nm, cmd := m.Update(docMovedMsg{docID: 1})
	if cmd == nil {
		t.Fatal("success sollte Docs neu laden")
	}
	if !strings.Contains(nm.(model).status, "moved") {
		t.Fatalf("status should note the move, got %q", nm.(model).status)
	}
	nm2, _ := m.Update(docMovedMsg{docID: 1, err: "boom"})
	if !strings.Contains(nm2.(model).status, "boom") {
		t.Fatalf("error status should surface, got %q", nm2.(model).status)
	}
}

func TestGoldenDocs(t *testing.T) {
	assertGolden(t, "docs", docsTestModel().View())
}

// DD2-254: Default-Filter "open" (draft+active) blendet archivierte Dokumente aus.
func TestDocsDefaultFilterHidesArchived(t *testing.T) {
	mid := 45
	m := model{client: nil}
	nm, _ := m.openDocs("milestone", mid, "TUI M3")
	got := nm.(model)
	if got.docStatusFilter != "open" {
		t.Fatalf("openDocs should default docStatusFilter to 'open', got %q", got.docStatusFilter)
	}
	got.docList = []api.Document{
		{ID: 1, Title: "Draft doc", Status: "draft"},
		{ID: 2, Title: "Active doc", Status: "active"},
		{ID: 3, Title: "Archived doc", Status: "archived"},
	}
	list := got.filteredDocs()
	if len(list) != 2 {
		t.Fatalf("default filter should hide archived docs, got %d: %+v", len(list), list)
	}
	for _, d := range list {
		if d.Status == "archived" {
			t.Fatalf("archived doc leaked through default filter: %+v", d)
		}
	}
}

// DD2-254: openAllDocs setzt denselben Default (All-Docs-Modus).
func TestDocsAllModeDefaultFilterHidesArchived(t *testing.T) {
	m := model{client: nil}
	nm, _ := m.openAllDocs()
	if nm.(model).docStatusFilter != "open" {
		t.Fatalf("openAllDocs should default docStatusFilter to 'open', got %q", nm.(model).docStatusFilter)
	}
}

// DD2-254: docMatchesStatusFilter deckt alle Filterwerte ab.
func TestDocMatchesStatusFilter(t *testing.T) {
	cases := []struct {
		status, filter string
		want           bool
	}{
		{"draft", "open", true},
		{"active", "open", true},
		{"archived", "open", false},
		{"archived", "all", true},
		{"archived", "", true},
		{"draft", "draft", true},
		{"active", "draft", false},
	}
	for _, c := range cases {
		if got := docMatchesStatusFilter(c.status, c.filter); got != c.want {
			t.Errorf("docMatchesStatusFilter(%q, %q) = %v, want %v", c.status, c.filter, got, c.want)
		}
	}
}

// DD2-252: r im Docs-Browser öffnet die Rename-Form, vorbelegt mit dem file_path.
func TestDocsOpenRename(t *testing.T) {
	m := docsTestModel()
	fp := "docs/plan.md"
	m.docList[0].FilePath = &fp
	m.doclist.cursor = 0
	nm, _ := m.keyDocs(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("r")})
	got := nm.(model)
	if got.formKind != "docRename" || got.docRenameID != 1 || got.form == nil {
		t.Fatalf("r should open the docRename form for doc 1: kind=%q id=%d form=%v", got.formKind, got.docRenameID, got.form)
	}
	if v := got.form.View(); !strings.Contains(v, fp) {
		t.Fatalf("form should be preset with current file_path %q, got:\n%s", fp, v)
	}
}

// DD2-253: y im Docs-Browser kopiert Titel+Body als Markdown, setzt Erfolgs-Status.
func TestDocsYank(t *testing.T) {
	m := docsTestModel()
	m.doclist.cursor = 0
	nm, cmd := m.keyDocs(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("y")})
	if cmd != nil {
		t.Fatal("docYank ist synchron, sollte keinen Cmd liefern")
	}
	if !strings.Contains(nm.(model).status, "copied") {
		t.Fatalf("status should note the copy, got %q", nm.(model).status)
	}
}

// DD2-253: docClip baut Titel als Markdown-Kopfzeile + Body darunter.
func TestDocClipFormat(t *testing.T) {
	d := &api.Document{Title: "Plan", Body: "body one"}
	got := docClip(d)
	want := "# Plan\n\nbody one"
	if got != want {
		t.Fatalf("docClip = %q, want %q", got, want)
	}
}

// DD2-255: f zykelt den Status-Filter in der dokumentierten Reihenfolge.
func TestNextDocStatusCycle(t *testing.T) {
	seq := []string{"open", "draft", "active", "archived", "all", "open"}
	cur := "open"
	for i := 1; i < len(seq); i++ {
		cur = nextDocStatus(cur)
		if cur != seq[i] {
			t.Fatalf("step %d: got %q, want %q", i, cur, seq[i])
		}
	}
}

// DD2-255: f im Docs-Browser zykelt den Filter, setzt den Cursor zurück, zeigt
// den aktiven Filter im Titel.
func TestDocsFilterKeyCycles(t *testing.T) {
	m := docsTestModel()
	m.docStatusFilter = "open"
	m.docList = []api.Document{
		{ID: 1, Title: "Draft", Status: "draft"},
		{ID: 2, Title: "Archived", Status: "archived"},
	}
	m.doclist.cursor = 1
	nm, _ := m.keyDocs(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("f")})
	got := nm.(model)
	if got.docStatusFilter != "draft" {
		t.Fatalf("f should cycle open→draft, got %q", got.docStatusFilter)
	}
	if got.doclist.cursor != 0 {
		t.Fatalf("cursor should reset after filter change, got %d", got.doclist.cursor)
	}
	if !strings.Contains(got.docListTitle(), "[draft]") {
		t.Fatalf("title should show active filter, got %q", got.docListTitle())
	}
}

// DD2-256: während der Suche zeigt der Kopf der Detail-Pane die Query statt
// "Detail"; der Footer klobbert nicht mehr die Status-Zeile.
func TestDocsSearchInDetailPane(t *testing.T) {
	m := docsTestModel()
	m.docSearching = true
	m.docQuery = "plan"
	out := m.View()
	if !strings.Contains(out, "⌕ plan") {
		t.Fatalf("detail pane header should show the search query, got:\n%s", out)
	}
	if strings.Contains(out, "Search: plan") {
		t.Fatalf("search should no longer clobber the footer, got:\n%s", out)
	}
}

// DD2-252: Formular-Abschluss feuert doRenameDocument; docRenamedMsg lädt neu bzw. zeigt Fehler.
func TestDocRenamedMsgReloads(t *testing.T) {
	m := docsTestModel()
	nm, cmd := m.Update(docRenamedMsg{docID: 1})
	if cmd == nil {
		t.Fatal("success sollte Docs neu laden")
	}
	if !strings.Contains(nm.(model).status, "renamed") {
		t.Fatalf("status should note the rename, got %q", nm.(model).status)
	}
	nm2, _ := m.Update(docRenamedMsg{docID: 1, err: "boom"})
	if !strings.Contains(nm2.(model).status, "boom") {
		t.Fatalf("error status should surface, got %q", nm2.(model).status)
	}
}
