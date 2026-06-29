package tui

// tags_test.go — DD2-75 (Tag-Manager) + DD2-33 (Tag-Picker) Verhaltenstests.
// State/Update-Ebene (kein Netz): Tasten → Modell-Transitionen, Cache-Patch.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func runes(s string) tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)} }

// --- Keymap ---

func TestTagKeymapBindings(t *testing.T) {
	if !bindHas(keys.Tags, "T") {
		t.Errorf("Tags-Binding fehlt 'T': %v", keys.Tags.Keys())
	}
	if !bindHas(keys.TagAssign, "t") {
		t.Errorf("TagAssign-Binding fehlt 't': %v", keys.TagAssign.Keys())
	}
}

// --- DD2-75: Manager ---

func TestOpenTagManagerSetsView(t *testing.T) {
	m := model{view: viewBrowseProject}
	mi, cmd := m.openTagManager()
	m = mi.(model)
	if m.view != viewManageTags {
		t.Fatalf("view=%d, want viewManageTags", m.view)
	}
	if m.tagReturn != viewBrowseProject {
		t.Errorf("tagReturn=%d, want viewBrowseProject (Quell-View gemerkt)", m.tagReturn)
	}
	if cmd == nil {
		t.Errorf("openTagManager liefert keinen loadTags-Cmd")
	}
}

func TestTagManagerNewOpensCreateForm(t *testing.T) {
	m := model{view: viewManageTags}
	mi, _ := m.keyTags(runes("c")) // DD2-174: Create ist global c (war n)
	m = mi.(model)
	if m.form == nil || m.formKind != "tagCreate" {
		t.Fatalf("c → form=%v kind=%q, want tagCreate", m.form != nil, m.formKind)
	}
	if m.tagEditID != 0 {
		t.Errorf("create: tagEditID=%d, want 0", m.tagEditID)
	}
}

func TestTagManagerEditOpensPresetForm(t *testing.T) {
	m := model{view: viewManageTags, tags: []api.Tag{{ID: 5, Name: "infra", Color: "blue"}}}
	m.taglist.setLen(1)
	mi, _ := m.keyTags(runes("e"))
	m = mi.(model)
	if m.form == nil || m.formKind != "tagEdit" {
		t.Fatalf("e → form=%v kind=%q, want tagEdit", m.form != nil, m.formKind)
	}
	if m.tagEditID != 5 {
		t.Errorf("edit: tagEditID=%d, want 5 (selektierter Tag)", m.tagEditID)
	}
}

func TestTagManagerDeleteConfirmFlow(t *testing.T) {
	m := model{view: viewManageTags, tags: []api.Tag{{ID: 7, Name: "spike", Color: "peach", UsageCount: 3}}}
	m.taglist.setLen(1)
	mi, _ := m.keyTags(runes("d"))
	m = mi.(model)
	if !m.tagDelConfNo || m.tagDelID != 7 || m.tagDelUsage != 3 {
		t.Fatalf("d → conf=%v id=%d usage=%d, want true/7/3", m.tagDelConfNo, m.tagDelID, m.tagDelUsage)
	}
	// n bricht ab — kein Lösch-Cmd, Confirm zu.
	mi, _ = m.keyTags(runes("n"))
	m = mi.(model)
	if m.tagDelConfNo {
		t.Errorf("n → Confirm noch offen, want geschlossen")
	}
}

