package tui

import (
	"devd-cli/internal/api"
	"devd-cli/internal/clip"
	tea "github.com/charmbracelet/bubbletea"
	"strings"
)

func (m model) yankContext() (tea.Model, tea.Cmd) {
	switch m.depth {
	case 0:
		if ms := m.selMilestone(); ms != nil {
			if err := clip.Copy(milestoneClip(ms)); err != nil {
				m.errNote = "Clipboard-Fehler: " + err.Error()
			} else {
				m.errNote = ""
				m.status = "Meilenstein-Kontext kopiert (" + ms.Name + ")"
			}
		}
	case 1:
		if s := m.selSprint(); s != nil {
			src := s
			if m.curSprint != nil && m.curSprint.ID == s.ID {
				src = m.curSprint
			}
			if err := clip.Copy(sprintClip(src)); err != nil {
				m.errNote = "Clipboard-Fehler: " + err.Error()
			} else {
				m.errNote = ""
				m.status = "Sprint-Kontext kopiert (" + s.Key + ")"
			}
		}
	default:
		m.status = "Yank: auf Meilenstein (Sprints) oder Sprint (Issues) — h zurück"
	}
	return m, nil
}

// reviewItem ist das aktuell im Cockpit selektierte Issue.
func (m *model) reviewItem() *api.Issue {
	if m.curSprint != nil && m.rlist.cursor >= 0 && m.rlist.cursor < len(m.curSprint.Items) {
		return &m.curSprint.Items[m.rlist.cursor]
	}
	return nil
}

// keyReview behandelt das Review-Cockpit: Reject-Eingabe, Status-Menü, Verdikte.
func (m model) keyReview(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.usOpen {
		return m.keyUserStory(msg)
	}
	if m.inputting {
		return m.keyReviewInput(msg)
	}
	if m.statusPick {
		return m.keyStatusPick(msg)
	}
	if m.sprintPick {
		return m.keySprintPick(msg)
	}

	switch navKey(msg.String()) {
	case "up":
		m.rlist.move(-1)
		return m, nil
	case "down":
		m.rlist.move(1)
		return m, nil
	}

	it := m.reviewItem()
	switch msg.String() {
	case "q", "esc":
		m.status = ""
		// B01: Columns nach Review immer neu laden — Verdikte/Status-Mutationen
		// im Cockpit ändern m.curSprint, aber m.milestones (Columns) blieb stale.
		if m.reviewReturn == viewReviewsList {
			m.view = viewReviewsList
			return m, tea.Batch(loadReviewSprints(m.client), loadMilestones(m.client))
		}
		m.view = viewColumns
		return m, loadMilestones(m.client)
	case "enter": // Issue-Abnahme-Modal: goal/background/User-Stories abhaken
		if it == nil {
			return m, nil
		}
		m.usOpen = true
		m.usIssueID = it.ID
		m.usList = nil
		m.uslist = listState{}
		m.status = ""
		return m, loadUserStories(m.client, it.ID)
	case "r": // I02: Ergebnisfeld setzen (löst das result-Gate ohne Tool-Wechsel)
		if it == nil {
			return m, nil
		}
		m.resultIssueID = it.ID
		m.resultIssueKey = it.Key
		m.resultSprintID = m.curSprint.ID
		return m.openForm("result")
	case "s": // Status manuell mutieren — nur lifecycle-gültige Ziele
		sid := 0
		if m.curSprint != nil {
			sid = m.curSprint.ID
		}
		return m.openIssueStatus(it, sid)
	case "a": // Pass — Backend erlaubt Verdikt unabhängig vom Issue-Status
		// (autoSetPassedOnReviewPass setzt to_review/rejected→passed). Edit-Lock
		// (submitted Sprint + entschiedene Runde) kommt als Sapphire-Hinweis zurück.
		if it == nil {
			return m, nil
		}
		m.status = "Pass gesendet …"
		return m, doVerdict(m.client, it.ID, "passed", "", m.curSprint.ID)
	case "x": // Reject — analog, Backend validiert
		if it == nil {
			return m, nil
		}
		m.inputting = true
		m.input = ""
		m.status = "Reject-Kommentar (enter=senden, esc=abbrechen): "
	case "o": // Reopen — direkt aus to_review/passed/rejected (DD2-7). Löst den
		// Deadlock (passed + letztes Verdikt not_passed) ohne den w:Rework-
		// Mehrschritt; das Backend öffnet eine frische pending-Runde + Marker-Reset.
		if it == nil {
			return m, nil
		}
		if !reviewReopenable(it.Status) {
			m.status = noticeText("Reopen nur aus to_review/passed/rejected — sonst w (Rework)")
			return m, nil
		}
		m.status = "Reopen gesendet …"
		return m, doReopen(m.client, it.ID, m.curSprint.ID)
	case "w": // Rework: Issue über die Lifecycle-Kette nach to_review (entsperrt
		// re-Review bei Edit-Lock / status≠to_review, z.B. passed mit not_passed-Verdikt)
		if it == nil {
			return m, nil
		}
		path := reworkPath(it.Status)
		if len(path) == 0 {
			m.status = noticeText("Issue ist bereits to_review")
			return m, nil
		}
		m.status = "Rework: " + it.Status + " → " + strings.Join(path, " → ") + " …"
		return m, doRework(m.client, it.ID, path, m.curSprint.ID)
	case "P": // DD2-44: Review-Pass markieren (review_submitted_at) — „Review-Durchgang
		// fertig"-Marker. Backend ist idempotent; entsperrt keinen Auto-Close.
		if m.curSprint == nil {
			return m, nil
		}
		m.status = "Review-Pass wird markiert …"
		return m, doReviewSubmit(m.client, m.curSprint.ID)
	case "S": // Sprint-Status-Menü: zeigt gültige Sprint-Transitions
		if m.curSprint == nil {
			return m, nil
		}
		return m.openSprintStatus(m.curSprint.ID, m.curSprint.Status)
	case "C": // Sprint abschließen — nur wenn review
		if m.curSprint == nil {
			return m, nil
		}
		if m.curSprint.Status != "review" {
			m.status = noticeText("Abschluss nur aus review (Sprint ist: " + m.curSprint.Status + ") — erst S")
			return m, nil
		}
		if !m.confirmComplete {
			m.confirmComplete = true
			m.status = noticeText("Sprint abschließen? Nochmal C zum Bestätigen (PO/DD-186)")
			return m, nil
		}
		m.confirmComplete = false
		m.status = "Sprint wird abgeschlossen …"
		// DD2-45: nach dem Complete automatisch den Ergebnis-Handover (rev-results)
		// in die Zwischenablage yanken — kein manueller Wechsel zur rev-results-Seite.
		return m, doSprintComplete(m.client, m.curSprint.ID)
	}
	return m, nil
}

