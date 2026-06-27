package tui

// Golden-Snapshot-Tests: View() ist eine reine Funktion → die volle gerenderte
// Ausgabe (Rahmen, Spaltenbreiten, Truncation, Layout) wird deterministisch gegen
// testdata/*.golden gedifft. Fängt Layout-/Runewidth-/Rahmen-Regressionen, die
// reine State-Assertions maskieren. Neu erzeugen/aktualisieren:
//   go test ./internal/tui/ -run TestGolden -update-golden
// Bewusst NICHT abgedeckt: Farb-Kontrast + terminal-/tmux-spezifisches Rendering
// (OSC/Terminfo) — das bleibt der menschliche Augenschein (vgl. DD2-24).

import (
	"flag"
	"os"
	"path/filepath"
	"testing"

	"devd-cli/internal/api"
)

var updateGolden = flag.Bool("update-golden", false, "Golden-Dateien neu schreiben")

func assertGolden(t *testing.T, name, got string) {
	t.Helper()
	path := filepath.Join("testdata", name+".golden")
	if *updateGolden {
		if err := os.MkdirAll("testdata", 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(got), 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Golden fehlt (%s) — mit -update-golden erzeugen: %v", path, err)
	}
	if got != string(want) {
		t.Errorf("Layout weicht vom Golden %q ab (Rahmen/Breite/Truncation?).\n--- got ---\n%s\n--- want ---\n%s", name, got, string(want))
	}
}

// goldenModel ist ein deterministischer Snapshot-Zustand (keine Zeit/Zufall).
func goldenModel(view viewID, depth int) model {
	g := "Detail soll scrollbar sein, damit umfangreicher Inhalt lesbar bleibt."
	bg := "Hintergrund mit Text, der über die Terminalbreite hinausläuft und sauber umgebrochen werden muss, damit die Zeilenzählung beim Scrollen stimmt."
	iss := api.Issue{ID: 5, Key: "DD2-99", Title: "Beispiel-Issue für den Snapshot", Status: "to_review", Type: "bug", Priority: 1, Goal: &g, Background: &bg}
	iss.UserStories = []api.UserStory{{Title: "US eins", Verdict: "accepted"}, {Title: "US zwei", Verdict: "open"}}
	sp := api.Sprint{ID: 3, Key: "DD2#9", Name: "Sprint Neun", Status: "review", Items: []api.Issue{iss}}
	ms := api.Milestone{ID: 1, Name: "Meilenstein Eins", Status: "active", Sprints: []api.Sprint{sp}}
	m := model{view: view, depth: depth, width: 90, height: 22, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	m.milestones = []api.Milestone{ms}
	m.mlist.setLen(1)
	m.slist.setLen(1)
	m.ilist.setLen(1)
	m.curSprint = &sp
	return m
}

func TestGoldenIssueDetail(t *testing.T)  { assertGolden(t, "issue_detail", goldenModel(viewDetail, 2).View()) }
func TestGoldenSprintDetail(t *testing.T) { assertGolden(t, "sprint_detail", goldenModel(viewSprint, 1).View()) }
func TestGoldenColumns(t *testing.T)      { assertGolden(t, "columns", goldenModel(viewColumns, 0).View()) }

// goldenTreeModel expandiert Meilenstein+Sprint und cached die Issues, damit der
// Tree-Primat-View (DD2-61) die volle Hierarchie + Detail-Pane rendert.
func goldenTreeModel() model {
	m := goldenModel(viewTree, 0)
	m.treeExpMile = map[int]bool{1: true}
	m.treeExpSprint = map[int]bool{3: true}
	m.treeIssues = map[int][]api.Issue{3: m.curSprint.Items}
	m.treeCursor = 1 // Sprint-Zeile selektiert (Cursor-Balken sichtbar)
	return m
}

func TestGoldenTree(t *testing.T) { assertGolden(t, "tree", goldenTreeModel().View()) }
