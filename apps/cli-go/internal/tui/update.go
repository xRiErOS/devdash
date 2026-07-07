package tui

import (
	"strconv"
	"strings"
	"time"

	"devd-cli/internal/api"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

// doubleClickInterval ist das Zeitfenster, in dem zwei Klicks auf denselben Tree-
// Knoten als Doppelklick gelten (DD2-274 D03: Collapse). bubbletea v1.3.10 liefert
// keinen Click-Count → selbst erkannt über m.now() + m.lastClickAt/lastClickIdx.
const doubleClickInterval = 500 * time.Millisecond

// now liefert die aktuelle Zeit über die (test-injizierbare) Clock; nil → time.Now.
func (m model) now() time.Time {
	if m.clock != nil {
		return m.clock()
	}
	return time.Now()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	// Aktives huh-Create-Formular (T16) fängt alle Messages, bis abgeschlossen/abgebrochen.
	if m.form != nil {
		// DD2-272/273 Cross-Feature-Fix (Integrations-Review nach 651b9fd, B01/B02):
		// der Eck-Toast (nicht-modal) UND das Release-Notes-Init-Signal sind
		// orthogonal zum Formular-State — sie dürfen NICHT im Form-Shortcut
		// verschwinden, sonst schluckt ein offenes Formular den Toast-Klick
		// (handleMouse würde toastHit sonst nie erreichen) und den einmaligen
		// Auto-Dismiss-Tick (toastExpiredMsg bleibt für immer unbeantwortet →
		// Toast hängt über die dokumentierte Dauer hinaus) bzw. den
		// Versions-Wechsel-Hinweis (versionChangedMsg, DD2-273: "What's new"
		// würde in dieser Session gar nicht mehr aufgehen). huh/bubbles v1.0.0
		// verarbeiten tea.MouseMsg ohnehin nicht (keine Funktionalität verloren,
		// wenn Mausklicks bei offenem Formular hier statt in m.form.Update landen).
		switch msg := msg.(type) {
		case tea.MouseMsg:
			return m.handleMouse(msg)
		case toastExpiredMsg:
			return m.handleToastExpired(msg)
		case versionChangedMsg:
			return m.handleVersionChanged(msg)
		}
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
		// DD2-93/272: deutlicher Erfolgs-Toast, sticky (Klick oder Replace räumt ihn),
		// damit die PO sicher sieht, dass gespeichert wurde. Übersteht den nach-
		// folgenden Reload-Zyklus (loadMilestones→sprintMsg, Sticky-Schutz).
		m, _ = m.showToast(toastInfo, "✓ "+msg.label+" created", "", nil, true)
		switch msg.kind {
		case "milestone", "sprint":
			return m, loadMilestones(m.client) // Columns neu (neue Spalten-Items)
		case "issue":
			if m.view == viewBrowseBacklog {
				return m, loadBacklog(m.client)
			}
			// DD2-153: im Review die Ursprungs-Sprint-Review gezielt neu laden. Sonst
			// reloadt loadMilestones→syncSprint() den columns-SELEKTIERTEN (default
			// ersten) Sprint und clobbert m.curSprint → Redirect auf das erste Review
			// der Liste statt das, von dem die PO startete.
			if m.view == viewReviewSprint && m.curSprint != nil {
				return m, loadSprint(m.client, m.curSprint.ID)
			}
			// DD2-72: im Tree/Columns nach Issue-Anlage die Spalten/Counts auffrischen,
			// sonst hängt die Ansicht auf veralteten Fortschrittszahlen.
			return m, loadMilestones(m.client)
		case "memory":
			if m.view == viewManageMemory {
				return m, loadMemories(m.client, m.memCat)
			}
		}
		return m, nil
	case versionChangedMsg: // DD2-273: Init()-Cmd erkannte Versionswechsel → Overlay öffnen
		return m.handleVersionChanged(msg)
	case toastExpiredMsg: // DD2-272: Eck-Toast nach Timeout löschen (vormals clearStatusMsg)
		return m.handleToastExpired(msg)
	case errMsg:
		m.err = msg.err
		return m, nil
	case noticeMsg:
		return m.showToast(msg.kind, msg.text, "", msg.target, false)
	case userStoriesMsg:
		m.mergeUserStories(msg.issueID, msg.items)
		return m, nil
	case usMutatedMsg: // DD2-144: US angelegt/bearbeitet → Caches spiegeln + Toast
		m.mergeUserStories(msg.issueID, msg.items)
		return m.showToast(toastInfo, msg.status, "", nil, false)
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
		return m.showToast(toastInfo, "Data reloaded", "", nil, false)
	case sprintMsg:
		m.curSprint = msg.sprint
		if msg.sprint != nil { // DD2-57: Tree-Lazy-Cache mitfüllen (egal von wo geladen)
			if m.treeIssues == nil {
				m.treeIssues = map[int][]api.Issue{}
			}
			m.treeIssues[msg.sprint.ID] = msg.sprint.Items
			m = m.clearToastUnlessSticky() // DD2-93/272: Erfolgs-Toast nicht durch Reload clobbern
		}
		if s := m.selSprint(); s != nil && m.curSprint != nil && s.ID == m.curSprint.ID {
			m.ilist.setLen(len(m.visIssues()))
		}
		if m.view == viewReviewSprint && m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
			m = m.clearToastUnlessSticky() // DD2-93/272: Erfolgs-Toast nicht durch Reload clobbern
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
	case dodItemsMsg: // DD2-270: DoD-Items eines Meilensteins in den Lazy-Cache
		if m.dodCache == nil {
			m.dodCache = map[int][]api.DodItem{}
		}
		m.dodCache[msg.milestoneID] = msg.items
		return m, nil
	case dodMutatedMsg: // DD2-270: DoD-Item angelegt/bearbeitet → Cache spiegeln + Toast
		if m.dodCache == nil {
			m.dodCache = map[int][]api.DodItem{}
		}
		m.dodCache[msg.milestoneID] = msg.items
		return m.showToast(toastInfo, msg.status, "", nil, false)
	case issueUpdatedMsg: // DD2-77: Feld-Edit-Response → Cache in-place mergen (D05)
		if msg.err != "" {
			m.errNote = msg.err // Aktions-Fehler rot (D05)
			return m, nil
		}
		if msg.issue != nil {
			m.errNote = ""
			m.mergeIssueIntoCache(msg.issue)
			return m.showToast(toastInfo, "Gespeichert: "+msg.issue.Key, "", nil, false)
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
			return m.showToast(toastInfo, "Gespeichert: "+msg.ms.Name, "", nil, false)
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
			return m.showToast(toastInfo, "Gespeichert: "+msg.sp.Name, "", nil, false)
		}
		return m, nil
	case defaultProjectSetMsg: // Default-Anker im Backend gesetzt (TUI-Settings)
		if msg.err != "" {
			m.errNote = msg.err
			return m, nil
		}
		m.errNote = ""
		return m.showToast(toastInfo, msg.label, "", nil, false)
	case projectCreatedMsg: // neues Projekt angelegt → Projektliste neu laden + Toast
		if msg.err != "" {
			m.errNote = msg.err
			return m, nil
		}
		m.errNote = ""
		name := ""
		if msg.project != nil {
			name = msg.project.Name
		}
		m, toastCmd := m.showToast(toastInfo, "Project created: "+name, "", nil, false)
		return m, tea.Batch(loadProjects(m.global), toastCmd)
	case projectUpdatedMsg: // DD2-221: Projekt-Settings gespeichert → m.project spiegeln + Toast
		if msg.err != "" {
			m.errNote = msg.err
			return m, nil
		}
		if msg.project != nil {
			m.errNote = ""
			m.project = msg.project
			return m.showToast(toastInfo, "Project saved: "+msg.project.Name, "", nil, false)
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
		m, toastCmd := m.showToast(toastInfo, "Zugewiesen → "+msg.sprintKey, "", nil, false)
		return m, tea.Batch(loadMilestones(m.client), toastCmd) // Sprint-Counts auffrischen
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
			return m.showToast(toastInfo, msg.notice, "", nil, false)
		}
		return m, nil
	case todosMsg: // DD2-171: ToDo-Liste geladen/neu gespeichert
		m.todoAll = msg.items
		m.todolist.setLen(len(m.filteredTodos()))
		if msg.notice != "" {
			return m.showToast(toastInfo, msg.notice, "", nil, false)
		}
		return m, nil
	case docsMsg: // DD2-167: Dokument-Liste geladen/neu gespeichert
		m.docList = msg.items
		m.doclist.setLen(len(m.filteredDocs()))
		if msg.notice != "" {
			return m.showToast(toastInfo, msg.notice, "", nil, false)
		}
		return m, nil
	case editorFinishedMsg: // DD2-164/166ff: neovim-Suspend zurück → view-aware speichern
		if msg.err != nil {
			return m.showToast(toastError, "editor: "+msg.err.Error(), "", nil, false)
		}
		if !msg.changed {
			return m.showToast(toastInfo, "no changes", "", nil, false)
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
		m, toastCmd := m.showToast(toastInfo, "Deleted: "+msg.name, "", nil, false)
		if msg.kind == "project" { // Projekt weg → aktives Projekt verwerfen, zurück in die Lobby
			m.project = nil
			m.client = nil
			m.curSprint = nil
			m.milestones = nil
			m.view = viewHome
			return m, tea.Batch(loadProjects(m.global), toastCmd)
		}
		if msg.kind == "issue" { // DD2-65: in-place aus den Caches, kein View-Wechsel
			m.removeIssueFromCaches(msg.id)
			m.detailFocus = false // Detail-Fokus zeigte auf das gelöschte Issue
			m.blist.setLen(len(m.backlogVisible()))
			return m, tea.Batch(loadMilestones(m.client), toastCmd) // Fortschritts-Counts auffrischen
		}
		// Columns + ggf. Cockpit/Detail-Quelle frisch; zurück auf Columns-Sicht.
		m.curSprint = nil
		if m.view == viewDetailMilestone || m.view == viewDetailSprint {
			m.view = viewBrowseProject // DD2-111: Ranger gesunset → Tree-Primat
		}
		return m, tea.Batch(loadMilestones(m.client), toastCmd)
	case reworkDoneMsg:
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		return m.showToast(toastInfo, "Rework done → issue is to_review, now a:pass", "", nil, false)
	case reviewSubmittedMsg: // DD2-44: Review-Pass markiert (review_submitted_at)
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		return m.showToast(toastInfo, "Review pass marked — sprint waiting for PO completion (C)", "", nil, false)
	case completeDoneMsg: // DD2-45: Sprint abgeschlossen + Ergebnis-Handover geyankt
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		if msg.yanked {
			return m.showToast(toastInfo, "Sprint completed — handover in clipboard", "", nil, false)
		}
		return m.showToast(toastWarn, "Sprint completed (handover yank failed)", "", nil, false)
	case tagsLoadedMsg: // DD2-75: Tag-Manager-Liste
		m.tags = msg.items
		m.taglist.setLen(len(m.tags))
		return m, nil
	case tagMutatedMsg: // DD2-75: create/update/delete → Liste neu laden
		m, toastCmd := m.showToast(toastInfo, msg.label, "", nil, false)
		if m.view == viewManageTags {
			return m, tea.Batch(loadTags(m.client), toastCmd)
		}
		return m, toastCmd
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
		return m.showToast(toastInfo, "Tags gesetzt — "+msg.label, "", nil, false)
	case docMovedMsg: // DD2-243: Dokument-Zuweisung — Liste neu laden (alter Owner verliert das Doc)
		if msg.err != "" {
			return m.showToast(toastError, msg.err, "", nil, false)
		}
		m, toastCmd := m.showToast(toastInfo, "Document moved", "", nil, false)
		if m.docAllMode {
			return m, tea.Batch(loadAllDocs(m.client), toastCmd)
		}
		return m, tea.Batch(loadDocs(m.client, m.docOwnerType, m.docOwnerID), toastCmd)
	case docRenamedMsg: // DD2-252: Dateiname umbenannt — Liste neu laden (zeigt neuen file_path)
		if msg.err != "" {
			return m.showToast(toastError, msg.err, "", nil, false)
		}
		m, toastCmd := m.showToast(toastInfo, "File renamed", "", nil, false)
		if m.docAllMode {
			return m, tea.Batch(loadAllDocs(m.client), toastCmd)
		}
		return m, tea.Batch(loadDocs(m.client, m.docOwnerType, m.docOwnerID), toastCmd)
	case tea.MouseMsg:
		return m.handleMouse(msg)
	case tea.KeyMsg:
		return m.handleKey(msg)
	}
	return m, nil
}

// handleToastExpired löscht den Eck-Toast nach Ablauf (DD2-272), aber nur wenn
// seq noch der aktuellen Generation entspricht (sonst hat ein neuerer Toast ihn
// bereits ersetzt). Geteilt zwischen dem regulären Dispatch UND dem
// Form-Carve-out in Update() (DD2-272/273 Cross-Feature-Fix, B01) — der Toast
// ist nicht modal und muss auch bei offenem Formular ablaufen können.
func (m model) handleToastExpired(msg toastExpiredMsg) (tea.Model, tea.Cmd) {
	if m.toast != nil && msg.seq == m.toast.seq && !m.inputting {
		m.toast = nil
	}
	return m, nil
}

// handleVersionChanged öffnet das Release-Notes-Overlay ("What's new", DD2-273)
// nach einem vom Init()-Cmd erkannten Versionswechsel. Geteilt zwischen dem
// regulären Dispatch UND dem Form-Carve-out in Update() (B02) — sonst geht das
// Overlay verloren, wenn der Nutzer ein Formular öffnet, bevor der (schnelle,
// reine Disk-)Check-Cmd aufgelöst hat.
func (m model) handleVersionChanged(msg versionChangedMsg) (tea.Model, tea.Cmd) {
	m.releaseNotes = &releaseNotesState{version: msg.version, body: msg.body}
	m.scroll = 0
	return m, nil
}

// handleMouse bindet die Maus an (DD2-51): Wheel scrollt (Tree-Cursor bzw.
// m.scroll der Chrome-Detail-Views), Linksklick setzt Fokus/Cursor. Golden Rule
// #3: Tree ist vertikal → msg.Y; Ranger-Columns sind horizontal → msg.X.
func (m model) handleMouse(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	// DD2-272: der Eck-Toast ist NICHT modal (blockiert keine Tastatur), aber ein
	// Linksklick auf seine Hit-Area wird VOR dem regulären Dispatch abgefangen —
	// unabhängig davon, ob gerade ein Modal offen ist (der Toast schwebt darüber).
	if msg.Button == tea.MouseButtonLeft && msg.Action == tea.MouseActionPress && m.toastHit(msg.X, msg.Y) {
		return m.dismissToast()
	}
	// Modale/Picks sind tastaturgesteuert — Maus ignorieren (kein Fehlklick-Fokus).
	if m.form != nil || m.paletteOpen || m.projPick || m.filtering || m.statusPick || m.sprintPick ||
		m.msPick || m.smPick || m.maPick || m.tagPick || m.delConfirm || m.mcConfirm || m.createConfirm || m.usOpen ||
		m.treeSearching || m.inputting || m.docAsPick || m.releaseNotes != nil {
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
			// DD2-274: Feld-Klick (Priority/Status, linke Pane) hat Vorrang, dann der
			// Accordion-Section-Header-Klick (rechte Pane, D02); kein Treffer fällt
			// unverändert auf den Zeilen-Cursor-/Expand-Klick zurück (AC3).
			if mi, cmd, ok := m.mouseTreeFieldClick(msg); ok {
				return mi, cmd
			}
			if mi, cmd, ok := m.mouseMetaStripClick(msg); ok { // D01: Type/Prio/Status im Detail-Meta-Strip
				return mi, cmd
			}
			if mi, cmd, ok := m.mouseAccordionClick(msg); ok {
				return mi, cmd
			}
			if mi, cmd, ok := m.mouseBodyFieldClick(msg); ok { // #3: Body-Feld → editField-Form
				return mi, cmd
			}
			return m.mouseTreeClick(msg)
		case viewBrowseBacklog: // DD2-274: Klick auf Priority-/Status-Zelle → Picker/Editor
			return m.mouseBacklogClick(msg)
		}
	}
	return m, nil
}

// treeFieldHit bildet einen Mausklick auf ein Feld (Priority/Status) EINES
// bestimmten Issue-Knotens im Tree ab (DD2-274) — dieselbe Geometrie wie
// treeLeftBlocks/blockWindow (drift-frei, analog mouseTreeClick/backlogFieldHit).
// Nur die Kopfzeile eines tkIssue-Blocks trägt die Icons; umgebrochene Titelzeilen
// darunter UND Meilenstein-/Sprint-/Info-Zeilen sind kein Feld-Ziel. hit=false,
// wenn X/Y keine Ikonen-Spalte trifft — der Aufrufer fällt dann auf den
// bestehenden Zeilen-Cursor-Klick (mouseTreeClick) zurück.
func (m model) treeFieldHit(msg tea.MouseMsg) (it *api.Issue, sprintID int, field fieldKind, hit bool) {
	head, _, lw, _, innerH := m.treeLayout()
	relX := msg.X - m.leftContentX() // Screen-X → Pane-Content-Spalte (DD2-274 X-Fix)
	if relX < 0 || relX >= lw {
		return nil, 0, 0, false // außerhalb der linken Pane-Inhaltsspalten
	}
	nodes := m.treeNodes()
	if len(nodes) == 0 {
		return nil, 0, 0, false
	}
	blocks := m.treeLeftBlocks(nodes, lw-2, !m.detailFocus)
	firstRowY := m.paneOriginY(head) + 1 // Such-Kopfzeile (analog treeClickIdx, DD2-274-Fix)
	rel := msg.Y - firstRowY
	if rel < 0 {
		return nil, 0, 0, false
	}
	lo, hi := blockWindow(blocks, innerH-1, m.treeCursor)
	acc := 0
	for i := lo; i <= hi; i++ {
		h := len(blocks[i])
		if rel < acc+h {
			if rel != acc {
				return nil, 0, 0, false // nicht die Kopfzeile des Blocks
			}
			n := nodes[i]
			if n.kind != tkIssue || n.issue == nil {
				return nil, 0, 0, false // Meilenstein/Sprint/Info tragen keine Icons
			}
			statusStart, _, prioStart, prioEnd := treeIssueRowCols(n)
			// D05: lückenlose Hit-Zonen — der 1-Zeichen-Status-Dot + Trennraum ist
			// zu schmal für reale Mausbedienung. Status frisst die Lücke bis Priority,
			// Priority den nachfolgenden Trennraum vor dem Key (memory dd2-274 B01).
			switch {
			case relX >= statusStart && relX < prioStart:
				return n.issue, n.sprintID, fieldStatus, true
			case relX >= prioStart && relX <= prioEnd:
				return n.issue, n.sprintID, fieldPriority, true
			}
			return nil, 0, 0, false
		}
		acc += h
	}
	return nil, 0, 0, false
}

// mouseTreeFieldClick dispatcht einen Tree-Klick auf die Priority-/Status-Zelle
// eines Issue-Knotens (DD2-274) — DIESELBE Öffnen-Funktion wie Backlog UND der
// Tasten-Pfad (openPriorityEdit/openIssueStatus), kein Logik-Duplikat (AC4).
// ok=false, wenn kein Feld getroffen wurde — handleMouse fällt dann auf den
// bestehenden mouseTreeClick-Zeilen-Cursor zurück (AC3: unverändertes Verhalten
// außerhalb der neuen Hit-Areas).
func (m model) mouseTreeFieldClick(msg tea.MouseMsg) (tea.Model, tea.Cmd, bool) {
	it, sprintID, field, hit := m.treeFieldHit(msg)
	if !hit {
		return m, nil, false
	}
	switch field {
	case fieldPriority:
		mi, cmd := m.openPriorityEdit(it)
		return mi, cmd, true
	case fieldStatus:
		mi, cmd := m.openIssueStatus(it, sprintID)
		return mi, cmd, true
	}
	return m, nil, false
}

// accordionHeaderDigit liest die 1-basierte Section-Nummer aus einer gestrippten
// Detail-Zeile, wenn es ein Accordion-Section-Header ist (`> [n] Title …`, ggf.
// mit führendem Fokus-Balken ▌). ok=false für Nicht-Header (Titel/Meta-Strip/Body/
// "Sections: digit [1..n] opens" → Atoi("1..n") scheitert). DD2-274 D02.
func accordionHeaderDigit(stripped string) (int, bool) {
	s := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(stripped), "▌"))
	if !strings.HasPrefix(s, ">") { // Accordion-Header beginnt mit dem Chevron
		return 0, false
	}
	i := strings.IndexByte(s, '[')
	if i < 0 {
		return 0, false
	}
	j := strings.IndexByte(s[i:], ']')
	if j < 1 {
		return 0, false
	}
	n, err := strconv.Atoi(s[i+1 : i+j])
	if err != nil || n < 1 {
		return 0, false
	}
	return n, true
}

