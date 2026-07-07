package tui

// DD2-274: Mouse-native Click-to-Edit-Popup. Klick auf die Priority-/Status-Zelle
// einer Backlog- ODER Tree-Zeile öffnet DIREKT den passenden Picker/Editor für
// genau dieses Feld — ohne vorherige Cursor-Bewegung/View-Wechsel. Geometrie wird
// analog mouseTreeClick (DD2-51) live aus derselben Render-Quelle (backlogLayout/
// backlogListBlocks/blockWindow bzw. treeLayout/treeLeftBlocks) abgeleitet, nicht
// gecacht — kann so nie vom tatsächlichen Render abdriften.
//
// DD2-274-Fix: die Feld-Hit-Tests rechnen jetzt mit den ECHTEN Screen-Koordinaten
// (Pane-Content-Offsets X = leftContentX, Y = paneOriginY). Vorher verglichen sie
// Screen-X/Y self-konsistent mit pane-content-relativen Spalten und übersahen so,
// dass App-Außenrahmen + Box-Border den Klick real um (X≈2, Y≈1) verschieben —
// exakt der "praktisch unklickbar"-Bug (memory dd2-274 B01).

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
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

// backlogRowY liefert die ECHTE Screen-Y der Kopfzeile der Backlog-Zeile rowIdx
// (paneOriginY = Header + obere Box-Border + App-Außenrahmen, + Such-Kopfzeile,
// + kumulierte Blockhöhen der vorangehenden Zeilen).
func backlogRowY(m model, rowIdx int) int {
	head, _, lw, _, _ := m.backlogLayout()
	blocks := m.backlogListBlocks(m.backlogVisible(), lw-2, true)
	y := m.paneOriginY(head) + 1 // + Such-Kopfzeile
	for i := 0; i < rowIdx; i++ {
		y += len(blocks[i])
	}
	return y
}

// backlogFieldClick übersetzt eine pane-content-relative Spalte cx (aus
// backlogRowCols) in einen echten Screen-Klick auf Zeile rowIdx.
func backlogFieldClick(m model, rowIdx, cx int) tea.MouseMsg {
	return click(m.leftContentX()+cx, backlogRowY(m, rowIdx))
}

// AC1: Klick auf die Priority-Zelle der ersten Zeile öffnet den Priority-Editor
// für GENAU dieses Issue, ohne dass der Listen-Cursor vorher bewegt oder der
// Detail-Fokus betreten wurde.
func TestBacklogPriorityClickOpensEditField(t *testing.T) {
	m := backlogMouseModel()
	vis := m.backlogVisible()
	_, _, prioStart, _ := backlogRowCols(vis[0])

	mi, _ := m.handleMouse(backlogFieldClick(m, 0, prioStart))
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
	_, _, prioStart, _ := backlogRowCols(vis[1])

	mi, _ := m.handleMouse(backlogFieldClick(m, 1, prioStart))
	got := mi.(model)
	if got.form == nil {
		t.Fatal("Klick auf Zeile 2 sollte die editField-Form öffnen")
	}
	if got.editID != vis[1].ID {
		t.Errorf("editID=%d, want %d (zweites Issue)", got.editID, vis[1].ID)
	}
}

