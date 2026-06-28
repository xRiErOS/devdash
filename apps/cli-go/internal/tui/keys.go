package tui

import (
	"devd-cli/internal/api"
	"strings"
	tea "github.com/charmbracelet/bubbletea"
)

func (m model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Beenden-Confirm (DD2-49) ist top-most: solange er offen ist, fängt er alles.
	if m.confirmQuit {
		return m.keyConfirmQuit(msg)
	}
	// In-App-Hilfe (DD2-31): jede Taste schließt das offene Overlay wieder.
	if m.helpOpen {
		m.helpOpen = false
		return m, nil
	}
	// Command-Center (T16) ist das globalste Modal — fängt vor allem anderen.
	if m.paletteOpen {
		return m.keyPalette(msg)
	}
	// Projekt-Picker-Overlay (DD2-124): schwebt über jeder View, fängt voll.
	if m.projPick {
		return m.keyProjPick(msg)
	}
	// ctrl+k / shift+k öffnet das Command-Center von überall (außer in Text-Eingabe).
	if k := msg.String(); k == "ctrl+k" || k == "K" {
		if !m.inputting {
			return m.openPalette()
		}
	}
	// Meilenstein-Status-Menü (T01) fängt vor View-Tasten.
	if m.msPick {
		return m.keyMilestoneStatus(msg)
	}
	// Sprint-Status-Menü (T05) ist view-übergreifend (Cockpit S + Columns s).
	if m.sprintPick {
		return m.keySprintPick(msg)
	}
	// Issue-Status-Menü (DD2-29) view-übergreifend (Cockpit s + Columns/Detail s).
	if m.statusPick {
		return m.keyStatusPick(msg)
	}
	// Sprint↔Meilenstein-Zuweisung (T03).
	if m.smPick {
		return m.keySprintMilestone(msg)
	}
	if m.maPick {
		return m.keyMilestoneAssign(msg)
	}
	// Tag-Zuweisungs-Picker (DD2-33) fängt als Overlay vor den View-Tasten.
	if m.tagPick {
		return m.keyTagPicker(msg)
	}
	// Cascade-Delete-Confirm (T02b) fängt vor View-Tasten.
	if m.delConfirm {
		return m.keyDelete(msg)
	}
	if m.asPick { // DD2-136: Issue→Sprint-Picker (view-übergreifend, wie delConfirm)
		return m.keyAssignSprint(msg)
	}
	// Meilenstein-Cascade-Complete-Confirm (DD2-28).
	if m.mcConfirm {
		return m.keyMilestoneCascade(msg)
	}
	// Filter-Modal fängt zuerst.
	if m.filtering {
		return m.keyFilter(msg)
	}
	// Tree-Filter-Menü (DD2-62) fängt vor den View-Tasten.
	if m.treeFilterOpen {
		return m.keyTreeFilter(msg)
	}
	// In-App-Hilfe (DD2-31): ? öffnet die Shortcut-Übersicht — view-übergreifend,
	// aber nicht während einer Texteingabe (Tree-/Memory-Suche, Reject-Kommentar),
	// wo ? als Zeichen getippt werden muss.
	if bindHas(keys.Help, msg.String()) && !m.treeSearching && !m.memSearching && !m.inputting {
		m.helpOpen = true
		return m, nil
	}
	// Review-Cockpit hat eigenen Eingabemodus.
	if m.view == viewReview {
		return m.keyReview(msg)
	}
	// Memory-Browser fängt voll (Suche tippt q/R/p als Text).
	if m.view == viewMemory {
		return m.keyMemory(msg)
	}
	// Tag-Manager (DD2-75) fängt voll (n/e/d + esc/q zurück).
	if m.view == viewTags {
		return m.keyTags(msg)
	}
	// Tree+Detail-Prototyp (DD2-57) fängt voll (eigene Nav + t/esc zurück).
	if m.view == viewTree {
		return m.keyTree(msg)
	}
	// Lobby (DD2-124): alle Keys an den Home-Handler (Nav/Auswahl/Filter).
	if m.view == viewHome {
		return m.keyHome(msg)
	}
	// Backlog mit aktivem Eingabe-/Menü-Overlay (DD2-46): alle Tasten direkt an den
	// Backlog-Handler, bevor die globalen Shortcuts (p/q/R/T) sie abfangen.
	if m.view == viewBacklog && (m.blSearching || m.blFilterOpen || m.blSortOpen) {
		return m.keyBacklog(msg)
	}
	k := msg.String()
	// Globale Tasten
	switch k {
	case "q": // DD2-124: q verlässt jede Projekt-View zur Lobby (immer Home)
		return m.goHome()
	case "ctrl+c": // harter Beenden-Pfad → Confirm (DD2-49)
		return m.requestQuit()
	case "p":
		if m.global != nil {
			return m.openProjPick() // DD2-124: Picker als Overlay (kein View-Wechsel)
		}
	case "R": // T17: R öffnet von überall die Liste offener Review-Sprints
		return m.openReviewsList()
	case "T": // DD2-75: Tag-Manager von überall
		return m.openTagManager()
	}

	switch m.view {
	case viewColumns:
		return m.keyColumns(k)
	case viewDetail:
		if m.keyScroll(k) { // DD2-30: scrollbarer Detail-Body
			return m, nil
		}
		switch k {
		case "esc":
			m.view = viewColumns
		case "s": // DD2-29: Issue-Status auch im Detail mutieren
			if it := m.selIssue(); it != nil {
				sid := 0
				if m.curSprint != nil {
					sid = m.curSprint.ID
				}
				return m.openIssueStatus(it, sid)
			}
		case "t": // DD2-33: Tag-Picker für das Issue
			if it := m.selIssue(); it != nil {
				return m.openTagPicker("issue", it.ID, it.Key+" "+it.Title, it.Tags)
			}
		}
		return m, nil
	case viewMilestone:
		if m.keyScroll(k) {
			return m, nil
		}
		switch k {
		case "esc":
			m.view = viewColumns
		case "S":
			return m.openMilestoneStatus()
		case "a": // T03 Flow B: Sprints diesem Meilenstein zuweisen (Checkliste)
			return m.openMilestoneAssign()
		case "d": // T02b: Meilenstein kaskadierend löschen
			if ms := m.selMilestone(); ms != nil {
				return m.openDelete("milestone", ms.ID, ms.Name)
			}
		case "t": // DD2-33: Tag-Picker für den Meilenstein
			if ms := m.selMilestone(); ms != nil {
				return m.openTagPicker("milestone", ms.ID, ms.Name, nil)
			}
		}
		return m, nil
	case viewSprint:
		if m.keyScroll(k) {
			return m, nil
		}
		switch k {
		case "esc":
			m.view = viewColumns
		case "y":
			return m.yankContext()
		case "m": // T03 Flow A: diesen Sprint einem Meilenstein zuweisen
			if s := m.selSprint(); s != nil {
				return m.openSprintMilestone(s.ID)
			}
		case "d": // T02b: Sprint kaskadierend löschen
			if s := m.selSprint(); s != nil {
				return m.openDelete("sprint", s.ID, s.Name)
			}
		case "t": // DD2-33: Tag-Picker für den Sprint
			if s := m.selSprint(); s != nil {
				return m.openTagPicker("sprint", s.ID, s.Name, nil)
			}
		}
		return m, nil
	case viewReviewsList:
		return m.keyReviewsList(k)
	case viewBacklog:
		return m.keyBacklog(msg)
	}
	return m, nil
}