// mouseAccordionClick toggelt eine Accordion-Section, wenn der Klick in der rechten
// Detail-Pane auf eine Section-Titelzeile fällt (DD2-274 D02, Hit-Area = ganze
// Titelzeile). Klick auf eine zugeklappte Section öffnet sie, auf die offene
// schließt sie (Toggle, analog der Zifferntaste keys.Section). Die getroffene Zeile
// wird render-getreu aus treeDetail (Single Source mit dem Render) ermittelt — nie
// eine Header-Arithmetik, die abdriften könnte. ok=false außerhalb der Header-Zeilen.
func (m model) mouseAccordionClick(msg tea.MouseMsg) (tea.Model, tea.Cmd, bool) {
	head, _, lw, rw, innerH := m.treeLayout()
	relX := msg.X - m.rightContentX(lw)
	if relX < 0 || relX >= rw { // nicht in der rechten Detail-Pane
		return m, nil, false
	}
	lineIdx := msg.Y - m.paneOriginY(head)
	if lineIdx < 0 || lineIdx >= innerH {
		return m, nil, false
	}
	nodes := m.treeNodes()
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil, false
	}
	lines := strings.Split(m.treeDetail(nodes[m.treeCursor], rw-2), "\n")
	if lineIdx >= len(lines) {
		return m, nil, false
	}
	n, ok := accordionHeaderDigit(ansi.Strip(lines[lineIdx]))
	if !ok {
		return m, nil, false
	}
	if m.accOpen == n { // Toggle: offene Section wieder schließen
		m.accOpen = 0
	} else {
		m.accOpen = n
	}
	return m, nil, true
}