func (m model) keyReviewInput(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		comment := strings.TrimSpace(m.input)
		m.inputting = false
		m.input = ""
		if comment == "" {
			m.status = noticeText("Reject abgebrochen — Kommentar war leer")
			return m, nil
		}
		it := m.reviewItem()
		if it == nil || m.curSprint == nil {
			return m, nil
		}
		m.status = "Reject gesendet …"
		return m, doVerdict(m.client, it.ID, "not_passed", comment, m.curSprint.ID)
	case tea.KeyEsc:
		m.inputting = false
		m.input = ""
		m.status = "Reject abgebrochen"
		return m, nil
	case tea.KeyBackspace, tea.KeyDelete:
		if len(m.input) > 0 {
			r := []rune(m.input)
			m.input = string(r[:len(r)-1])
		}
		return m, nil
	default:
		m.input += string(msg.Runes)
		return m, nil
	}
}

func (m model) keyStatusPick(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.smenu.move(-1)
		return m, nil
	case "down":
		m.smenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "s":
		m.statusPick = false
		m.status = ""
		return m, nil
	case "enter":
		m.statusPick = false
		if m.stIssueID == 0 || m.smenu.cursor < 0 || m.smenu.cursor >= len(m.sopts) {
			return m, nil
		}
		target := m.sopts[m.smenu.cursor]
		m.status = "Status → " + target + " …"
		return m, doStatus(m.client, m.stIssueID, target, m.stSprintID)
	}
	return m, nil
}

// reviewReopenable spiegelt das Backend-Set REOPENABLE_STATUSES (reviewMarker.js,
// DD2-7): direkter review/reopen aus to_review/passed/rejected. Andere Status
// haben keine sinnvolle Runde zum Wieder-Öffnen → erst w:Rework.
func reviewReopenable(status string) bool {
	switch status {
	case "to_review", "passed", "rejected":
		return true
	default:
		return false
	}
}

