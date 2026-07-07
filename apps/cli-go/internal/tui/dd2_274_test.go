package tui

// DD2-274: Mouse-native Click-to-Edit-Popup. Klick auf die Priority-/Status-Zelle
// einer Backlog-Zeile öffnet DIREKT den passenden Picker/Editor für genau dieses
// Feld — ohne vorherige Cursor-Bewegung/View-Wechsel. Geometrie wird analog
// mouseTreeClick (DD2-51) live aus derselben Render-Quelle (backlogLayout/
// backlogListBlocks/blockWindow) abgeleitet, nicht gecacht — kann so nie vom
// tatsächlichen Render abdriften.

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// backlogMouseModel: zwei Backlog-Issues mit unterschiedlichem Typ/Status/Priority,
// breit genug (90x22) für ein realistisches Master-Detail-Layout.
func backlogMouseModel() model {
	return model{
		view: viewBrowseBacklog,
		backlog: []api.Issue{
			{ID: 1, Key: "DD2-1", Title: "First issue", Type: "bug", Priority: 1, Status: "new"},
			{ID: 2, Key: "DD2-2", Title: "Second issue", Type: "feature", Priority: 3, Status: "refined"},
		},
		blist:  listState{length: 2, cursor: 0},
		width:  90,
		height: 22,
	}
}

// firstBacklogRowY liefert die Y-Koordinate der ersten Listenzeile — dieselbe
// Geometrie wie backlogFieldHit (Kopfzeile + Suchzeile), analog
// TestMouseClickSetsTreeCursor.
func firstBacklogRowY(m model) int {
	head, _, _, _, _ := m.backlogLayout()
	return lipgloss.Height(head) + 2 // + obere Border + Suchkopfzeile
}

// AC1: Klick auf die Priority-Zelle der ersten Zeile öffnet den Priority-Editor
// für GENAU dieses Issue, ohne dass der Listen-Cursor vorher bewegt oder der
// Detail-Fokus betreten wurde.
func TestBacklogPriorityClickOpensEditField(t *testing.T) {
	m := backlogMouseModel()
	vis := m.backlogVisible()
	_, _, prioStart, _ := backlogRowCols(vis[0])
	y := firstBacklogRowY(m)

	mi, _ := m.handleMouse(click(prioStart, y))
	got := mi.(model)

	if got.form == nil {
		t.Fatal("Klick auf Priority-Zelle sollte die editField-Form öffnen")
	}
	if got.editField != "priority" || got.editID != vis[0].ID {
		t.Errorf("editField=%q editID=%d, want priority/%d", got.editField, got.editID, vis[0].ID)
	}
	if got.detailFocus {
		t.Error("Klick sollte NICHT den Detail-Fokus/View-Wechsel durchlaufen (AC1)")
	}
	if got.blist.cursor != 0 {
		t.Errorf("Listen-Cursor sollte unverändert bleiben, got %d", got.blist.cursor)
	}
}

// Klick auf die Priority-Zelle der ZWEITEN Zeile (Cursor steht auf Zeile 0) trifft
// das zweite Issue — kein Cursor-Sprung nötig.
func TestBacklogPriorityClickSecondRowHitsSecondIssue(t *testing.T) {
	m := backlogMouseModel()
	vis := m.backlogVisible()
	head, _, lw, _, innerH := m.backlogLayout()
	blocks := m.backlogListBlocks(vis, lw-2, true)
	row0H := len(blocks[0])
	_, _, prioStart, _ := backlogRowCols(vis[1])
	y := lipgloss.Height(head) + 2 + row0H

	mi, _ := m.handleMouse(click(prioStart, y))
	got := mi.(model)
	if got.form == nil {
		t.Fatal("Klick auf Zeile 2 sollte die editField-Form öffnen")
	}
	if got.editID != vis[1].ID {
		t.Errorf("editID=%d, want %d (zweites Issue)", got.editID, vis[1].ID)
	}
	_ = innerH
}

// AC2: Klick auf die Status-Zelle öffnet den Status-Picker (statusPick) für
// genau dieses Issue.
func TestBacklogStatusClickOpensStatusPick(t *testing.T) {
	m := backlogMouseModel()
	vis := m.backlogVisible()
	statusStart, _, _, _ := backlogRowCols(vis[0])
	y := firstBacklogRowY(m)

	mi, _ := m.handleMouse(click(statusStart, y))
	got := mi.(model)

	if !got.statusPick {
		t.Fatal("Klick auf Status-Zelle sollte statusPick öffnen")
	}
	if got.stIssueID != vis[0].ID {
		t.Errorf("stIssueID=%d, want %d", got.stIssueID, vis[0].ID)
	}
	if got.stSprintID != 0 {
		t.Errorf("stSprintID=%d, want 0 (Backlog = unsprinted)", got.stSprintID)
	}
}