// mouseMetaStripClick öffnet den Editor/Picker für die Type-/Priority-/Status-Zelle
// des Issue-Meta-Strips in der rechten Detail-Pane (DD2-274 D01). Der Meta-Strip ist
// Detail-Zeile 1 (Titel = Zeile 0). Zell-Geometrie via metaStripCells (Spiegel von
// metaStrip). Nur Issue-Knoten (Type/Priority/Status haben einen Tasten-Editor);
// milestone/tags-Zellen sind kein Ziel. ok=false außerhalb → der Aufrufer fällt auf
// den Accordion-/Cursor-Klick zurück. Die Öffnen-Funktionen sind DIESELBEN wie
// Tastatur + Backlog/Tree-Feld (openPriorityEdit/openTypeEdit/openIssueStatus).
func (m model) mouseMetaStripClick(msg tea.MouseMsg) (tea.Model, tea.Cmd, bool) {
	head, _, lw, rw, _ := m.treeLayout()
	relX := msg.X - m.rightContentX(lw)
	if relX < 0 || relX >= rw { // nicht in der rechten Detail-Pane
		return m, nil, false
	}
	if msg.Y-m.paneOriginY(head) != 1 { // Meta-Strip = Detail-Zeile 1
		return m, nil, false
	}
	nodes := m.treeNodes()
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil, false
	}
	n := nodes[m.treeCursor]
	if n.kind != tkIssue || n.issue == nil { // Meilenstein/Sprint: kein Type/Prio/Status-Strip
		return m, nil, false
	}
	it := n.issue
	// rw-2 = dieselbe Meta-Strip-Breite wie im Render (treeDetail ruft mit rw-2).
	for _, c := range metaStripCells(issueMetaPairs(*it), statusText(it.Status), rw-2) {
		if relX < c.start || relX >= c.end {
			continue
		}
		switch c.sub {
		case "prio":
			mi, cmd := m.openPriorityEdit(it)
			return mi, cmd, true
		case "type":
			mi, cmd := m.openTypeEdit(it)
			return mi, cmd, true
		case "status":
			mi, cmd := m.openIssueStatus(it, n.sprintID)
			return mi, cmd, true
		}
		return m, nil, false // milestone/tags: kein Editor (D01)
	}
	return m, nil, false
}

