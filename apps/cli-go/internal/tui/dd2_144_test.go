package tui

// DD2-144: User-Stories aus dem Detail-Fokus anlegen/bearbeiten + alle Felder
// editierbar (auch leer). Tests gegen die geteilte Detail-Maschine (Tree/Backlog).

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// full=true: ein feldloses Issue bekommt trotzdem Background/Context, Relevant Files
// und eine User-Stories-Section mit Add-Feld (US-115: alle Felder, auch leer).
func TestIssueSectionsFullShowsEmptyEditable(t *testing.T) {
	it := api.Issue{Key: "DD2-1", Title: "Leer", Type: "bug", Priority: 1, Status: "new"}
	secs := (model{}).issueSections(it, 80, true)
	titles := make([]string, len(secs))
	for i, s := range secs {
		titles[i] = s.title
	}
	joined := strings.Join(titles, " | ")
	for _, want := range []string{"Background / Context", "Relevant Files", "User-Stories (0)"} {
		if !strings.Contains(joined, want) {
			t.Errorf("Section %q fehlt bei full=true: %s", want, joined)
		}
	}
	// User-Stories-Section (letzte) trägt genau das Add-Feld.
	us := secs[len(secs)-1]
	if len(us.fields) != 1 || us.fields[0].key != "us:new" {
		t.Errorf("US-Felder=%+v, want genau [us:new]", us.fields)
	}
}

// full=true mit vorhandenen Stories: ein Feld je Story (us:<id>) + Add-Feld.
func TestUserStoryFieldsPerStory(t *testing.T) {
	qa := "Klick X → Y"
	it := api.Issue{Key: "DD2-1", Title: "T", Type: "bug", Priority: 1,
		UserStories: []api.UserStory{{ID: 7, Title: "S1", QA: &qa}, {ID: 8, Title: "S2"}}}
	secs := (model{}).issueSections(it, 80, true)
	us := secs[len(secs)-1]
	keys := make([]string, len(us.fields))
	for i, f := range us.fields {
		keys[i] = f.key
	}
	if strings.Join(keys, ",") != "us:7,us:8,us:new" {
		t.Errorf("US-Feld-Keys=%v, want us:7,us:8,us:new", keys)
	}
}

// full=false (Review-Preview) bleibt unverändert: leere Felder erzeugen keine
// Background/Relevant-Files/US-Sektionen.
func TestIssueSectionsReadOnlyUnchanged(t *testing.T) {
	it := api.Issue{Key: "DD2-1", Title: "T", Type: "bug", Priority: 1, Status: "new"}
	secs := (model{}).issueSections(it, 80, false)
	for _, s := range secs {
		if strings.Contains(s.title, "Relevant Files") || strings.Contains(s.title, "User-Stories") {
			t.Errorf("read-only Preview zeigt leere Section %q", s.title)
		}
	}
}

func usDetailModel(stories []api.UserStory) model {
	m := treeModel()
	m.treeExpMile[1] = true
	m.treeIssues[10] = []api.Issue{{
		ID: 99, Key: "DD2-9", Title: "T", Type: "bug", Priority: 1, Status: "new",
		UserStories: stories,
	}}
	m.treeExpSprint[10] = true
	m.view = viewBrowseProject
	m.treeCursor = 2
	return m
}

// enter auf dem "+ Add"-Feld der US-Section öffnet die Add-Form fürs Issue.
func TestDetailFocusAddUserStory(t *testing.T) {
	m := usDetailModel(nil)
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})         // detail focus, Overview
	mi, _ = mi.(model).keyTree(key("4"))                       // Sprung zur US-Section (Index 4)
	mi, _ = mi.(model).keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Section → Feld-Ebene
	mi, _ = mi.(model).keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Feld enter → Form
	m = mi.(model)
	if m.formKind != "userStoryAdd" {
		t.Fatalf("formKind=%q, want userStoryAdd", m.formKind)
	}
	if m.usFormIssueID != 99 || m.usFormID != 0 {
		t.Errorf("usFormIssueID=%d usFormID=%d, want 99/0", m.usFormIssueID, m.usFormID)
	}
}

// enter auf einer bestehenden Story öffnet die Edit-Form, vorbelegt mit Titel/QA.
func TestDetailFocusEditUserStory(t *testing.T) {
	qa := "Aktion → Ergebnis"
	m := usDetailModel([]api.UserStory{{ID: 7, Title: "Story Eins", QA: &qa}})
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("4"))                       // US-Section
	mi, _ = mi.(model).keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Feld-Ebene (fieldCursor=0 = us:7)
	mi, _ = mi.(model).keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // enter → Edit-Form
	m = mi.(model)
	if m.formKind != "userStoryEdit" {
		t.Fatalf("formKind=%q, want userStoryEdit", m.formKind)
	}
	if m.usFormID != 7 || m.usFormIssueID != 99 {
		t.Errorf("usFormID=%d usFormIssueID=%d, want 7/99", m.usFormID, m.usFormIssueID)
	}
	_ = qa // Preset-Binding (Value(&t)) ist huh-intern, vor Form-Run nicht über GetString lesbar.
}

// mergeUserStories spiegelt die frische Liste in den Backlog-Cache.
func TestMergeUserStoriesIntoBacklog(t *testing.T) {
	m := model{backlog: []api.Issue{{ID: 5, Key: "DD2-5"}, {ID: 6, Key: "DD2-6"}}}
	m.mergeUserStories(5, []api.UserStory{{ID: 1, Title: "neu"}})
	if len(m.backlog[0].UserStories) != 1 || m.backlog[0].UserStories[0].Title != "neu" {
		t.Errorf("backlog[0] US nicht gemerged: %+v", m.backlog[0].UserStories)
	}
	if len(m.backlog[1].UserStories) != 0 {
		t.Errorf("backlog[1] (anderes Issue) fälschlich verändert")
	}
}

// US-Anlage ist ein Create-Kind → y/n-Confirm vor der Anlage (DD2-93-Konvention).
func TestUserStoryAddIsCreateKind(t *testing.T) {
	if !isCreateKind("userStoryAdd") {
		t.Error("userStoryAdd sollte Create-Kind sein (Confirm)")
	}
	if isCreateKind("userStoryEdit") {
		t.Error("userStoryEdit darf KEIN Create-Kind sein (kein Confirm)")
	}
}
