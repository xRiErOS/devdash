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
		// DD2-93: deutlicher Erfolgs-Toast, der den nachfolgenden Reload-Zyklus
		// (loadMilestones→sprintMsg) übersteht (statusSticky), damit die PO sicher
		// sieht, dass gespeichert wurde. Auto-Clear (2s) räumt ihn dann auf.
		m.status = noticeText("✓ " + msg.label + " created")
		m.statusSticky = true
		m.statusSeq++ // DD2-35: Auto-Clear-Toast — Tick mit dieser Generation
		clear := statusTimeout(m.statusSeq)
		switch msg.kind {
		case "milestone", "sprint":
			return m, tea.Batch(loadMilestones(m.client), clear) // Columns neu (neue Spalten-Items)
		case "issue":
			if m.view == viewBacklog {
				return m, tea.Batch(loadBacklog(m.client), clear)
			}
			// DD2-72: im Tree/Columns nach Issue-Anlage die Spalten/Counts auffrischen,
			// sonst hängt die Ansicht auf veralteten Fortschrittszahlen.
			return m, tea.Batch(loadMilestones(m.client), clear)
		case "memory":
			if m.view == viewMemory {
				return m, tea.Batch(loadMemories(m.client, m.memCat), clear)
			}
		}
		return m, clear
	case clearStatusMsg: // DD2-35: transienten Status nach Timeout löschen (Toast)
		if msg.seq == m.statusSeq && !m.inputting {
			m.status = ""
			m.statusSticky = false // DD2-93: Sticky-Schutz endet mit dem Auto-Clear
		}
		return m, nil
	case errMsg:
		m.err = msg.err
		return m, nil
	case statusMsg:
		m.status = msg.text
		m.statusSticky = false // DD2-93: neuer regulärer Status hebt den Sticky-Schutz auf
		m.statusSeq++
		return m, statusTimeout(m.statusSeq) // DD2-35: Auto-Clear
	case noticeMsg:
		m.status = noticeText(msg.text) // Sapphire-Hinweis (Aktions-Fehler/Info)
		m.statusSticky = false // DD2-93: neuer regulärer Status hebt den Sticky-Schutz auf
		m.statusSeq++
		return m, statusTimeout(m.statusSeq) // DD2-35: Auto-Clear
	case userStoriesMsg:
		m.mergeUserStories(msg.issueID, msg.items)
		return m, nil
	case usMutatedMsg: // DD2-144: US angelegt/bearbeitet → Caches spiegeln + Toast
		m.mergeUserStories(msg.issueID, msg.items)
		m.status = noticeText(msg.status)
		m.statusSticky = false
		m.statusSeq++
		return m, statusTimeout(m.statusSeq)
	case projectsMsg:
		m.projects = msg.items
		m.plist.setLen(len(m.projects))
		return m, nil
	case milestonesMsg:
		m.milestones = msg.items
		m.mlist.setLen(len(m.visMilestonesRaw()))
		return m, m.syncSprint()
	case refreshedMsg: // DD2-72 R2: atomarer manueller Daten-Reload (Toast bleibt stehen)
		m.milestones = msg.milestones
		m.mlist.setLen(len(m.visMilestonesRaw()))
		if m.treeIssues == nil {
			m.treeIssues = map[int][]api.Issue{}
		}
		for sid, s := range msg.sprints {
			m.treeIssues[sid] = s.Items
			if m.curSprint != nil && m.curSprint.ID == sid {
				m.curSprint = s
			}
		}
		m.ilist.setLen(len(m.visIssues()))
		m.status = noticeText("Data reloaded")
		m.statusSticky = false
		m.statusSeq++
		return m, statusTimeout(m.statusSeq)
	case sprintMsg:
		m.curSprint = msg.sprint
		if msg.sprint != nil { // DD2-57: Tree-Lazy-Cache mitfüllen (egal von wo geladen)
			if m.treeIssues == nil {
				m.treeIssues = map[int][]api.Issue{}
			}
			m.treeIssues[msg.sprint.ID] = msg.sprint.Items
			if !m.statusSticky { // DD2-93: Erfolgs-Toast nicht durch Reload clobbern
				m.status = ""
			}
		}
		if s := m.selSprint(); s != nil && m.curSprint != nil && s.ID == m.curSprint.ID {
			m.ilist.setLen(len(m.visIssues()))
		}
		if m.view == viewReview && m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
			if !m.statusSticky { // DD2-93: Erfolgs-Toast nicht durch Reload clobbern
				m.status = ""
			}
		}
		return m, nil
	case backlogMsg:
		m.backlog = msg.items
		m.blist.setLen(len(m.backlog))
		return m, nil
	case depsMsg: // DD2-89: Milestone-/Sprint-Abhängigkeiten in den Lazy-Cache
		if m.depsCache == nil {
			m.depsCache = map[string]*api.Dependencies{}
		}
		m.depsCache[msg.key] = msg.deps
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
	case milestoneUpdatedMsg: // DD2-79: Meilenstein-Feld-Edit → Cache in-place mergen (D05)
		if msg.err != "" {
			m.errNote = msg.err
			return m, nil
		}
		if msg.ms != nil {
			m.errNote = ""
			m.mergeMilestoneIntoCache(msg.ms)
			m.status = noticeText("Gespeichert: " + msg.ms.Name)
		}
		return m, nil
	case sprintUpdatedMsg: // DD2-79: Sprint-Feld-Edit → Cache in-place mergen (D05)
		if msg.err != "" {
			m.errNote = msg.err
			return m, nil
		}
		if msg.sp != nil {
			m.errNote = ""
			m.mergeSprintIntoCache(msg.sp)
			m.status = noticeText("Gespeichert: " + msg.sp.Name)
		}
		return m, nil
	case assignSprintsMsg: // DD2-136: Ziel-Sprints für den Issue→Sprint-Picker
		m.asSprints = msg.items
		m.asMenu.setLen(len(m.asSprints))
		return m, nil
	case issueAssignedMsg: // DD2-136: Issue zugewiesen → verlässt das Backlog
		if msg.err != "" {
			m.errNote = msg.err
			return m, nil
		}
		m.errNote = ""
		m.removeIssueFromCaches(msg.issueID)
		m.detailFocus = false
		m.blist.setLen(len(m.backlogVisible()))
		m.status = noticeText("Zugewiesen → " + msg.sprintKey)
		return m, loadMilestones(m.client) // Sprint-Counts auffrischen
	case allIssuesMsg: // DD2-62: projektweite Issues für den Tree-Filter
		m.treeFilterIssues = msg.items
		m.treeIssuesLoaded = true
		m.treeCursor = 0
		if m.treeFilterOpen { // DD2-116 Rework: Filter war beim ERSTEN f offen, bevor die Issues (inkl. Tags) da waren → Facetten (Tags!) jetzt nachbauen statt erst beim Reopen
			m.ffItems = m.buildFilterItems()
			m.ffMenu.setLen(len(m.ffItems))
		}
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
		m.status = noticeText("Deleted: " + msg.name)
		if msg.kind == "issue" { // DD2-65: in-place aus den Caches, kein View-Wechsel
			m.removeIssueFromCaches(msg.id)
			m.detailFocus = false // Detail-Fokus zeigte auf das gelöschte Issue
			m.blist.setLen(len(m.backlogVisible()))
			return m, loadMilestones(m.client) // Fortschritts-Counts auffrischen
		}
		// Columns + ggf. Cockpit/Detail-Quelle frisch; zurück auf Columns-Sicht.
		m.curSprint = nil
		if m.view == viewMilestone || m.view == viewSprint {
			m.view = viewTree // DD2-111: Ranger gesunset → Tree-Primat
		}
		return m, loadMilestones(m.client)
	case reworkDoneMsg:
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		m.status = noticeText("Rework done → issue is to_review, now a:pass")
		return m, nil
	case reviewSubmittedMsg: // DD2-44: Review-Pass markiert (review_submitted_at)
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		m.status = noticeText("Review pass marked — sprint waiting for PO completion (C)")
		return m, nil
	case completeDoneMsg: // DD2-45: Sprint abgeschlossen + Ergebnis-Handover geyankt
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		if msg.yanked {
			m.status = noticeText("Sprint completed — result handover in clipboard")
		} else {
			m.status = noticeText("Sprint completed (handover yank failed)")
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
	if m.form != nil || m.paletteOpen || m.projPick || m.filtering || m.statusPick || m.sprintPick ||
		m.msPick || m.smPick || m.maPick || m.tagPick || m.delConfirm || m.mcConfirm || m.createConfirm || m.usOpen ||
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
// Abschluss den Create-Cmd. Abbruch (esc) verwirft ohne Aktion.
func (m model) updateForm(msg tea.Msg) (tea.Model, tea.Cmd) {
	if k, ok := msg.(tea.KeyMsg); ok {
		// esc bricht das Formular ab.
		if k.Type == tea.KeyEsc {
			m.form = nil
			m.formKind = ""
			m.formGroupIdx = 0
			m.formGroupTitles = nil
			m.formPartials = nil
			m.status = ""
			return m, nil
		}
		// alt+enter = speichern (terminal-taugliche Save-Taste, ersetzt ctrl+enter).
		// Wird VOR huh abgefangen, damit es nicht als Newline im Textarea landet.
		// DD2-93: submitForm öffnet für Create-Kinds erst den y/n-Confirm.
		if k.String() == "alt+enter" {
			return m.submitForm()
		}
	}

	form, cmd := m.form.Update(msg)
	if f, ok := form.(*huh.Form); ok {
		m.form = f
	}
	switch m.form.State {
	case huh.StateCompleted:
		return m.submitForm() // DD2-93: Create-Kinds → y/n-Confirm vor der Anlage
	case huh.StateAborted:
		m.form = nil
		m.formKind = ""
		m.formGroupIdx = 0
		m.formGroupTitles = nil
		m.formPartials = nil
		m.status = ""
		return m, nil
	}
	return m, cmd
}