// mouseBodyFieldClick öffnet den Feld-Editor, wenn der Klick in den Body einer
// offenen Accordion-Sektion der rechten Detail-Pane fällt (DD2-274 #3, „Felder
// generell anklickbar+editierbar"). Die getroffene Sektion + Body-Zeile werden
// render-getreu aus treeDetail ermittelt (nächster Header oberhalb), das Feld über
// issueBodyField zugeordnet; geöffnet wird über DIESELBEN Funktionen wie der
// Tasten-Pfad (openEditField / openUserStoryForm). Nur Issue-Knoten (Meilenstein/
// Sprint-Felder folgen separat). ok=false außerhalb eines Body-Feldes.
func (m model) mouseBodyFieldClick(msg tea.MouseMsg) (tea.Model, tea.Cmd, bool) {
	head, _, lw, rw, _ := m.treeLayout()
	relX := msg.X - m.rightContentX(lw)
	if relX < 0 || relX >= rw { // nicht in der rechten Detail-Pane
		return m, nil, false
	}
	nodes := m.treeNodes()
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil, false
	}
	n := nodes[m.treeCursor]
	if n.kind != tkIssue || n.issue == nil { // Scope: Issue-Detail
		return m, nil, false
	}
	it := n.issue
	lineIdx := msg.Y - m.paneOriginY(head)
	if lineIdx < 0 {
		return m, nil, false
	}
	lines := strings.Split(m.treeDetail(n, rw-2), "\n")
	if lineIdx >= len(lines) {
		return m, nil, false
	}
	// Nächsten Section-Header AUF/OBERHALB der geklickten Zeile finden.
	hdr, secN := -1, 0
	for i := lineIdx; i >= 0; i-- {
		if d, ok := accordionHeaderDigit(ansi.Strip(lines[i])); ok {
			hdr, secN = i, d
			break
		}
	}
	if hdr < 0 || secN < 1 {
		return m, nil, false
	}
	bodyLine := lineIdx - hdr - 1
	// Feld-Streifen-Zeile ("Fields: …") direkt nach dem Header (nur im Detail-Fokus)
	// zählt nicht zum Body.
	if hdr+1 < len(lines) && strings.HasPrefix(strings.TrimSpace(ansi.Strip(lines[hdr+1])), "Fields:") {
		bodyLine--
	}
	if bodyLine < 0 { // Header-/Streifen-Zeile selbst (Header-Toggle lief bereits)
		return m, nil, false
	}
	secs := m.issueSections(*it, rw-2, true)
	if secN-1 < 0 || secN-1 >= len(secs) {
		return m, nil, false
	}
	const bodyIndent = 2 // renderAccordion boxStyle PaddingLeft(2)
	f, ok := issueBodyField(secs[secN-1], bodyLine, relX-bodyIndent, rw-2)
	if !ok {
		return m, nil, false
	}
	switch f.editor {
	case "userstory":
		mi, cmd := m.openUserStoryForm(*it, f)
		return mi, cmd, true
	case "dod":
		return m, nil, false // Issues haben keine DoD (nur Meilenstein) — kein Ziel
	default:
		mi, cmd := m.openEditField(*it, f)
		return mi, cmd, true
	}
}