// openReviewsList öffnet die Liste offener Review-Sprints (T17). Merkt die
// Quell-View (Tree/Columns), damit q/esc dorthin zurückkehrt (DD2-61 Primat).
func (m model) openReviewsList() (tea.Model, tea.Cmd) {
	if m.view == viewTree || m.view == viewColumns {
		m.topReturn = m.view
	}
	m.view = viewReviewsList
	m.rvlist = listState{}
	m.status = ""
	return m, loadReviewSprints(m.client)
}

// openBacklog öffnet die Backlog-Liste und merkt die Quell-View (Tree/Columns)
// für die Rückkehr (DD2-61 Primat) — geteilt von keyTree und keyColumns.
func (m model) openBacklog() (tea.Model, tea.Cmd) {
	if m.view == viewTree || m.view == viewColumns {
		m.topReturn = m.view
	}
	m.view = viewBacklog
	m.detailFocus = false       // DD2-32: Einstieg immer im Listen-Fokus
	m.secCursor, m.accOpen = 0, 1 // Detail-Preview: erste Content-Section offen
	m.detailLevel, m.fieldCursor = 0, 0
	return m, loadBacklog(m.client)
}

// keyReviewsList steuert die Review-Sprint-Liste: Auswahl öffnet das Cockpit.
func (m model) keyReviewsList(k string) (tea.Model, tea.Cmd) {
	switch navKey(k) {
	case "up":
		m.rvlist.move(-1)
		return m, nil
	case "down":
		m.rvlist.move(1)
		return m, nil
	}
	switch k {
	case "esc", "R":
		m.view = m.topReturn // zurück zur Quell-View (Tree/Columns, DD2-61)
		return m, nil
	case "enter":
		if m.rvlist.cursor >= 0 && m.rvlist.cursor < len(m.reviewSprints) {
			s := m.reviewSprints[m.rvlist.cursor]
			m.view = viewReview
			m.reviewReturn = viewReviewsList // q/esc kehrt zur Liste zurück
			m.rlist.reset()
			m.confirmComplete = false
			m.curSprint = nil
			return m, loadSprint(m.client, s.ID)
		}
	}
	return m, nil
}

