package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/clip"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
)

func (m model) yankContext() (tea.Model, tea.Cmd) {
	switch m.depth {
	case 0:
		if ms := m.selMilestone(); ms != nil {
			if err := clip.Copy(milestoneClip(ms)); err != nil {
				m.errNote = "Clipboard-Fehler: " + err.Error()
			} else {
				m.errNote = ""
				return m.showToast(toastInfo, "Milestone context copied ("+ms.Name+")", "", nil, false)
			}
		}
	case 1:
		// DD2-215: vollständigen Sprint-Kontext (Issues + Docs + ID) async fetchen.
		if s := m.selSprint(); s != nil {
			m, toastCmd := m.showToast(toastInfo, "copying sprint context …", "", nil, false)
			return m, tea.Batch(doSprintYank(m.client, s.ID, s.Key), toastCmd)
		}
	default:
		return m.showToast(toastWarn, "Yank: on milestone (sprints) or sprint (issues) — h back", "", nil, false)
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
	if m.statusPick {
		return m.keyStatusPick(msg)
	}
	if m.sprintPick {
		return m.keySprintPick(msg)
	}

	// DD2-67 Rework #3: Ziffer toggelt die offene Accordion-Section im Detail-Pane
	// (exklusiv, gleiche Logik wie der Tree-View). Scroll wird zurückgesetzt.
	if k := msg.String(); len(k) == 1 && k[0] >= '1' && k[0] <= '9' {
		d := int(k[0] - '0')
		if m.accOpen == d {
			m.accOpen = 0
		} else {
			m.accOpen = d
		}
		m.scroll = 0
		return m, nil
	}

	// DD2-67: Detail-Pane scrollen (langes Issue) — seitenweise, ohne die
	// Master-Selektion zu verschieben. i/k/↑↓ bleiben Listen-Navigation.
	switch msg.String() {
	case "ctrl+d", "ctrl+u", "pgdown", "pgup":
		m.keyScroll(msg.String())
		return m, nil
	}

	switch navKey(msg.String()) {
	case "up":
		m.rlist.move(-1)
		m.scroll = 0 // frisch gewähltes Issue startet oben im Detail-Pane
		return m, nil
	case "down":
		m.rlist.move(1)
		m.scroll = 0
		return m, nil
	}

	it := m.reviewItem()
	switch { // DD2-174: key.Matches; S (Sprint-Status) bleibt literal — keine Keymap-Bindung (Q-flag PO)
	case keybind.Matches(msg, keys.Back), msg.String() == "q":
		// B01: Columns nach Review immer neu laden — Verdikte/Status-Mutationen
		// im Cockpit ändern m.curSprint, aber m.milestones (Columns) blieb stale.
		if m.reviewReturn == viewNavigateReviews {
			m.view = viewNavigateReviews
			return m, tea.Batch(loadReviewSprints(m.client), loadMilestones(m.client))
		}
		m.view = viewBrowseProject // DD2-111: Cockpit-q/esc → Tree-Primat (Ranger gesunset)
		return m, loadMilestones(m.client)
	case keybind.Matches(msg, keys.Enter): // Issue-Abnahme-Modal: goal/background/User-Stories abhaken
		if it == nil {
			return m, nil
		}
		m.usOpen = true
		m.usIssueID = it.ID
		m.usList = nil
		m.uslist = listState{}
		return m, loadUserStories(m.client, it.ID)
	case keybind.Matches(msg, keys.Status): // Issue-Status manuell mutieren — nur lifecycle-gültige Ziele
		sid := 0
		if m.curSprint != nil {
			sid = m.curSprint.ID
		}
		return m.openIssueStatus(it, sid)
	case keybind.Matches(msg, keys.ReviewPass): // Pass — Backend erlaubt Verdikt unabhängig vom Issue-Status
		// (autoSetPassedOnReviewPass setzt to_review/rejected→passed). Edit-Lock
		// (submitted Sprint + entschiedene Runde) kommt als Sapphire-Hinweis zurück.
		if it == nil {
			return m, nil
		}
		m, toastCmd := m.showToast(toastInfo, "Pass gesendet …", "", nil, false)
		return m, tea.Batch(doVerdict(m.client, it.ID, "passed", "", m.curSprint.ID), toastCmd)
	case keybind.Matches(msg, keys.ReviewReject): // Reject — DD2-119: mehrzeiliges Kommentar-Modal (US-50) statt Footer-Eingabe
		if it == nil {
			return m, nil
		}
		m.rejectIssueID = it.ID
		m.rejectIssueKey = it.Key
		if m.curSprint != nil {
			m.rejectSprintID = m.curSprint.ID
		}
		return m.openForm("reject")
	case keybind.Matches(msg, keys.ReviewReopen): // Reopen — direkt aus to_review/passed/rejected (DD2-7). Löst den
		// Deadlock (passed + letztes Verdikt not_passed) ohne den w:Rework-
		// Mehrschritt; das Backend öffnet eine frische pending-Runde + Marker-Reset.
		if it == nil {
			return m, nil
		}
		if !reviewReopenable(it.Status) {
			return m.showToast(toastWarn, "Reopen only from to_review/passed/rejected — otherwise w (rework)", "", nil, false)
		}
		m, toastCmd := m.showToast(toastInfo, "Reopen gesendet …", "", nil, false)
		return m, tea.Batch(doReopen(m.client, it.ID, m.curSprint.ID), toastCmd)
	case keybind.Matches(msg, keys.ReviewRework): // Rework: Issue über die Lifecycle-Kette nach to_review (entsperrt
		// re-Review bei Edit-Lock / status≠to_review, z.B. passed mit not_passed-Verdikt)
		if it == nil {
			return m, nil
		}
		path := reworkPath(it.Status)
		if len(path) == 0 {
			return m.showToast(toastWarn, "Issue ist bereits to_review", "", nil, false)
		}
		m, toastCmd := m.showToast(toastInfo, "Rework: "+it.Status+" → "+strings.Join(path, " → ")+" …", "", nil, false)
		return m, tea.Batch(doRework(m.client, it.ID, path, m.curSprint.ID), toastCmd)
	case keybind.Matches(msg, keys.Yank): // DD2-121: Review-Stand als Markdown in die Zwischenablage (auch vor Abschluss)
		if m.curSprint == nil {
			return m, nil
		}
		if err := clip.Copy(m.reviewStandClip()); err != nil {
			m.errNote = "Clipboard-Fehler: " + err.Error()
			return m, nil
		}
		m.errNote = ""
		return m.showToast(toastInfo, fmt.Sprintf("Review state copied (%s, %d issues)", m.curSprint.Key, len(m.curSprint.Items)), "", nil, false)
	case msg.String() == "H": // DD2-105: Sprint-Review-Handover-Artefakt (aktionsfähiges Markdown) yanken.
		// DD2-174 Q-flag: H hat keine Keymap-Bindung — literal beibehalten (wie Cockpit-S).
		if m.curSprint == nil {
			return m, nil
		}
		if err := clip.Copy(m.reviewHandoverClip()); err != nil {
			m.errNote = "Clipboard-Fehler: " + err.Error()
			return m, nil
		}
		m.errNote = ""
		return m.showToast(toastInfo, fmt.Sprintf("Review handover copied (%s)", m.curSprint.Key), "", nil, false)
	case keybind.Matches(msg, keys.ReviewPass2): // DD2-44: Review-Pass markieren (review_submitted_at) — „Review-Durchgang
		// fertig"-Marker. Backend ist idempotent; entsperrt keinen Auto-Close.
		if m.curSprint == nil {
			return m, nil
		}
		m, toastCmd := m.showToast(toastInfo, "Marking review pass …", "", nil, false)
		return m, tea.Batch(doReviewSubmit(m.client, m.curSprint.ID), toastCmd)
	case msg.String() == "S": // Sprint-Status-Menü: zeigt gültige Sprint-Transitions.
		// DD2-174 Q-flag: S hat keine Keymap-Bindung (S=Sort global, im Cockpit ungenutzt) —
		// literal beibehalten, bis PO eine eigene Bindung entscheidet.
		if m.curSprint == nil {
			return m, nil
		}
		return m.openSprintStatus(m.curSprint.ID, m.curSprint.Status)
	case keybind.Matches(msg, keys.SprintComplete): // Sprint abschließen — nur wenn review
		if m.curSprint == nil {
			return m, nil
		}
		if m.curSprint.Status != "to_review" {
			return m.showToast(toastWarn, "Completion only from to_review (sprint is: "+m.curSprint.Status+") — first S", "", nil, false)
		}
		if !m.confirmComplete {
			m.confirmComplete = true
			return m.showToast(toastWarn, "Complete sprint? Press C again to confirm (PO/DD-186)", "", nil, false)
		}
		m.confirmComplete = false
		m, toastCmd := m.showToast(toastInfo, "Completing sprint …", "", nil, false)
		// DD2-45: nach dem Complete automatisch den Ergebnis-Handover (rev-results)
		// in die Zwischenablage yanken — kein manueller Wechsel zur rev-results-Seite.
		return m, tea.Batch(doSprintComplete(m.client, m.curSprint.ID), toastCmd)
	}
	return m, nil
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
	switch { // DD2-174: s (Status) öffnet/schließt das Menü
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Status), msg.String() == "q":
		m.statusPick = false
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		m.statusPick = false
		if m.stIssueID == 0 || m.smenu.cursor < 0 || m.smenu.cursor >= len(m.sopts) {
			return m, nil
		}
		target := m.sopts[m.smenu.cursor]
		m, toastCmd := m.showToast(toastInfo, "Status → "+target+" …", "", nil, false)
		return m, tea.Batch(doStatus(m.client, m.stIssueID, target, m.stSprintID), toastCmd)
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
	case "passed", "completed":
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
	switch { // DD2-174: s/S (Columns s / Cockpit S) öffnen dieses Menü → beide schließen
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Status), msg.String() == "S", msg.String() == "q":
		m.sprintPick = false
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		m.sprintPick = false
		if m.spTargetID == 0 || m.spmenu.cursor < 0 || m.spmenu.cursor >= len(m.spopts) {
			return m, nil
		}
		target := m.spopts[m.spmenu.cursor]
		m, toastCmd := m.showToast(toastInfo, "Sprint → "+target+" …", "", nil, false)
		// doSprintTo aktualisiert curSprint (Cockpit); loadMilestones hält die
		// Ranger-Columns frisch (Status im Sprint-Pane), egal von wo getriggert.
		return m, tea.Batch(
			doSprintTo(m.client, m.spTargetID, target), // completed → /complete (gated)
			loadMilestones(m.client),
			toastCmd,
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
	switch { // DD2-174: a=accept, x=reject (D04, war r), o=reset
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Enter), msg.String() == "q":
		m.usOpen = false
		return m, nil
	case keybind.Matches(msg, keys.StoryAccept): // accepted (a)
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "accepted", m.usIssueID)
		}
	case keybind.Matches(msg, keys.StoryReject): // rejected (x, war r — D04)
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "rejected", m.usIssueID)
		}
	case keybind.Matches(msg, keys.StoryReset): // open / zurücksetzen (o)
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "open", m.usIssueID)
		}
	}
	return m, nil
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

// keyBacklog → view_browse_backlog.go (DD2-32 Master-Detail).
