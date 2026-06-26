package tui

import (
	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// tea.Msg-Typen: async geladene Daten oder Aktions-Ergebnisse.
type errMsg struct{ err error }
type projectsMsg struct{ items []api.Project }
type milestonesMsg struct{ items []api.Milestone }
type sprintMsg struct{ sprint *api.Sprint }
type backlogMsg struct{ items []api.Issue }
type statusMsg struct{ text string }

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
func doVerdict(c *api.Client, issueID int, verdict, comment string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SubmitReview(issueID, verdict, comment, ""); err != nil {
			return errMsg{err}
		}
		s, err := c.GetSprint(sprintID)
		if err != nil {
			return errMsg{err}
		}
		return sprintMsg{s}
	}
}

// doSprintTo wechselt den Sprint-Status (review/active/completed) und lädt neu.
func doSprintTo(c *api.Client, sprintID int, to string) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SprintTo(sprintID, to); err != nil {
			return errMsg{err}
		}
		s, err := c.GetSprint(sprintID)
		if err != nil {
			return errMsg{err}
		}
		return sprintMsg{s}
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