// fieldKind identifiziert, welches mausklickbare Feld einer gerenderten Backlog-
// Zeile getroffen wurde (DD2-274). Bewusst NUR die Felder, die bereits einen
// Tasten-Picker/-Editor haben — keine generische "jedes Feld ist klickbar"-
// Infrastruktur (Out-of-Scope laut Spec).
type fieldKind int

const (
	fieldPriority fieldKind = iota
	fieldStatus
)

// backlogFieldHit bildet einen Mausklick auf ein Feld (Priority/Status) EINER
// bestimmten Backlog-Zeile ab (DD2-274) — dieselbe Geometrie wie
// backlogListBlocks/windowBlocks (drift-frei, analog mouseTreeClick, DD2-51). Nur
// die Kopfzeile eines Zeilen-Blocks (erste Zeile) trägt die Icons; umgebrochene
// Titelzeilen darunter sind nicht klickbar. hit=false, wenn X/Y keine Ikonen-Spalte
// trifft (Klick ist dann ein No-op, AC3).
func (m model) backlogFieldHit(msg tea.MouseMsg) (it *api.Issue, field fieldKind, hit bool) {
	head, _, lw, _, innerH := m.backlogLayout()
	relX := msg.X - m.leftContentX() // Screen-X → Pane-Content-Spalte (DD2-274 X-Fix)
	if relX < 0 || relX >= lw {
		return nil, 0, false // außerhalb der linken Pane-Inhaltsspalten
	}
	vis := m.backlogVisible()
	if len(vis) == 0 {
		return nil, 0, false
	}
	blocks := m.backlogListBlocks(vis, lw-2, !m.detailFocus)
	firstRowY := m.paneOriginY(head) + 1 // Such-Kopfzeile (analog treeFieldHit, DD2-274-Fix)
	rel := msg.Y - firstRowY
	if rel < 0 {
		return nil, 0, false
	}
	lo, hi := blockWindow(blocks, innerH-1, m.blist.cursor)
	acc := 0
	for i := lo; i <= hi; i++ {
		h := len(blocks[i])
		if rel < acc+h {
			if rel != acc {
				return nil, 0, false // nicht die Kopfzeile des Blocks
			}
			statusStart, _, prioStart, prioEnd := backlogRowCols(vis[i])
			// D05: lückenlose Hit-Zonen (analog treeFieldHit) — Status frisst die
			// Lücke bis Priority, Priority den nachfolgenden Trennraum vor dem Key.
			switch {
			case relX >= statusStart && relX < prioStart:
				return &vis[i], fieldStatus, true
			case relX >= prioStart && relX <= prioEnd:
				return &vis[i], fieldPriority, true
			}
			return nil, 0, false
		}
		acc += h
	}
	return nil, 0, false
}

