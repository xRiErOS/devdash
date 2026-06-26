package tui

import (
	"strings"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// tea.Msg-Typen: async geladene Daten oder Aktions-Ergebnisse.
type errMsg struct{ err error }       // fatal (Lade-Fehler) → Fehlerschirm
type noticeMsg struct{ text string }  // transient (Aktions-Fehler/Hinweis) → Sapphire-Zeile
type projectsMsg struct{ items []api.Project }
type milestonesMsg struct{ items []api.Milestone }
type sprintMsg struct{ sprint *api.Sprint }
type backlogMsg struct{ items []api.Issue }
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