func TestTagManagerEscReturnsToSource(t *testing.T) {
	m := model{view: viewManageTags, tagReturn: viewBrowseProject}
	mi, _ := m.keyTags(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.view != viewBrowseProject {
		t.Errorf("esc → view=%d, want viewBrowseProject (tagReturn)", m.view)
	}
}

// --- DD2-33: Picker ---

func TestOpenTagPickerPresetsCurrent(t *testing.T) {
	m := model{}
	mi, cmd := m.openTagPicker("issue", 1, "DD2-1 X", []api.Tag{{ID: 3}, {ID: 9}})
	m = mi.(model)
	if !m.tagPick || m.tagPickKind != "issue" || m.tagPickID != 1 {
		t.Fatalf("picker state falsch: pick=%v kind=%q id=%d", m.tagPick, m.tagPickKind, m.tagPickID)
	}
	if !m.tagPickChecked[3] || !m.tagPickChecked[9] {
		t.Errorf("Vorbelegung aus current fehlt: %v", m.tagPickChecked)
	}
	if cmd == nil {
		t.Errorf("openTagPicker liefert keinen loadTagPick-Cmd")
	}
}

func TestTagPickerToggle(t *testing.T) {
	m := model{tagPick: true, tagPickAll: []api.Tag{{ID: 2, Name: "a"}, {ID: 4, Name: "b"}}, tagPickChecked: map[int]bool{}}
	m.tagPickLoaded = true
	m.tagPickMenu.setLen(2)
	mi, _ := m.keyTagPicker(runes("x")) // cursor 0 → Tag 2 an
	m = mi.(model)
	if !m.tagPickChecked[2] {
		t.Errorf("x → Tag 2 nicht angekreuzt: %v", m.tagPickChecked)
	}
	mi, _ = m.keyTagPicker(runes("x")) // nochmal → aus
	m = mi.(model)
	if m.tagPickChecked[2] {
		t.Errorf("x erneut → Tag 2 sollte aus sein: %v", m.tagPickChecked)
	}
}

func TestTagPickerEnterAssigns(t *testing.T) {
	m := model{client: api.NewClient("10"), tagPick: true,
		tagPickKind: "issue", tagPickID: 1,
		tagPickAll: []api.Tag{{ID: 2}}, tagPickChecked: map[int]bool{2: true}}
	m.tagPickMenu.setLen(1)
	mi, cmd := m.keyTagPicker(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.tagPick {
		t.Errorf("enter → Picker sollte zu sein")
	}
	if cmd == nil {
		t.Errorf("enter → kein doAssignTags-Cmd")
	}
}

// tagPickDataMsg füllt die Tag-Liste; hasCurrent baut die Vorbelegung neu.
func TestTagPickDataMsgApplies(t *testing.T) {
	m := model{tagPick: true, tagPickKind: "sprint", tagPickID: 5, tagPickChecked: map[int]bool{}}
	msg := tagPickDataMsg{kind: "sprint", id: 5,
		all:     []api.Tag{{ID: 1}, {ID: 2}, {ID: 3}},
		current: []api.Tag{{ID: 2}}, hasCurrent: true}
	mi, _ := m.Update(msg)
	m = mi.(model)
	if !m.tagPickLoaded || len(m.tagPickAll) != 3 {
		t.Fatalf("Daten nicht übernommen: loaded=%v n=%d", m.tagPickLoaded, len(m.tagPickAll))
	}
	if !m.tagPickChecked[2] || m.tagPickChecked[1] {
		t.Errorf("current-Vorbelegung falsch: %v", m.tagPickChecked)
	}
}

// tagAssignedMsg patcht die Issue-Tags in allen lokalen Caches (live-Update).
func TestTagAssignedPatchesIssueCache(t *testing.T) {
	m := model{
		tagPick:    true,
		treeIssues: map[int][]api.Issue{99: {{ID: 1, Key: "DD2-1"}}},
		backlog:    []api.Issue{{ID: 1, Key: "DD2-1"}},
		curSprint:  &api.Sprint{ID: 99, Items: []api.Issue{{ID: 1, Key: "DD2-1"}}},
	}
	newTags := []api.Tag{{ID: 8, Name: "done", Color: "green"}}
	mi, _ := m.Update(tagAssignedMsg{kind: "issue", id: 1, tags: newTags, label: "DD2-1"})
	m = mi.(model)
	if m.tagPick {
		t.Errorf("tagAssignedMsg sollte Picker schließen")
	}
	if got := m.treeIssues[99][0].Tags; len(got) != 1 || got[0].ID != 8 {
		t.Errorf("treeIssues nicht gepatcht: %v", got)
	}
	if got := m.backlog[0].Tags; len(got) != 1 || got[0].ID != 8 {
		t.Errorf("backlog nicht gepatcht: %v", got)
	}
	if got := m.curSprint.Items[0].Tags; len(got) != 1 || got[0].ID != 8 {
		t.Errorf("curSprint nicht gepatcht: %v", got)
	}
}

// --- DD2-33 Part B: Tags in den Create-Forms ---

func TestTagMultiSelectKey(t *testing.T) {
	f := tagMultiSelect([]api.Tag{{ID: 5, Name: "x"}})
	if f.GetKey() != "tags" {
		t.Errorf("Multiselect-Key = %q, want tags", f.GetKey())
	}
}

// Tag-Feld erscheint nur bei vorhandenen Tags (kein leeres Multiselect).
// Alle Create-Forms sind jetzt vanilla huh — Issue eingeschlossen.
func TestBuildFormTagFieldConditional(t *testing.T) {
	for _, kind := range []string{"issue", "milestone", "sprint"} {
		var with, without tea.Model
		switch kind {
		case "issue":
			with = buildIssueForm([]api.Tag{{ID: 1, Name: "alpha"}})
			without = buildIssueForm(nil)
		case "milestone":
			with = buildMilestoneForm(nil, []api.Tag{{ID: 1, Name: "alpha"}})
			without = buildMilestoneForm(nil, nil)
		case "sprint":
			with = buildSprintForm(nil, []api.Tag{{ID: 1, Name: "alpha"}})
			without = buildSprintForm(nil, nil)
		}
		_ = with.Init()
		if !strings.Contains(with.View(), "Tags") {
			t.Errorf("%s mit Tags: Multiselect-Titel fehlt im View", kind)
		}
		_ = without.Init()
		if strings.Contains(without.View(), "Tags") {
			t.Errorf("%s ohne Tags: kein Tag-Feld erwartet", kind)
		}
	}
}

// Ohne Auswahl darf das Anlegen keinen Tag erzwingen → selectedTagIDs leer.
func TestSelectedTagIDsEmptyWhenNothingPicked(t *testing.T) {
	m := &model{form: buildIssueForm([]api.Tag{{ID: 1, Name: "a"}})}
	_ = m.form.Init()
	if ids := m.selectedTagIDs(); len(ids) != 0 {
		t.Errorf("ohne Auswahl: TagIDs=%v, want leer (kein Tag erzwungen)", ids)
	}
}

// tagMutatedMsg im Manager triggert einen Reload (loadTags-Cmd).
func TestTagMutatedReloadsInManager(t *testing.T) {
	m := model{view: viewManageTags, client: api.NewClient("10")}
	mi, cmd := m.Update(tagMutatedMsg{label: "Tag angelegt: x"})
	_ = mi
	if cmd == nil {
		t.Errorf("tagMutatedMsg im Manager sollte loadTags-Cmd liefern")
	}
}