// mouseBacklogClick dispatcht einen Backlog-Klick (DD2-274): ein Treffer auf die
// Priority-/Status-Zelle einer Zeile öffnet DIESELBE Öffnen-Funktion, die auch der
// Tasten-Pfad ruft (openPriorityEdit/openIssueStatus) — kein Logik-Duplikat (AC4).
// Kein Treffer → No-op (AC3: Backlog reagierte vor dieser Änderung auf keinen
// Klick, das bleibt für alles außerhalb der neuen Hit-Areas unverändert).
func (m model) mouseBacklogClick(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	it, field, hit := m.backlogFieldHit(msg)
	if !hit {
		return m, nil
	}
	switch field {
	case fieldPriority:
		return m.openPriorityEdit(it)
	case fieldStatus:
		return m.openIssueStatus(it, 0) // Backlog = unsprinted Issues, kein Sprint-Refresh-Kontext
	}
	return m, nil
}

// paneOriginY liefert die Bildschirm-Zeile der ERSTEN Pane-Innenzeile im Split-
// Layout (searchLine links / detail[0] rechts): Header-Höhe + obere Box-Border,
// PLUS die obere Zeile des App-Außenrahmens (outerBorder), falls viewBordered.
// DD2-274-Fix: die bisherigen Klick-Formeln zählten den Außenrahmen NICHT mit,
// obwohl termWidth()/frameH() ihn reservieren → alle Split-Klick-Y lagen um 1
// daneben (real „praktisch unklickbar"). Single Source für ALLE Split-Klick-Maps.
func (m model) paneOriginY(head string) int {
	y := lipgloss.Height(head) + 1 // obere Box-Border
	if m.viewBordered() {
		y++ // App-Außenrahmen (outerBorder) obere Zeile
	}
	return y
}