// filteredProjects filtert m.projects nach dem aktuellen projectQuery (Name/Prefix/Slug).
func (m model) filteredProjects() []api.Project {
	q := strings.ToLower(strings.TrimSpace(m.projectQuery))
	if q == "" {
		return m.projects
	}
	var out []api.Project
	for _, p := range m.projects {
		if strings.Contains(strings.ToLower(p.Name), q) ||
			strings.Contains(strings.ToLower(p.Prefix), q) ||
			strings.Contains(strings.ToLower(p.Slug), q) {
			out = append(out, p)
		}
	}
	return out
}

func (m model) keyColumns(k string) (tea.Model, tea.Cmd) {
	switch navKey(k) {
	case "up":
		m.focusList().move(-1)
		return m, m.onFocusMove()
	case "down":
		m.focusList().move(1)
		return m, m.onFocusMove()
	case "right":
		if m.depth < 2 {
			m.depth++
			return m, m.syncSprint()
		}
	case "left":
		if m.depth > 0 {
			m.depth--
		}
		return m, nil
	}
	if bindHas(keys.Refresh, k) { // DD2-72: manueller Daten-Reload (Spalten + selektierter Sprint)
		var ids []int
		if s := m.selSprint(); s != nil {
			ids = append(ids, s.ID)
		}
		return m, doRefresh(m.client, ids)
	}
	switch k {
	case "esc": // DD2-124: Esc aus Projekt-View → Lobby (Esc-Spine)
		return m.goHome()
	case "enter":
		if m.depth == 0 && m.selMilestone() != nil {
			m.view = viewMilestone
			m.scroll = 0
		} else if m.depth == 1 && m.selSprint() != nil {
			m.view = viewSprint
			m.scroll = 0
			return m, m.syncSprint()
		} else if m.depth == 2 && m.selIssue() != nil {
			m.view = viewDetail
			m.scroll = 0
		}
	case "f":
		return m.openFilter()
	case "y":
		return m.yankContext()
	case "b":
		return m.openBacklog()
	case "S": // T01: Meilenstein-Status (nur auf fokussiertem Meilenstein)
		if m.depth == 0 {
			return m.openMilestoneStatus()
		}
	case "s": // T05: Sprint-Status (depth 1) / DD2-29: Issue-Status (depth 2)
		if m.depth == 1 {
			if sp := m.selSprint(); sp != nil {
				return m.openSprintStatus(sp.ID, sp.Status)
			}
		} else if m.depth == 2 {
			if it := m.selIssue(); it != nil {
				sid := 0
				if m.curSprint != nil {
					sid = m.curSprint.ID
				}
				return m.openIssueStatus(it, sid)
			}
		}
	case "d": // T02b: Cascade-Delete Meilenstein/Sprint; DD2-65/DD2-85: Issue einzeln
		if m.depth == 0 {
			if ms := m.selMilestone(); ms != nil {
				return m.openDelete("milestone", ms.ID, ms.Name)
			}
		} else if m.depth == 1 {
			if sp := m.selSprint(); sp != nil {
				return m.openDelete("sprint", sp.ID, sp.Name)
			}
		} else if m.depth == 2 {
			if it := m.selIssue(); it != nil {
				return m.openDelete("issue", it.ID, it.Key+" "+it.Title)
			}
		}
	case "t": // DD2-33: Tag-Picker für die fokussierte Ebene
		switch m.depth {
		case 0:
			if ms := m.selMilestone(); ms != nil {
				return m.openTagPicker("milestone", ms.ID, ms.Name, nil)
			}
		case 1:
			if sp := m.selSprint(); sp != nil {
				return m.openTagPicker("sprint", sp.ID, sp.Name, nil)
			}
		case 2:
			if it := m.selIssue(); it != nil {
				return m.openTagPicker("issue", it.ID, it.Key+" "+it.Title, it.Tags)
			}
		}
	}
	return m, nil
}

