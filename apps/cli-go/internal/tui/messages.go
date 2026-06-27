package tui

import (
	"strings"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// tea.Msg-Typen: async geladene Daten oder Aktions-Ergebnisse.
type errMsg struct{ err error }      // fatal (Lade-Fehler) → Fehlerschirm
type noticeMsg struct{ text string } // transient (Aktions-Fehler/Hinweis) → Sapphire-Zeile
type projectsMsg struct{ items []api.Project }
type milestonesMsg struct{ items []api.Milestone }
type sprintMsg struct{ sprint *api.Sprint }
type backlogMsg struct{ items []api.Issue }
type reviewSprintsMsg struct{ items []api.Sprint }   // T17: offene Review-Sprints
type memoriesMsg struct{ items []api.ProjectMemory } // T18: Memory-Liste
type memDetailMsg struct{ mem *api.ProjectMemory }   // T18: Memory-Detail (content)
type statusMsg struct{ text string }
type userStoriesMsg struct {
	issueID int
	items   []api.UserStory
}

func loadProjects(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		ps, err := c.ListProjects()
		if err != nil {
			return errMsg{err}
		}
		return projectsMsg{ps}
	}
}

func loadMilestones(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

func loadSprint(c *api.Client, id int) tea.Cmd {
	return func() tea.Msg {
		s, err := c.GetSprint(id)
		if err != nil {
			return errMsg{err}
		}
		return sprintMsg{s}
	}
}

// doVerdict reicht ein Review-Verdikt ein und lädt den Sprint neu (optimistic refresh).
// Aktions-Fehler werden als noticeMsg (inline, Sapphire) gemeldet, nicht fatal.
func doVerdict(c *api.Client, issueID int, verdict, comment string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SubmitReview(issueID, verdict, comment, ""); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// doSprintTo wechselt den Sprint-Status. completed läuft über den dedizierten
// /complete-Endpoint (prüft passed-Reviews), sonst PATCH /status.
func doSprintTo(c *api.Client, sprintID int, to string) tea.Cmd {
	return func() tea.Msg {
		var err error
		if to == "completed" {
			_, err = c.SprintComplete(sprintID)
		} else {
			_, err = c.SprintTo(sprintID, to)
		}
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// doMilestoneStatus mutiert den Meilenstein-Status (T01) und lädt die Columns neu.
func doMilestoneStatus(c *api.Client, id int, status string) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetMilestoneStatus(id, status); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// doMilestoneCascadeComplete schließt einen Meilenstein kaskadierend ab (DD2-28):
// offene Sprints → completed, ihre offenen Issues → done. Lädt danach die Columns neu.
func doMilestoneCascadeComplete(c *api.Client, id int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.CompleteMilestoneCascade(id); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// doSetSprintMilestone weist einen Sprint einem Meilenstein zu (nil → lösen, T03)
// und lädt die Columns neu.
func doSetSprintMilestone(c *api.Client, sprintID int, milestoneID *int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetSprintMilestone(sprintID, milestoneID); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// doAssignSprintsToMilestone hängt mehrere Sprints an einen Meilenstein (Flow B, T03).
func doAssignSprintsToMilestone(c *api.Client, sprintIDs []int, milestoneID int) tea.Cmd {
	return func() tea.Msg {
		for _, sid := range sprintIDs {
			mid := milestoneID
			if _, err := c.SetSprintMilestone(sid, &mid); err != nil {
				return noticeMsg{cleanAPIErr(err)}
			}
		}
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// deletePreviewMsg trägt die Cascade-Counts für den Confirm-Dialog (T02b).
type deletePreviewMsg struct {
	kind    string // milestone | sprint
	id      int
	name    string
	sprints int
	issues  int
	docs    int
}

// deleteDoneMsg signalisiert einen erfolgreichen Cascade-Delete (T02b).
type deleteDoneMsg struct {
	kind string
	name string
}

// loadDeletePreview holt die Cascade-Counts (T02b).
func loadDeletePreview(c *api.Client, kind string, id int) tea.Cmd {
	return func() tea.Msg {
		var p *api.DeletePreview
		var err error
		if kind == "milestone" {
			p, err = c.MilestoneDeletePreview(id)
		} else {
			p, err = c.SprintDeletePreview(id)
		}
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		name := p.MilestoneName
		if kind == "sprint" {
			name = p.SprintName
		}
		return deletePreviewMsg{kind, id, name, p.Sprints, p.Issues, p.Documents}
	}
}

// doCascadeDelete führt den Cascade-Delete aus und lädt die Columns neu (T02b).
func doCascadeDelete(c *api.Client, kind string, id int, name string) tea.Cmd {
	return func() tea.Msg {
		var err error
		if kind == "milestone" {
			err = c.DeleteMilestoneCascade(id)
		} else {
			err = c.DeleteSprintCascade(id)
		}
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return deleteDoneMsg{kind, name}
	}
}

// unassignedSprintsMsg trägt die Sprints ohne Meilenstein (Flow B, T03).
type unassignedSprintsMsg struct{ items []api.Sprint }

// loadUnassignedSprints holt alle Sprints und filtert die ohne Meilenstein.
func loadUnassignedSprints(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		all, err := c.ListSprints("")
		if err != nil {
			return errMsg{err}
		}
		var out []api.Sprint
		for _, s := range all {
			if s.MilestoneID == nil {
				out = append(out, s)
			}
		}
		return unassignedSprintsMsg{out}
	}
}

// doRework fährt ein Issue über die Lifecycle-Kette nach to_review (z.B.
// passed→planned→in_progress→to_review). Beim Erreichen von to_review öffnet das
// Backend (maybeAutoOpenReworkRound) bei letztem not_passed-Verdikt eine frische
// pending-Runde UND resettet den Sprint-Review-Marker → entsperrt a:pass.
func doRework(c *api.Client, issueID int, path []string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		for _, st := range path {
			if _, err := c.SetIssueStatus(issueID, st); err != nil {
				return noticeMsg{"Rework bei →" + st + ": " + cleanAPIErr(err)}
			}
		}
		s, err := c.GetSprint(sprintID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return reworkDoneMsg{s}
	}
}

// reworkDoneMsg signalisiert erfolgreiches Rework (Sprint neu + Hinweis).
type reworkDoneMsg struct{ sprint *api.Sprint }

// doReopen öffnet eine entschiedene Review-Runde erneut und lädt neu.
func doReopen(c *api.Client, issueID, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.ReopenReview(issueID); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// doStatus mutiert den Lifecycle-Status eines Issues (auch to_review-Override).
func doStatus(c *api.Client, issueID int, status string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetIssueStatus(issueID, status); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// doSetResult schreibt das Ergebnisfeld (I02) und lädt den Sprint neu, damit der
// Ergebnis-Dot im Cockpit sofort grün wird.
func doSetResult(c *api.Client, issueID int, result string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.UpdateIssue(issueID, map[string]any{"result": result}); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// loadUserStories holt die User-Stories eines Issues (für das Abnahme-Modal).
func loadUserStories(c *api.Client, issueID int) tea.Cmd {
	return func() tea.Msg {
		us, err := c.ListUserStories(issueID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return userStoriesMsg{issueID, us}
	}
}

// doUSVerdict setzt ein User-Story-Verdikt und lädt die Liste neu.
func doUSVerdict(c *api.Client, usID int, verdict string, issueID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetUserStoryVerdict(usID, verdict); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		us, err := c.ListUserStories(issueID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return userStoriesMsg{issueID, us}
	}
}

// createdMsg signalisiert eine erfolgreiche Anlage (Command-Center, T16).
// kind ∈ {issue, milestone, sprint} steuert den Folge-Reload.
type createdMsg struct {
	kind  string
	label string
}

// doCreateIssue legt ein Issue an (Command-Center). Fehler → Sapphire-Hinweis.
func doCreateIssue(c *api.Client, body api.IssueCreateBody) tea.Cmd {
	return func() tea.Msg {
		it, err := c.CreateIssue(body)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return createdMsg{"issue", it.Key + " " + it.Title}
	}
}

// doCreateMilestone legt einen Meilenstein an (Command-Center).
func doCreateMilestone(c *api.Client, body api.MilestoneCreateBody) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.CreateMilestone(body)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return createdMsg{"milestone", ms.Name}
	}
}

// doCreateSprint legt einen Sprint an (Command-Center).
func doCreateSprint(c *api.Client, body api.SprintCreateBody) tea.Cmd {
	return func() tea.Msg {
		s, err := c.CreateSprint(body)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return createdMsg{"sprint", s.Name}
	}
}

// doCreateMemory legt ein Project-Memory an (Command-Center, T18).
func doCreateMemory(c *api.Client, body api.ProjectMemoryCreateBody) tea.Cmd {
	return func() tea.Msg {
		mem, err := c.CreateProjectMemory(body)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return createdMsg{"memory", mem.Summary}
	}
}

// loadMemories liefert die Compact-Memory-Liste (T18), optional kategorie-gefiltert.
func loadMemories(c *api.Client, category string) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.ListProjectMemories(category)
		if err != nil {
			return errMsg{err}
		}
		return memoriesMsg{ms}
	}
}

// searchMemoriesCmd durchsucht die Memories (Volltext + Kategorie, T18).
func searchMemoriesCmd(c *api.Client, q, category string) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.SearchProjectMemories(q, category, 50)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return memoriesMsg{ms}
	}
}

// loadMemDetail holt ein Memory-Detail inkl. content (T18).
func loadMemDetail(c *api.Client, id int) tea.Cmd {
	return func() tea.Msg {
		mem, err := c.GetProjectMemory(id)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return memDetailMsg{mem}
	}
}

// refreshSprint lädt den Sprint neu (gemeinsam von Aktions-Cmds genutzt).
func refreshSprint(c *api.Client, sprintID int) tea.Msg {
	s, err := c.GetSprint(sprintID)
	if err != nil {
		return noticeMsg{cleanAPIErr(err)}
	}
	return sprintMsg{s}
}

// cleanAPIErr kürzt die rohe API-Fehlermeldung auf das error-Feld.
func cleanAPIErr(err error) string {
	msg := err.Error()
	if i := strings.Index(msg, `"error":"`); i >= 0 {
		rest := msg[i+len(`"error":"`):]
		if j := strings.Index(rest, `"`); j >= 0 {
			return rest[:j]
		}
	}
	return msg
}

// loadReviewSprints liefert die offenen Review-Sprints (status=review). Mehrere
// Sprints können gleichzeitig im Review-Zyklus stehen (T17: R entkoppelt).
func loadReviewSprints(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		sp, err := c.ListSprints("review")
		if err != nil {
			return errMsg{err}
		}
		return reviewSprintsMsg{sp}
	}
}

// loadBacklog liefert das echte Backlog: status=new ODER (status=planned UND
// kein Sprint). Zwei Queries, gemerged + nach id dedupliziert.
func loadBacklog(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		neu, err := c.ListIssues(api.IssueListOpts{Status: "new"})
		if err != nil {
			return errMsg{err}
		}
		planned, err := c.ListIssues(api.IssueListOpts{Status: "planned", SprintID: "null"})
		if err != nil {
			return errMsg{err}
		}
		seen := map[int]bool{}
		var out []api.Issue
		for _, it := range append(neu, planned...) {
			if seen[it.ID] {
				continue
			}
			seen[it.ID] = true
			out = append(out, it)
		}
		return backlogMsg{out}
	}
}