// leftContentX liefert die Screen-Spalte der ERSTEN Inhaltsspalte der linken Pane
// (Box-Border + App-Außenrahmen). DD2-274-Fix (X-Achse): die Feld-Hit-Tests
// verglichen Screen-X direkt mit pane-content-relativen Spalten (treeIssueRowCols/
// backlogRowCols, ab dem Zeilen-Marker gezählt) → X lag um diesen Offset daneben
// (Klick auf Status öffnete Priority, memory dd2-274 B01). Pendant zu paneOriginY (Y).
func (m model) leftContentX() int {
	x := 1 // Box-Border links
	if m.viewBordered() {
		x++ // App-Außenrahmen linke Spalte
	}
	return x
}

// rightContentX liefert die Screen-Spalte der ersten Inhaltsspalte der RECHTEN
// Detail-Pane (DD2-274): linke Pane-Content-Ursprung + linke Box-Breite (lw) +
// rechte Box-Border. Single Source für die Meta-Strip-/Accordion-Klicks.
func (m model) rightContentX(lw int) int {
	return m.leftContentX() + lw + 2 // + linke Box-Rechtsborder + rechte Box-Linksborder
}

// treeClickIdx bildet Klick-Y auf den Tree-Knoten-Index ab (DD2-51) — dieselbe
// Geometrie wie der Render (treeLayout + treeLeftBlocks + blockWindow), darum
// drift-frei. ok=false, wenn der Klick nicht in die linke Spalte oder auf keinen
// Block fällt. Single Source für Cursor-Klick UND die DD2-274-Expand/Collapse-Logik.
func (m model) treeClickIdx(msg tea.MouseMsg) (int, bool) {
	head, _, lw, _, innerH := m.treeLayout()
	if msg.X >= lw {
		return 0, false // rechte Detail-Spalte — kein Cursor-Ziel
	}
	// Erste Baumzeile = Pane-Ursprung (searchLine) + 1 (Such-Kopfzeile).
	firstRowY := m.paneOriginY(head) + 1
	rel := msg.Y - firstRowY
	if rel < 0 {
		return 0, false
	}
	// DD2-193: Tree-Zeilen sind block-variabel (Issue = Key + umgebrochener Titel).
	// Klick-Y → Block-Index über dieselbe Geometrie wie der Render (blockWindow +
	// kumulierte Blockhöhen), darum drift-frei. lw-2 = Pane-Innenbreite (wie Render).
	nodes := m.treeNodes()
	blocks := m.treeLeftBlocks(nodes, lw-2, !m.detailFocus)
	if len(blocks) == 0 {
		return 0, false
	}
	lo, hi := blockWindow(blocks, innerH-1, m.treeCursor) // innerH-1: Such-Kopfzeile
	acc := 0
	for i := lo; i <= hi; i++ {
		h := len(blocks[i])
		if rel < acc+h {
			return i, true
		}
		acc += h
	}
	return 0, false
}