// AC2 Guard: ein Issue ohne manuelle Transition (unbekannter/terminaler Status)
// zeigt denselben Warn-Hinweis wie der Tasten-Pfad statt eines leeren Menüs.
func TestBacklogStatusClickGuardsNoTransitions(t *testing.T) {
	m := backlogMouseModel()
	m.backlog[0].Status = "no-such-status" // nicht in issueTransitions → allowedManualStatuses() leer
	vis := m.backlogVisible()
	statusStart, _, _, _ := backlogRowCols(vis[0])
	y := firstBacklogRowY(m)

	mi, _ := m.handleMouse(click(statusStart, y))
	got := mi.(model)
	if got.statusPick {
		t.Error("ohne erlaubte Transition sollte statusPick NICHT öffnen (Guard, wie Tasten-Pfad)")
	}
	if got.toast == nil {
		t.Error("Guard sollte denselben Warn-Toast wie openIssueStatus zeigen")
	}
}

// AC3: Klick außerhalb aller registrierten Hit-Areas ist ein No-op (Backlog hatte
// vor DD2-274 keinerlei Maus-Reaktion) — und mouse_test.go (Tree) bleibt unberührt.
func TestBacklogClickOutsideHitAreasIsNoop(t *testing.T) {
	m := backlogMouseModel()
	y := firstBacklogRowY(m)
	// X mitten im Titel-Text (weit rechts der Icon-Spalten, links der rechten Pane).
	mi, _ := m.handleMouse(click(20, y))
	got := mi.(model)
	if got.form != nil || got.statusPick {
		t.Error("Klick außerhalb der Feld-Hit-Areas darf keinen Picker/Editor öffnen")
	}
}

// AC4: Tasten-Pfad (enterDetailFocus → Feld-Nav → enter) und Maus-Pfad (Klick auf
// die Priority-Zelle) laufen durch dieselbe Öffnen-Funktion — identischer
// resultierender Edit-State, kein Logik-Duplikat.
func TestPriorityKeyboardAndMousePathsAgree(t *testing.T) {
	base := backlogMouseModel()

	kbi, _ := base.keyBacklog(key("l")) // enterDetailFocus (Übersicht, Section-Ebene)
	kb := kbi.(model)
	kbi, _ = kb.keyBacklog(key("l")) // rein in die Feld-Ebene (fieldCursor=0 → title)
	kb = kbi.(model)
	kbi, _ = kb.keyBacklog(key("k")) // → type
	kb = kbi.(model)
	kbi, _ = kb.keyBacklog(key("k")) // → priority
	kb = kbi.(model)
	kbi, _ = kb.keyBacklog(key("enter")) // editFocusedField → openEditField
	kb = kbi.(model)

	if kb.form == nil {
		t.Fatal("Tasten-Pfad sollte die editField-Form öffnen")
	}

	vis := base.backlogVisible()
	_, _, prioStart, _ := backlogRowCols(vis[0])
	y := firstBacklogRowY(base)
	msi, _ := base.handleMouse(click(prioStart, y))
	ms := msi.(model)
	if ms.form == nil {
		t.Fatal("Maus-Pfad sollte die editField-Form öffnen")
	}

	if kb.editEntity != ms.editEntity || kb.editID != ms.editID || kb.editField != ms.editField ||
		kb.editLabel != ms.editLabel || kb.editEditor != ms.editEditor || kb.editValue != ms.editValue {
		t.Errorf("Tasten-/Maus-Pfad ergeben unterschiedlichen Edit-State:\n keyboard: entity=%q id=%d field=%q label=%q editor=%q value=%q\n mouse:    entity=%q id=%d field=%q label=%q editor=%q value=%q",
			kb.editEntity, kb.editID, kb.editField, kb.editLabel, kb.editEditor, kb.editValue,
			ms.editEntity, ms.editID, ms.editField, ms.editLabel, ms.editEditor, ms.editValue)
	}
}

// Regressionsschutz für den bereits existierenden Toast-Hit-Vorrang (DD2-272):
// ein aktiver Toast fängt den Klick weiterhin VOR dem neuen Backlog-Feld-Dispatch
// ab (Prüf-Reihenfolge in handleMouse).
func TestToastHitStillTakesPriorityOverBacklogFieldClick(t *testing.T) {
	m := backlogMouseModel()
	m, _ = m.showToast(toastInfo, "hint", "", nil, false)
	x, y, _, _ := m.toastGeometry()

	mi, _ := m.handleMouse(tea.MouseMsg{Button: tea.MouseButtonLeft, Action: tea.MouseActionPress, X: x, Y: y})
	got := mi.(model)
	if got.toast != nil {
		t.Error("Klick auf die Toast-Hit-Area sollte den Toast schließen (Vorrang vor Feld-Klick)")
	}
	if got.form != nil || got.statusPick {
		t.Error("Toast-Klick darf keinen Backlog-Picker/-Editor öffnen")
	}
}