// openSprintStatus öffnet das Sprint-Status-Menü für einen Ziel-Sprint
// (Cockpit S oder Columns s, T05) — lifecycle-gültige Transitions.
func (m model) openSprintStatus(id int, status string) (tea.Model, tea.Cmd) {
	opts := sprintTransitions[status]
	if len(opts) == 0 {
		m.status = noticeText("No sprint transitions from '" + status + "'")
		return m, nil
	}
	m.sprintPick = true
	m.spTargetID = id
	m.spCurStatus = status
	m.spmenu = listState{}
	m.spopts = opts
	m.spmenu.setLen(len(opts))
	return m, nil
}

// openIssueStatus öffnet das Issue-Status-Menü für ein beliebiges Issue —
// view-übergreifend (Review-Cockpit ODER Columns/Detail, DD2-29). sprintID ist
// der Refresh-Kontext (0 wenn kein Sprint geladen).
func (m model) openIssueStatus(it *api.Issue, sprintID int) (tea.Model, tea.Cmd) {
	if it == nil {
		m.status = "No issue selected"
		return m, nil
	}
	opts := allowedManualStatuses(it.Status)
	if len(opts) == 0 {
		m.status = noticeText("No manual transitions from '" + it.Status + "' (passed/rejected via Review)")
		return m, nil
	}
	m.statusPick = true
	m.stIssueID = it.ID
	m.stIssueStatus = it.Status
	m.stSprintID = sprintID
	m.smenu = listState{}
	m.sopts = opts
	m.smenu.setLen(len(opts))
	return m, nil
}

// openMilestoneStatus öffnet das Meilenstein-Status-Menü (T01) für den in den
// Columns selektierten Meilenstein.
func (m model) openMilestoneStatus() (tea.Model, tea.Cmd) {
	return m.openMilestoneStatusFor(m.selMilestone())
}

// openMilestoneStatusFor öffnet das Menü für einen beliebigen Meilenstein (Tree:
// Knoten unter dem Cursor; Columns: Selektion). Ziel-Daten werden kopiert, damit
// der Confirm/Render nicht auf selMilestone angewiesen ist (view-übergreifend).
func (m model) openMilestoneStatusFor(ms *api.Milestone) (tea.Model, tea.Cmd) {
	if ms == nil {
		return m, nil
	}
	opts := milestoneTransitions[ms.Status]
	if len(opts) == 0 {
		m.status = noticeText("No milestone transitions from '" + ms.Status + "'")
		return m, nil
	}
	m.msPick = true
	m.msTargetID = ms.ID
	m.msTargetName = ms.Name
	m.msTargetStatus = ms.Status
	m.msTargetOpenSprint = openSprintCount(ms.Sprints)
	m.msmenu = listState{}
	m.msopts = opts
	m.msmenu.setLen(len(opts))
	return m, nil
}