// mouseTreeClick setzt den Tree-Cursor auf die geklickte Zeile (DD2-51) und wendet
// auf expandierbare Knoten die DD2-274-Semantik an (D03): Einzelklick auf einen
// ZUgeklappten Knoten (Meilenstein/Sprint) klappt auf, Doppelklick auf einen
// OFFENEN klappt zu; ein Einzelklick auf einen offenen Knoten toggelt NICHT
// (nur Cursor). Nicht-expandierbare Knoten (Issue/Info) setzen bloß den Cursor —
// Issue-Feld-Klicks (Priority/Status) fängt mouseTreeFieldClick bereits davor ab.
func (m model) mouseTreeClick(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	idx, ok := m.treeClickIdx(msg)
	if !ok {
		return m, nil
	}
	nodes := m.treeNodes()
	m.treeCursor = idx
	n := nodes[idx]

	// Doppelklick = zweiter Klick auf DENSELBEN Knoten innerhalb des Zeitfensters.
	// lastClickAt=zero (Zero-Value) ⇒ riesiges Delta ⇒ erster Klick nie Doppelklick.
	now := m.now()
	isDouble := idx == m.lastClickIdx && now.Sub(m.lastClickAt) < doubleClickInterval
	m.lastClickIdx = idx
	m.lastClickAt = now

	if n.expand {
		switch {
		case n.open && isDouble:
			return m.treeCollapse(nodes)
		case !n.open:
			return m.treeExpand(nodes)
		}
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
			return m.showToast(toastError, "editor: "+ef.err.Error(), "", nil, false)
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
			return m.showToast(toastError, "editor: "+ef.err.Error(), "", nil, false)
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
		return m, nil
	}
	return m, cmd
}