// reworkPath liefert die Statuskette vom aktuellen Status nach to_review
// (lifecycle-konform). Leer, wenn bereits to_review.
func reworkPath(from string) []string {
	switch from {
	case "to_review":
		return nil
	case "in_progress":
		return []string{"to_review"}
	case "planned":
		return []string{"in_progress", "to_review"}
	case "rejected":
		return []string{"in_progress", "to_review"}
	case "passed", "done":
		return []string{"planned", "in_progress", "to_review"}
	case "refined":
		return []string{"planned", "in_progress", "to_review"}
	case "new":
		return []string{"refined", "planned", "in_progress", "to_review"}
	default:
		return []string{"to_review"}
	}
}

// keySprintPick steuert das Sprint-Status-Menü (Taste S).
func (m model) keySprintPick(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.spmenu.move(-1)
		return m, nil
	case "down":
		m.spmenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "S", "s":
		m.sprintPick = false
		m.status = ""
		return m, nil
	case "enter":
		m.sprintPick = false
		if m.spTargetID == 0 || m.spmenu.cursor < 0 || m.spmenu.cursor >= len(m.spopts) {
			return m, nil
		}
		target := m.spopts[m.spmenu.cursor]
		m.status = "Sprint → " + target + " …"
		// doSprintTo aktualisiert curSprint (Cockpit); loadMilestones hält die
		// Ranger-Columns frisch (Status im Sprint-Pane), egal von wo getriggert.
		return m, tea.Batch(
			doSprintTo(m.client, m.spTargetID, target), // completed → /complete (gated)
			loadMilestones(m.client),
		)
	}
	return m, nil
}

// keyUserStory steuert das Abnahme-Modal: User-Stories durchgehen + Verdikt setzen.
func (m model) keyUserStory(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.uslist.move(-1)
		return m, nil
	case "down":
		m.uslist.move(1)
		return m, nil
	}
	cur := func() *api.UserStory {
		if m.uslist.cursor >= 0 && m.uslist.cursor < len(m.usList) {
			return &m.usList[m.uslist.cursor]
		}
		return nil
	}
	switch msg.String() {
	case "esc", "q", "enter":
		m.usOpen = false
		m.status = ""
		return m, nil
	case "a": // accepted
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "accepted", m.usIssueID)
		}
	case "r": // rejected
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "rejected", m.usIssueID)
		}
	case "o": // open (zurücksetzen)
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "open", m.usIssueID)
		}
	}
	return m, nil
}

// focusList liefert die Liste der aktuellen Fokus-Ebene.
func (m *model) focusList() *listState {
	switch m.depth {
	case 0:
		return &m.mlist
	case 1:
		return &m.slist
	default:
		return &m.ilist
	}
}

// onFocusMove hält abhängige Ebenen konsistent + triggert Lazy-Loads.
func (m *model) onFocusMove() tea.Cmd {
	switch m.depth {
	case 0:
		m.slist.reset()
		m.ilist.reset()
		m.slist.setLen(len(m.visSprints()))
		return m.syncSprint()
	case 1:
		m.ilist.reset()
		return m.syncSprint()
	}
	return nil
}

// keyScroll behandelt Scroll-Tasten in den statischen Detail-Views (DD2-25/30):
// i/k/↑↓ zeilenweise, ctrl+d/u + pgdn/pgup seitenweise, g/G an den Anfang/Ende.
// ok=true wenn die Taste als Scroll konsumiert wurde. scrollView klemmt das Maximum.
func (m *model) keyScroll(k string) bool {
	switch k {
	case "up", "k":
		m.scroll--
	case "down", "j":
		m.scroll++
	case "ctrl+d", "pgdown":
		m.scroll += 10
	case "ctrl+u", "pgup":
		m.scroll -= 10
	case "g", "home":
		m.scroll = 0
	case "G", "end":
		m.scroll = 1 << 20 // wird in scrollView auf max geklemmt
	default:
		return false
	}
	if m.scroll < 0 {
		m.scroll = 0
	}
	return true
}

func (m model) keyBacklog(k string) (tea.Model, tea.Cmd) {
	switch navKey(k) {
	case "up":
		m.blist.move(-1)
	case "down":
		m.blist.move(1)
	}
	if k == "b" || k == "esc" {
		m.view = m.topReturn // zurück zur Quell-View (Tree/Columns, DD2-61)
	}
	return m, nil
}