// keyMilestoneStatus steuert das Meilenstein-Status-Menü (T01).
func (m model) keyMilestoneStatus(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.msmenu.move(-1)
		return m, nil
	case "down":
		m.msmenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "S":
		m.msPick = false
		m.status = ""
		return m, nil
	case "enter":
		m.msPick = false
		if m.msmenu.cursor < 0 || m.msmenu.cursor >= len(m.msopts) {
			return m, nil
		}
		target := m.msopts[m.msmenu.cursor]
		// DD2-28: completed mit offenen Sprints → Cascade-Confirm statt 422. Ziel-Daten
		// aus dem beim Öffnen kopierten State (view-übergreifend, auch Tree).
		if target == "completed" && m.msTargetOpenSprint > 0 {
			m.mcConfirm = true
			m.mcID = m.msTargetID
			m.mcName = m.msTargetName
			m.mcSprints = m.msTargetOpenSprint
			m.status = ""
			return m, nil
		}
		m.status = "Milestone → " + target + " …"
		return m, doMilestoneStatus(m.client, m.msTargetID, target)
	}
	return m, nil
}

// openSprintCount zählt nicht-terminale Sprints (DD2-28 Cascade-Confirm).
func openSprintCount(sprints []api.Sprint) int {
	n := 0
	for _, s := range sprints {
		switch s.Status {
		case "completed", "closed", "cancelled":
		default:
			n++
		}
	}
	return n
}

// keyMilestoneCascade behandelt den Cascade-Complete-Confirm (DD2-28).
func (m model) keyMilestoneCascade(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "Y", "enter":
		m.mcConfirm = false
		m.status = "Closing milestone cascading …"
		return m, doMilestoneCascadeComplete(m.client, m.mcID)
	case "n", "N", "esc", "q":
		m.mcConfirm = false
		m.status = noticeText("Abgebrochen")
		return m, nil
	}
	return m, nil
}

// --- Filter-Modal ---

func (m model) openFilter() (tea.Model, tea.Cmd) {
	m.ftarget = m.depth
	m.fopts = m.filterOptsFor(m.depth)
	m.fcur = listState{}
	m.fcur.setLen(len(m.fopts))
	m.filtering = true
	return m, nil
}

// filterOptsFor sammelt die Werte der Fokus-Spalte (Status + ggf. Deferred-Pseudo).
func (m *model) filterOptsFor(depth int) []filterOpt {
	seen := map[string]bool{}
	var opts []filterOpt
	add := func(val, label string) {
		if val == "" || seen[val] {
			return
		}
		seen[val] = true
		opts = append(opts, filterOpt{val, label})
	}
	switch depth {
	case 0:
		for _, ms := range m.milestones {
			add(ms.Status, ms.Status)
		}
		opts = append(opts, filterOpt{deferredKey, "show deferred"})
	case 1:
		if ms := m.selMilestone(); ms != nil {
			for _, s := range ms.Sprints {
				add(s.Status, s.Status)
			}
		}
	default:
		for _, it := range m.issuesOfSel() {
			add(it.Status, it.Status)
		}
	}
	return opts
}

func (m *model) filterFor(depth int) *filterState {
	switch depth {
	case 0:
		return &m.fMile
	case 1:
		return &m.fSprint
	default:
		return &m.fIssue
	}
}

func (m model) keyFilter(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.fcur.move(-1)
		return m, nil
	case "down":
		m.fcur.move(1)
		return m, nil
	}
	switch msg.String() {
	case "q", "esc", "f":
		m.filtering = false
		return m, m.afterFilter()
	case " ", "x":
		if m.fcur.cursor < len(m.fopts) {
			m.filterFor(m.ftarget).toggle(m.fopts[m.fcur.cursor].value)
		}
		return m, nil
	case "enter":
		m.filtering = false
		return m, m.afterFilter()
	}
	return m, nil
}

// afterFilter klemmt Cursor + Längen nach Filter-Änderung neu.
func (m *model) afterFilter() tea.Cmd {
	m.mlist.setLen(len(m.visMilestonesRaw()))
	m.slist.setLen(len(m.visSprints()))
	m.ilist.setLen(len(m.visIssues()))
	return m.syncSprint()
}

// --- Yank: Kontext (Meilenstein→Sprints / Sprint→Issues) in Clipboard ---
