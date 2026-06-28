package tui

import (
	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	// Aktives huh-Create-Formular (T16) fängt alle Messages, bis abgeschlossen/abgebrochen.
	if m.form != nil {
		if sz, ok := msg.(tea.WindowSizeMsg); ok {
			m.width, m.height = sz.Width, sz.Height
		}
		return m.updateForm(msg)
	}
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m, nil
	case createdMsg:
		m.status = noticeText("Angelegt: " + msg.label)
		m.statusSeq++ // DD2-35: Auto-Clear-Toast — Tick mit dieser Generation
		clear := statusTimeout(m.statusSeq)
		switch msg.kind {
		case "milestone", "sprint":
			return m, tea.Batch(loadMilestones(m.client), clear) // Columns neu (neue Spalten-Items)
		case "issue":
			if m.view == viewBacklog {
				return m, tea.Batch(loadBacklog(m.client), clear)
			}
		case "memory":
			if m.view == viewMemory {
				return m, tea.Batch(loadMemories(m.client, m.memCat), clear)
			}
		}
		return m, clear
	case clearStatusMsg: // DD2-35: transienten Status nach Timeout löschen (Toast)
		if msg.seq == m.statusSeq && !m.inputting {
			m.status = ""
		}
		return m, nil
	case errMsg:
		m.err = msg.err
		return m, nil
	case statusMsg:
		m.status = msg.text
		m.statusSeq++
		return m, statusTimeout(m.statusSeq) // DD2-35: Auto-Clear
	case noticeMsg:
		m.status = noticeText(msg.text) // Sapphire-Hinweis (Aktions-Fehler/Info)
		m.statusSeq++
		return m, statusTimeout(m.statusSeq) // DD2-35: Auto-Clear
	case userStoriesMsg:
		if msg.issueID == m.usIssueID {
			m.usList = msg.items
			m.uslist.setLen(len(m.usList))
		}
		return m, nil
	case projectsMsg:
		m.projects = msg.items
		m.plist.setLen(len(m.projects))
		return m, nil
	case milestonesMsg:
		m.milestones = msg.items
		m.mlist.setLen(len(m.visMilestonesRaw()))
		return m, m.syncSprint()
	case sprintMsg:
		m.curSprint = msg.sprint
		if msg.sprint != nil { // DD2-57: Tree-Lazy-Cache mitfüllen (egal von wo geladen)
			if m.treeIssues == nil {
				m.treeIssues = map[int][]api.Issue{}
			}
			m.treeIssues[msg.sprint.ID] = msg.sprint.Items
			m.status = ""
		}
		if s := m.selSprint(); s != nil && m.curSprint != nil && s.ID == m.curSprint.ID {
			m.ilist.setLen(len(m.visIssues()))
		}
		if m.view == viewReview && m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
			m.status = ""
		}
		return m, nil
	case backlogMsg:
		m.backlog = msg.items
		m.blist.setLen(len(m.backlog))
		return m, nil
	case issueUpdatedMsg: // DD2-77: Feld-Edit-Response → Cache in-place mergen (D05)
		if msg.err != "" {
			m.errNote = msg.err // Aktions-Fehler rot (D05)
			return m, nil
		}
		if msg.issue != nil {
			m.errNote = ""
			m.mergeIssueIntoCache(msg.issue)
			m.status = noticeText("Gespeichert: " + msg.issue.Key)
		}
		return m, nil
	case allIssuesMsg: // DD2-62: projektweite Issues für den Tree-Filter
		m.treeFilterIssues = msg.items
		m.treeIssuesLoaded = true
		m.treeCursor = 0
		return m, nil
	case reviewSprintsMsg:
		m.reviewSprints = msg.items
		m.rvlist.setLen(len(m.reviewSprints))
		return m, nil
	case memoriesMsg:
		m.memList = msg.items
		m.memlist.setLen(len(m.memList))
		return m, m.syncMemDetail()
	case memDetailMsg:
		if msg.mem != nil {
			m.memDetail = msg.mem
			m.memDetailID = msg.mem.ID
		}
		return m, nil
	case unassignedSprintsMsg:
		m.maSprints = msg.items
		m.maMenu.setLen(len(m.maSprints))
		return m, nil
	case deletePreviewMsg:
		if m.delConfirm && msg.id == m.delID && msg.kind == m.delKind {
			m.delLoading = false
			m.delSprints, m.delIssues, m.delDocs = msg.sprints, msg.issues, msg.docs
			if msg.name != "" {
				m.delName = msg.name
			}
		}
		return m, nil
	case deleteDoneMsg:
		m.status = noticeText("Gelöscht: " + msg.name)
		// Columns + ggf. Cockpit/Detail-Quelle frisch; zurück auf Columns-Sicht.
		m.curSprint = nil
		if m.view == viewMilestone || m.view == viewSprint {
			m.view = viewColumns
		}
		return m, loadMilestones(m.client)
	case reworkDoneMsg:
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		m.status = noticeText("Rework fertig → Issue ist to_review, jetzt a:pass")
		return m, nil
	case reviewSubmittedMsg: // DD2-44: Review-Pass markiert (review_submitted_at)
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		m.status = noticeText("Review-Pass markiert — Sprint wartet auf PO-Abschluss (C)")
		return m, nil
	case completeDoneMsg: // DD2-45: Sprint abgeschlossen + Ergebnis-Handover geyankt
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		if msg.yanked {
			m.status = noticeText("Sprint abgeschlossen — Ergebnis-Handover in Zwischenablage")
		} else {
			m.status = noticeText("Sprint abgeschlossen (Handover-Yank fehlgeschlagen)")
		}
		return m, nil
	case tagsLoadedMsg: // DD2-75: Tag-Manager-Liste
		m.tags = msg.items
		m.taglist.setLen(len(m.tags))
		return m, nil
	case tagMutatedMsg: // DD2-75: create/update/delete → Liste neu laden
		m.status = noticeText(msg.label)
		if m.view == viewTags {
			return m, loadTags(m.client)
		}
		return m, nil
	case tagPickDataMsg: // DD2-33: Picker-Daten (alle Tags + ggf. aktuelle)
		if m.tagPick && msg.id == m.tagPickID && msg.kind == m.tagPickKind {
			m.tagPickAll = msg.all
			m.tagPickLoaded = true
			if msg.hasCurrent {
				m.tagPickChecked = map[int]bool{}
				for _, t := range msg.current {
					m.tagPickChecked[t.ID] = true
				}
			}
			m.tagPickMenu.setLen(len(m.tagPickAll))
		}
		return m, nil
	case tagAssignedMsg: // DD2-33: Replace bestätigt → lokalen State patchen
		m.tagPick = false
		if msg.kind == "issue" {
			m.patchIssueTags(msg.id, msg.tags)
		}
		m.status = noticeText("Tags gesetzt — " + msg.label)
		return m, nil
	case tea.MouseMsg:
		return m.handleMouse(msg)
	case tea.KeyMsg:
		return m.handleKey(msg)
	}
	return m, nil
}

