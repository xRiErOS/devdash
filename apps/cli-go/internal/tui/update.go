package tui

import (
	"strings"

	"devd-cli/internal/api"
	keybind "github.com/charmbracelet/bubbles/key"
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
			if m.view == viewBrowseBacklog {
				return m, tea.Batch(loadBacklog(m.client), clear)
			}
			// DD2-153: im Review die Ursprungs-Sprint-Review gezielt neu laden. Sonst
			// reloadt loadMilestones→syncSprint() den columns-SELEKTIERTEN (default
			// ersten) Sprint und clobbert m.curSprint → Redirect auf das erste Review
			// der Liste statt das, von dem die PO startete.
			if m.view == viewReviewSprint && m.curSprint != nil {
				return m, tea.Batch(loadSprint(m.client, m.curSprint.ID), clear)
			}
			// DD2-72: im Tree/Columns nach Issue-Anlage die Spalten/Counts auffrischen,
			// sonst hängt die Ansicht auf veralteten Fortschrittszahlen.
			return m, tea.Batch(loadMilestones(m.client), clear)
		case "memory":
			if m.view == viewManageMemory {
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
		m.statusSticky = false          // DD2-93: neuer regulärer Status hebt den Sticky-Schutz auf
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
		if m.view == viewReviewSprint && m.curSprint != nil {
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
	case ownerDocsMsg: // DD2-163 Rework: Inline-Doc-Liste eines Owners in den Lazy-Cache
		if m.ownerDocs == nil {
			m.ownerDocs = map[string][]api.Document{}
		}
		m.ownerDocs[msg.key] = msg.docs
		return m, nil
	case subtasksMsg: // DD2-197: Unteraufgaben eines Issues in den Lazy-Cache
		if m.subtasks == nil {
			m.subtasks = map[int][]api.Subtask{}
		}
		m.subtasks[msg.issueID] = msg.subtasks
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
	case projectUpdatedMsg: // DD2-221: Projekt-Settings gespeichert → m.project spiegeln + Toast
		if msg.err != "" {
			m.errNote = msg.err
			return m, nil
		}
		if msg.project != nil {
			m.errNote = ""
			m.project = msg.project
			m.status = noticeText("Project saved: " + msg.project.Name)
			m.statusSticky = false
			m.statusSeq++
			return m, statusTimeout(m.statusSeq)
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
	case reviewDetailMsg: // DD2-230: Inline-Tabellen-Daten der Reviews-Liste in den Lazy-Cache
		if m.reviewDetail == nil {
			m.reviewDetail = map[int]*api.Sprint{}
		}
		m.reviewDetail[msg.id] = msg.sprint
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
	case userNotesMsg: // DD2-168: Notiz-Liste geladen/neu gespeichert
		m.unList = msg.items
		m.unlist.setLen(len(m.unList))
		if msg.notice != "" {
			m.status = noticeText(msg.notice)
			m.statusSticky = false
			m.statusSeq++
			return m, statusTimeout(m.statusSeq)
		}
		return m, nil
	case todosMsg: // DD2-171: ToDo-Liste geladen/neu gespeichert
		m.todoAll = msg.items
		m.todolist.setLen(len(m.filteredTodos()))
		if msg.notice != "" {
			m.status = noticeText(msg.notice)
			m.statusSticky = false
			m.statusSeq++
			return m, statusTimeout(m.statusSeq)
		}
		return m, nil
	case docsMsg: // DD2-167: Dokument-Liste geladen/neu gespeichert
		m.docList = msg.items
		m.doclist.setLen(len(m.filteredDocs()))
		if msg.notice != "" {
			m.status = noticeText(msg.notice)
			m.statusSticky = false
			m.statusSeq++
			return m, statusTimeout(m.statusSeq)
		}
		return m, nil
	case editorFinishedMsg: // DD2-164/166ff: neovim-Suspend zurück → view-aware speichern
		if msg.err != nil {
			m.status = noticeText("editor: " + msg.err.Error())
			m.statusSticky = false
			m.statusSeq++
			return m, statusTimeout(m.statusSeq)
		}
		if !msg.changed {
			m.status = noticeText("no changes")
			m.statusSticky = false
			m.statusSeq++
			return m, statusTimeout(m.statusSeq)
		}
		switch m.view {
		case viewUserNotes:
			title := firstLineTitle(msg.content)
			return m, saveUserNoteCmd(m.client, m.unEditID, title, msg.content, strings.TrimSpace(m.unQuery))
		case viewToDos:
			label := firstLineTitle(msg.content)
			return m, saveTodoCmd(m.client, m.todoEditID, label, msg.content, m.todoStatus)
		case viewDocs:
			title := firstLineTitle(msg.content)
			return m, saveDocCmd(m.client, m.docOwnerType, m.docOwnerID, m.docEditID, title, msg.content, m.docAllMode)
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
		if m.view == viewDetailMilestone || m.view == viewDetailSprint {
			m.view = viewBrowseProject // DD2-111: Ranger gesunset → Tree-Primat
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
			m.status = noticeText("Sprint completed — handover in clipboard")
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
		if m.view == viewManageTags {
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
	case docMovedMsg: // DD2-243: Dokument-Zuweisung — Liste neu laden (alter Owner verliert das Doc)
		if msg.err != "" {
			m.status = noticeText(msg.err)
			return m, nil
		}
		m.status = noticeText("Document moved")
		if m.docAllMode {
			return m, loadAllDocs(m.client)
		}
		return m, loadDocs(m.client, m.docOwnerType, m.docOwnerID)
	case docRenamedMsg: // DD2-252: Dateiname umbenannt — Liste neu laden (zeigt neuen file_path)
		if msg.err != "" {
			m.status = noticeText(msg.err)
			return m, nil
		}
		m.status = noticeText("File renamed")
		if m.docAllMode {
			return m, loadAllDocs(m.client)
		}
		return m, loadDocs(m.client, m.docOwnerType, m.docOwnerID)
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
		m.treeSearching || m.inputting || m.docAsPick {
		return m, nil
	}
	switch msg.Button {
	case tea.MouseButtonWheelUp:
		if m.view == viewBrowseProject {
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
		if m.view == viewBrowseProject {
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
		case viewBrowseProject:
			return m.mouseTreeClick(msg)
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
	// DD2-193: Tree-Zeilen sind block-variabel (Issue = Key + umgebrochener Titel).
	// Klick-Y → Block-Index über dieselbe Geometrie wie der Render (blockWindow +
	// kumulierte Blockhöhen), darum drift-frei. lw-2 = Pane-Innenbreite (wie Render).
	nodes := m.treeNodes()
	blocks := m.treeLeftBlocks(nodes, lw-2, !m.detailFocus)
	if len(blocks) == 0 {
		return m, nil
	}
	lo, hi := blockWindow(blocks, innerH-1, m.treeCursor) // innerH-1: Such-Kopfzeile
	acc := 0
	for i := lo; i <= hi; i++ {
		h := len(blocks[i])
		if rel < acc+h {
			m.treeCursor = i
			break
		}
		acc += h
	}
	return m, nil
}

// updateForm leitet Messages ans laufende huh-Formular weiter und feuert nach
// Abschluss den Create-Cmd. Abbruch (esc) verwirft ohne Aktion.
func (m model) updateForm(msg tea.Msg) (tea.Model, tea.Cmd) {
	// DD2-224: Editor-Suspend kehrte zurück, WÄHREND die editField-Form offen ist.
	// Solange m.form != nil routet Update() alle Msgs hierher — der View-aware
	// editorFinishedMsg-Handler in Update() greift nur bei geschlossener Form. Den
	// neuen Inhalt als Preset in die Form zurückspielen: die PO arbeitet direkt
	// weiter und speichert regulär per enter/alt+enter.
	if ef, ok := msg.(editorFinishedMsg); ok && m.formKind == "editField" {
		if ef.err != nil {
			m.status = noticeText("editor: " + ef.err.Error())
			return m, nil
		}
		if ef.changed {
			f := detailField{key: m.editField, label: m.editLabel, editor: m.editEditor}
			m.editValue = ef.content
			m.form = m.styleForm(buildEditFieldForm(f, ef.content))
			return m, m.form.Init()
		}
		return m, nil // keine Änderung → Form unangetastet weiter
	}
	// DD2-233/234: Editor-Rückkehr ins offene Create-Issue-Form. huh's eingebauter
	// Editor ist hier bewusst NICHT im Spiel (ExternalEditor(false) auf den Text-
	// Feldern): er liefe über $EDITOR statt des konfigurierten Editors (DD2-233) und
	// broadcastet sein Ergebnis an ALLE Text-Felder der Gruppe (huh group.go Range)
	// → po_notes-Inhalt blutet in user_stories (DD2-234). Stattdessen gezielt: nur
	// po_notes im Draft überschreiben, übrige Felder erhalten, Form neu bauen.
	if ef, ok := msg.(editorFinishedMsg); ok && m.formKind == "issue" {
		if ef.err != nil {
			m.status = noticeText("editor: " + ef.err.Error())
			return m, nil
		}
		if ef.changed {
			d := m.currentIssueDraft()
			d.poNotes = ef.content
			m.form = m.styleForm(buildIssueForm(m.tags, d))
			return m, m.form.Init()
		}
		return m, nil
	}
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
		// DD2-187: alt+enter NICHT direkt submitForm() rufen. Das umging huh's
		// Field-Commit — f.results füllt sich erst bei nextFieldMsg/StateCompleted,
		// also las GetString den frisch getippten Feldinhalt als "" und ein leeres
		// Save löschte das Feld (Backlog-po_notes / Create-Form). Stattdessen wie
		// enter an huh weiterreichen: huh committet das aktive Feld + vervollständigt
		// regulär → StateCompleted unten → submitForm() mit korrekten Werten (DD2-93
		// y/n-Confirm bleibt). Behebt zugleich den alt+enter-umgeht-Validation-Caveat.
		if k.String() == "alt+enter" {
			enter := tea.KeyMsg{Type: tea.KeyEnter}
			msg, k = enter, enter
		}
		// DD2-224: ctrl+e öffnet das aktive Langtext-editField (po_notes & Co.) im
		// $EDITOR. Der aktuelle (in der Form ggf. schon angetippte) Wert geht rein;
		// die Rückkehr (editorFinishedMsg, oben) spielt das Ergebnis als Preset zurück.
		// VOR huh abgefangen, sonst landete ctrl+e als Steuerzeichen im Textarea.
		if keybind.Matches(k, keys.Editor) && m.editFieldUsesEditor() {
			return m, editInEditor(m.form.GetString("value"), ".md")
		}
		// DD2-233/234: ctrl+e im Create-Issue-Form öffnet po_notes im konfigurierten
		// Editor (editInEditor → configuredEditor). Reseed gezielt oben (nur po_notes).
		if keybind.Matches(k, keys.Editor) && m.formKind == "issue" {
			return m, editInEditor(m.form.GetString("po_notes"), ".md")
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
