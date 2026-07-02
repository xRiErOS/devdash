package cmd

import (
	"encoding/json"
	"fmt"

	"devd-cli/internal/api"
	"devd-cli/internal/api/generated"
	"devd-cli/internal/output"
	"devd-cli/internal/tui"
	"github.com/spf13/cobra"
)

var issueCmd = &cobra.Command{Use: "issue", Short: "Issue commands"}

var issueListCmd = &cobra.Command{
	Use:   "list",
	Short: "List issues",
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		opts := generated.IssueListArgs{}
		if v, _ := cmd.Flags().GetString("status"); v != "" {
			opts.Status = &v
		}
		if v, _ := cmd.Flags().GetString("search"); v != "" {
			opts.Search = &v
		}
		if v, _ := cmd.Flags().GetString("type"); v != "" {
			t := generated.IssueListArgsType(v)
			opts.Type = &t
		}
		if v, _ := cmd.Flags().GetString("sprint"); v != "" {
			opts.SprintKey = &v // IssueList löst Key/id/"null"/"none" selbst auf
		}
		data, err := c.IssueList(opts)
		if err != nil {
			return err
		}
		var issues []api.Issue
		if err := json.Unmarshal(data, &issues); err != nil {
			return err
		}
		output.Print(cmd, issues, func() {
			rows := make([][]string, len(issues))
			for i, it := range issues {
				rows[i] = []string{
					output.Key(it.Key), it.Title, output.ColorStatus(it.Status),
					it.Type, fmt.Sprintf("P%d", it.Priority),
				}
			}
			output.SimpleTable([]string{"Key", "Title", "Status", "Type", "Prio"}, rows)
		})
		return nil
	},
}

var issueShowCmd = &cobra.Command{
	Use:   "show <key|id>",
	Short: "Show issue details",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		id, err := c.ResolveIssueID(args[0])
		if err != nil {
			return err
		}
		it, err := c.GetIssue(id)
		if err != nil {
			return err
		}
		output.Print(cmd, it, func() {
			fmt.Printf("\n  %s  %s\n", output.ColorStatus(it.Status), output.Key(it.Key))
			fmt.Printf("  %s\n", it.Title)
			fmt.Printf("  Type: %s  Prio: P%d\n", it.Type, it.Priority)
			if it.Goal != nil && *it.Goal != "" {
				fmt.Printf("\n  Goal:\n  %s\n", *it.Goal)
			}
			if it.Description != nil && *it.Description != "" {
				fmt.Printf("\n  Description:\n  %s\n", *it.Description)
			}
			fmt.Println()
		})
		return nil
	},
}

var issueStatusCmd = &cobra.Command{
	Use:   "status <key|id> <new-status>",
	Short: "Set issue status",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		id, err := c.ResolveIssueID(args[0])
		if err != nil {
			return err
		}
		it, err := c.SetIssueStatus(id, args[1])
		if err != nil {
			return err
		}
		output.Print(cmd, it, func() {
			fmt.Printf("  %s → %s\n", output.Key(it.Key), output.ColorStatus(it.Status))
		})
		return nil
	},
}

var issueAssignCmd = &cobra.Command{
	Use:   "assign <key|id> <sprint-key|id|->",
	Short: "Promote/move issue into a sprint ('-' = unassign)",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		id, err := c.ResolveIssueID(args[0])
		if err != nil {
			return err
		}
		var sid *int
		if args[1] != "-" {
			s, err := c.ResolveSprintID(args[1])
			if err != nil {
				return err
			}
			sid = &s
		}
		it, err := c.AssignSprint(id, sid)
		if err != nil {
			return err
		}
		output.Print(cmd, it, func() {
			target := "Backlog"
			if it.SprintKey != nil {
				target = *it.SprintKey
			}
			fmt.Printf("  %s → %s (%s)\n", output.Key(it.Key), target, output.ColorStatus(it.Status))
		})
		return nil
	},
}

var issueCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new issue (--title non-interactive, otherwise a form)",
	RunE: func(cmd *cobra.Command, args []string) error {
		var body api.IssueCreateBody
		var stories []string // DD2-66: optionale User-Stories aus dem interaktiven Formular
		if title, _ := cmd.Flags().GetString("title"); title != "" {
			issueType, _ := cmd.Flags().GetString("type")
			priority, _ := cmd.Flags().GetInt("priority")
			body = api.IssueCreateBody{Title: title, Type: issueType, Priority: priority}
			if po, _ := cmd.Flags().GetString("po-notes"); po != "" {
				body.PoNotes = &po
			}
		} else {
			form, us, err := tui.RunIssueCreateForm()
			if err != nil {
				return err
			}
			body = *form
			stories = us
		}
		c, err := resolveClient()
		if err != nil {
			return err
		}
		data, err := c.IssueCreateFull(generated.IssueCreateFullArgs{
			Title:    body.Title,
			Type:     generated.IssueCreateFullArgsType(body.Type),
			Priority: &body.Priority,
			PoNotes:  body.PoNotes,
			TagIds:   body.TagIDs,
		})
		if err != nil {
			return err
		}
		it, err := api.IssueFromCreateFullResult(data)
		if err != nil {
			return err
		}
		for _, s := range stories { // DD2-66: User-Stories nach dem Create anhängen
			if _, err := c.AddUserStory(it.ID, s, ""); err != nil {
				return fmt.Errorf("issue %s created, user story failed: %w", it.Key, err)
			}
		}
		output.Print(cmd, it, func() {
			fmt.Printf("  Created: %s — %s\n", output.Key(it.Key), it.Title)
		})
		return nil
	},
}

func init() {
	issueListCmd.Flags().String("sprint", "", "Filter by sprint key (e.g. DD2#20)")
	issueListCmd.Flags().String("status", "", "Filter by status")
	issueListCmd.Flags().String("search", "", "Full-text search")
	issueListCmd.Flags().String("type", "", "Filter by type (bug|feature|improvement|core)")
	issueCreateCmd.Flags().String("title", "", "Title")
	issueCreateCmd.Flags().String("type", "feature", "Type")
	issueCreateCmd.Flags().Int("priority", 2, "Priority 1-4")
	issueCreateCmd.Flags().String("po-notes", "", "PO-Notes (optional)")
	issueCmd.AddCommand(issueListCmd, issueShowCmd, issueStatusCmd, issueAssignCmd, issueCreateCmd)
	rootCmd.AddCommand(issueCmd)
}