// handleMouse bindet die Maus an (DD2-51): Wheel scrollt (Tree-Cursor bzw.
// m.scroll der Chrome-Detail-Views), Linksklick setzt Fokus/Cursor. Golden Rule
// #3: Tree ist vertikal → msg.Y; Ranger-Columns sind horizontal → msg.X.
func (m model) handleMouse(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	// Modale/Picks sind tastaturgesteuert — Maus ignorieren (kein Fehlklick-Fokus).
	if m.form != nil || m.paletteOpen || m.filtering || m.statusPick || m.sprintPick ||
		m.msPick || m.smPick || m.maPick || m.tagPick || m.delConfirm || m.mcConfirm || m.usOpen ||
		m.treeSearching || m.inputting {
		return m, nil
	}
	switch msg.Button {
	case tea.MouseButtonWheelUp:
		if m.view == viewTree {
			if m.treeCursor > 0 {
				m.treeCursor--
			}
		} else {
			m.scroll -= 3
			if m.scroll < 0 {
				m.scroll = 0
			}
		}
		return m, nil
	case tea.MouseButtonWheelDown:
		if m.view == viewTree {
			if n := len(m.treeNodes()); m.treeCursor < n-1 {
				m.treeCursor++
			}
		} else {
			m.scroll += 3 // scrollView klemmt das Maximum
		}
		return m, nil
	case tea.MouseButtonLeft:
		if msg.Action != tea.MouseActionPress {
			return m, nil
		}
		switch m.view {
		case viewTree:
			return m.mouseTreeClick(msg)
		case viewColumns:
			return m.mouseColumnFocus(msg)
		}
	}
	return m, nil
}

// mouseTreeClick setzt den Tree-Cursor auf die geklickte Zeile (DD2-51, optionale
// Stufe). Klick-Y → Zeilenindex über dieselbe Geometrie wie der Render (treeLayout
// + windowStart), darum drift-frei. Nur Klicks in der linken Spalte zählen.
func (m model) mouseTreeClick(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	head, _, lw, _, innerH := m.treeLayout()
	if msg.X >= lw {
		return m, nil // rechte Detail-Spalte — kein Cursor-Ziel
	}
	// Erste Baumzeile = Header-Höhe + 1 (obere Box-Border) + 1 (Such-Kopfzeile).
	firstRowY := lipgloss.Height(head) + 1 + 1
	rel := msg.Y - firstRowY
	if rel < 0 {
		return m, nil
	}
	nodes := m.treeNodes()
	start := windowStart(len(nodes), innerH-1, m.treeCursor) // innerH-1: Such-Kopfzeile
	if idx := start + rel; idx >= 0 && idx < len(nodes) {
		m.treeCursor = idx
	}
	return m, nil
}

// mouseColumnFocus setzt im Ranger-Columns-Layout den Pane-Fokus per X (DD2-51).
// Sichtbare Panes beginnen bei m.depth; die geklickte Spalte wird zur Fokus-Ebene.
func (m model) mouseColumnFocus(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	w := m.termWidth()
	n := 3 // Ranger zeigt max. 3 Spalten
	colW := (w - n*2) / n
	if colW < 1 {
		return m, nil
	}
	pane := msg.X / (colW + 2)
	if pane < 0 || pane > 2 {
		return m, nil
	}
	target := m.depth + pane
	if target > 2 {
		target = 2
	}
	if target == m.depth {
		return m, nil
	}
	m.depth = target
	return m, m.syncSprint()
}

// updateForm leitet Messages ans laufende huh-Formular weiter und feuert nach
// Abschluss den Create-Cmd (T16). Abbruch (esc) verwirft ohne Aktion.
func (m model) updateForm(msg tea.Msg) (tea.Model, tea.Cmd) {
	// esc bricht das Formular ab (huh selbst kennt nur ctrl+c) — vertraute Cancel-Taste.
	if k, ok := msg.(tea.KeyMsg); ok && k.Type == tea.KeyEsc {
		m.form = nil
		m.formKind = ""
		m.status = ""
		return m, nil
	}
	form, cmd := m.form.Update(msg)
	if f, ok := form.(*huh.Form); ok {
		m.form = f
	}
	switch m.form.State {
	case huh.StateCompleted:
		createCmd := m.formCreateCmd()
		m.form = nil
		m.formKind = ""
		return m, createCmd
	case huh.StateAborted:
		m.form = nil
		m.formKind = ""
		m.status = ""
		return m, nil
	}
	return m, cmd
}