// AC2: Klick auf die Status-Zelle öffnet den Status-Picker (statusPick) für
// genau dieses Issue.
func TestBacklogStatusClickOpensStatusPick(t *testing.T) {
	m := backlogMouseModel()
	vis := m.backlogVisible()
	statusStart, _, _, _ := backlogRowCols(vis[0])

	mi, _ := m.handleMouse(backlogFieldClick(m, 0, statusStart))
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

	mi, _ := m.handleMouse(backlogFieldClick(m, 0, statusStart))
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
	vis := m.backlogVisible()
	_, _, _, prioEnd := backlogRowCols(vis[0])
	// Content-Spalte weit rechts der Icon-/Prio-Zonen (im Titel-Text).
	mi, _ := m.handleMouse(backlogFieldClick(m, 0, prioEnd+6))
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
	msi, _ := base.handleMouse(backlogFieldClick(base, 0, prioStart))
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

// D05: die Lücke zwischen Status-Dot und Priority (1 Spalte Trennraum) gehört jetzt
// zur Status-Zone (nächstgelegen) — ein Klick dorthin verfehlt nicht mehr, sondern
// öffnet den Status-Picker. Regression gegen memory dd2-274 B01.
func TestBacklogStatusGapClickHitsStatus(t *testing.T) {
	m := backlogMouseModel()
	vis := m.backlogVisible()
	_, statusEnd, prioStart, _ := backlogRowCols(vis[0])
	if prioStart <= statusEnd {
		t.Skip("kein Trennraum zwischen Status und Priority in dieser Zeile")
	}
	mi, _ := m.handleMouse(backlogFieldClick(m, 0, statusEnd)) // die Lücken-Spalte
	if !mi.(model).statusPick {
		t.Errorf("Klick auf den Trennraum (col %d) sollte die Status-Zone treffen", statusEnd)
	}
}

// --- Tree-Parität (DD2-274: Spec nennt Backlog- UND Tree-Listen) ---

// treeMouseModel: ein Meilenstein → ein Sprint (beide aufgeklappt) → zwei Issues
// mit unterschiedlichem Typ/Status/Priority, breit genug (90x22) für ein
// realistisches Tree+Detail-Layout. treeNodes()-Reihenfolge: [0]=Meilenstein,
// [1]=Sprint, [2]=Issue "DD2-101", [3]=Issue "DD2-102".
func treeMouseModel() model {
	return model{
		view: viewBrowseProject,
		milestones: []api.Milestone{{
			ID: 1, Name: "M1", Status: "in_progress",
			Sprints: []api.Sprint{{ID: 10, Key: "DD2#1", Name: "S1", Status: "in_progress"}},
		}},
		treeExpMile:   map[int]bool{1: true},
		treeExpSprint: map[int]bool{10: true},
		treeIssues: map[int][]api.Issue{
			10: {
				{ID: 101, Key: "DD2-101", Title: "First tree issue", Type: "bug", Priority: 1, Status: "new"},
				{ID: 102, Key: "DD2-102", Title: "Second tree issue", Type: "feature", Priority: 3, Status: "refined"},
			},
		},
		width:  90,
		height: 22,
	}
}

// treeRowY liefert die ECHTE Screen-Y der Kopfzeile des Tree-Knotens nodeIdx
// (paneOriginY + Such-Kopfzeile + kumulierte Blockhöhen der vorangehenden Knoten).
func treeRowY(m model, nodeIdx int) int {
	nodes := m.treeNodes()
	head, _, lw, _, _ := m.treeLayout()
	blocks := m.treeLeftBlocks(nodes, lw-2, true)
	y := m.paneOriginY(head) + 1
	for i := 0; i < nodeIdx; i++ {
		y += len(blocks[i])
	}
	return y
}

// treeFieldClick übersetzt eine pane-content-relative Spalte cx (aus
// treeIssueRowCols) in einen echten Screen-Klick auf den Tree-Knoten nodeIdx.
func treeFieldClick(m model, nodeIdx, cx int) tea.MouseMsg {
	return click(m.leftContentX()+cx, treeRowY(m, nodeIdx))
}

// AC1 (Tree-Parität): Klick auf die Priority-Zelle eines Tree-Issue-Knotens
// öffnet den Priority-Editor für GENAU dieses Issue, ohne vorherige Cursor-
// Bewegung/View-Wechsel.
func TestTreePriorityClickOpensEditField(t *testing.T) {
	m := treeMouseModel()
	nodes := m.treeNodes()
	_, _, prioStart, _ := treeIssueRowCols(nodes[2])

	mi, _ := m.handleMouse(treeFieldClick(m, 2, prioStart))
	got := mi.(model)

	if got.form == nil {
		t.Fatal("Klick auf Priority-Zelle sollte die editField-Form öffnen")
	}
	if got.editField != "priority" || got.editID != nodes[2].issue.ID {
		t.Errorf("editField=%q editID=%d, want priority/%d", got.editField, got.editID, nodes[2].issue.ID)
	}
	if got.detailFocus {
		t.Error("Klick sollte NICHT den Detail-Fokus/View-Wechsel durchlaufen (AC1)")
	}
	if got.treeCursor != 0 {
		t.Errorf("Tree-Cursor sollte unverändert bleiben, got %d", got.treeCursor)
	}
}

// Klick auf die Priority-Zelle des ZWEITEN Issue-Knotens (Cursor steht auf
// Knoten 0) trifft das zweite Issue — kein Cursor-Sprung nötig.
func TestTreePriorityClickSecondIssueHitsSecondIssue(t *testing.T) {
	m := treeMouseModel()
	nodes := m.treeNodes()
	_, _, prioStart, _ := treeIssueRowCols(nodes[3])

	mi, _ := m.handleMouse(treeFieldClick(m, 3, prioStart))
	got := mi.(model)
	if got.form == nil {
		t.Fatal("Klick auf den zweiten Issue-Knoten sollte die editField-Form öffnen")
	}
	if got.editID != nodes[3].issue.ID {
		t.Errorf("editID=%d, want %d (zweites Issue)", got.editID, nodes[3].issue.ID)
	}
}

// AC2 (Tree-Parität): Klick auf die Status-Zelle öffnet den Status-Picker
// (statusPick) für genau dieses Issue, MIT dem Sprint-Kontext des Tree-Knotens
// (n.sprintID) — anders als Backlog (dort immer 0, unsprinted).
func TestTreeStatusClickOpensStatusPick(t *testing.T) {
	m := treeMouseModel()
	nodes := m.treeNodes()
	statusStart, _, _, _ := treeIssueRowCols(nodes[2])

	mi, _ := m.handleMouse(treeFieldClick(m, 2, statusStart))
	got := mi.(model)

	if !got.statusPick {
		t.Fatal("Klick auf Status-Zelle sollte statusPick öffnen")
	}
	if got.stIssueID != nodes[2].issue.ID {
		t.Errorf("stIssueID=%d, want %d", got.stIssueID, nodes[2].issue.ID)
	}
	if got.stSprintID != 10 {
		t.Errorf("stSprintID=%d, want 10 (Sprint-Kontext des Tree-Knotens)", got.stSprintID)
	}
}

// AC2 Guard (Tree-Parität): ein Issue ohne manuelle Transition zeigt denselben
// Warn-Hinweis wie der Tasten-Pfad statt eines leeren Menüs.
func TestTreeStatusClickGuardsNoTransitions(t *testing.T) {
	m := treeMouseModel()
	m.treeIssues[10][0].Status = "no-such-status" // nicht in issueTransitions → allowedManualStatuses() leer
	nodes := m.treeNodes()
	statusStart, _, _, _ := treeIssueRowCols(nodes[2])

	mi, _ := m.handleMouse(treeFieldClick(m, 2, statusStart))
	got := mi.(model)
	if got.statusPick {
		t.Error("ohne erlaubte Transition sollte statusPick NICHT öffnen (Guard, wie Tasten-Pfad)")
	}
	if got.toast == nil {
		t.Error("Guard sollte denselben Warn-Toast wie openIssueStatus zeigen")
	}
}

// AC3 (Tree-Parität): Klick außerhalb aller registrierten Feld-Hit-Areas verhält
// sich EXAKT wie vor dieser Änderung — der bestehende Zeilen-Cursor-Klick
// (mouseTreeClick, DD2-51) bleibt unangetastet und setzt weiterhin den Cursor.
func TestTreeClickOutsideHitAreasFallsBackToRowCursor(t *testing.T) {
	m := treeMouseModel()
	nodes := m.treeNodes()
	_, _, _, prioEnd := treeIssueRowCols(nodes[2])

	mi, _ := m.handleMouse(treeFieldClick(m, 2, prioEnd+4)) // im Key-Text, außerhalb der Icon-Spalten
	got := mi.(model)
	if got.form != nil || got.statusPick {
		t.Error("Klick außerhalb der Feld-Hit-Areas darf keinen Picker/Editor öffnen")
	}
	if got.treeCursor != 2 {
		t.Errorf("Klick außerhalb der Hit-Areas sollte weiterhin den Zeilen-Cursor setzen (AC3, Vorverhalten), treeCursor=%d, want 2", got.treeCursor)
	}
}

// AC4 (Tree-Parität): Tasten-Pfad (treeCursor auf den Issue-Knoten setzen →
// enterDetailFocus → Feld-Nav → enter) und Maus-Pfad (Klick auf die Priority-
// Zelle desselben Knotens) laufen durch dieselbe Öffnen-Funktion — identischer
// resultierender Edit-State, kein Logik-Duplikat.
func TestTreePriorityKeyboardAndMousePathsAgree(t *testing.T) {
	base := treeMouseModel()
	base.treeCursor = 2 // auf den ersten Issue-Knoten (DD2-101)

	kbi, _ := base.keyTree(key("l")) // treeExpand → enterDetailFocus (Issue-Blatt)
	kb := kbi.(model)
	kbi, _ = kb.keyTree(key("l")) // rein in die Feld-Ebene (fieldCursor=0 → title)
	kb = kbi.(model)
	kbi, _ = kb.keyTree(key("k")) // → type
	kb = kbi.(model)
	kbi, _ = kb.keyTree(key("k")) // → priority
	kb = kbi.(model)
	kbi, _ = kb.keyTree(key("enter")) // editFocusedField → openEditField
	kb = kbi.(model)

	if kb.form == nil {
		t.Fatal("Tasten-Pfad sollte die editField-Form öffnen")
	}

	nodes := base.treeNodes()
	_, _, prioStart, _ := treeIssueRowCols(nodes[2])
	msi, _ := base.handleMouse(treeFieldClick(base, 2, prioStart))
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

// Regressionsschutz (Tree-Parität): der Toast-Hit-Vorrang (DD2-272) fängt den
// Klick weiterhin VOR dem neuen Tree-Feld-Dispatch ab.
func TestToastHitStillTakesPriorityOverTreeFieldClick(t *testing.T) {
	m := treeMouseModel()
	m, _ = m.showToast(toastInfo, "hint", "", nil, false)
	x, y, _, _ := m.toastGeometry()

	mi, _ := m.handleMouse(tea.MouseMsg{Button: tea.MouseButtonLeft, Action: tea.MouseActionPress, X: x, Y: y})
	got := mi.(model)
	if got.toast != nil {
		t.Error("Klick auf die Toast-Hit-Area sollte den Toast schließen (Vorrang vor Feld-Klick)")
	}
	if got.form != nil || got.statusPick {
		t.Error("Toast-Klick darf keinen Tree-Picker/-Editor öffnen")
	}
}

// mouse_test.go-Regression (DD2-51, muss grün bleiben): ein Klick auf einen
// Nicht-Issue-Knoten (Meilenstein) läuft nicht in den Feld-Dispatch. Meilenstein
// ist expandierbar+offen → Einzelklick toggelt NICHT (D03), setzt nur den Cursor.
func TestTreeClickOnMilestoneRowStillSetsCursor(t *testing.T) {
	m := treeMouseModel() // M1 offen (treeExpMile[1]=true)
	mi, _ := m.handleMouse(treeFieldClick(m, 0, 0)) // Content-Col 0 = Marker-Spalte der M1-Zeile
	got := mi.(model)
	if got.form != nil || got.statusPick {
		t.Error("Klick auf den Meilenstein-Knoten darf keinen Feld-Picker öffnen")
	}
	if got.treeCursor != 0 {
		t.Errorf("treeCursor=%d, want 0 (Meilenstein-Zeile, unverändertes Verhalten)", got.treeCursor)
	}
	if !got.treeExpMile[1] {
		t.Error("Einzelklick auf offenen Meilenstein darf NICHT zuklappen (D03)")
	}
}
