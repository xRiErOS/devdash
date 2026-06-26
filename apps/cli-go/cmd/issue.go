package cmd

import (
	"fmt"

	"devd-cli/internal/api"
	"devd-cli/internal/output"
	"devd-cli/internal/tui"
	"github.com/spf13/cobra"
)

var issueCmd = &cobra.Command{Use: "issue", Short: "Issue-Kommandos"}

var issueListCmd = &cobra.Command{
	Use:   "list",
	Short: "Issues auflisten",
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		opts := api.IssueListOpts{}
		opts.Status, _ = cmd.Flags().GetString("status")
		opts.Search, _ = cmd.Flags().GetString("search")
		opts.Type, _ = cmd.Flags().GetString("type")
		if sprint, _ := cmd.Flags().GetString("sprint"); sprint != "" {
			sid, err := c.ResolveSprintID(sprint)
			if err != nil {
				return err
			}
			opts.SprintID = fmt.Sprintf("%d", sid)
		}
		issues, err := c.ListIssues(opts)
		if err != nil {
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
			output.SimpleTable([]string{"Key", "Titel", "Status", "Typ", "Prio"}, rows)
		})
		return nil
	},
}

var issueShowCmd = &cobra.Command{
	Use:   "show <key|id>",
	Short: "Issue-Details anzeigen",
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
			fmt.Printf("  Typ: %s  Prio: P%d\n", it.Type, it.Priority)
			if it.Goal != nil && *it.Goal != "" {
				fmt.Printf("\n  Goal:\n  %s\n", *it.Goal)
			}
			if it.Description != nil && *it.Description != "" {
				fmt.Printf("\n  Beschreibung:\n  %s\n", *it.Description)
			}
			fmt.Println()
		})
		return nil
	},
}

var issueStatusCmd = &cobra.Command{
	Use:   "status <key|id> <new-status>",
	Short: "Issue-Status setzen",
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
	Short: "Issue in Sprint promoten/verschieben ('-' = unassign)",
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
	Short: "Neues Issue erstellen (--title non-interaktiv, sonst Formular)",
	RunE: func(cmd *cobra.Command, args []string) error {
		var body api.IssueCreateBody
		if title, _ := cmd.Flags().GetString("title"); title != "" {
			issueType, _ := cmd.Flags().GetString("type")
			priority, _ := cmd.Flags().GetInt("priority")
			body = api.IssueCreateBody{Title: title, Type: issueType, Priority: priority}
			if desc, _ := cmd.Flags().GetString("description"); desc != "" {
				body.Description = &desc
			}
		} else {
			form, err := tui.RunIssueCreateForm()
			if err != nil {
				return err
			}
			body = *form
		}
		c, err := resolveClient()
		if err != nil {
			return err
		}
		it, err := c.CreateIssue(body)
		if err != nil {
			return err
		}
		output.Print(cmd, it, func() {
			fmt.Printf("  Erstellt: %s — %s\n", output.Key(it.Key), it.Title)
		})
		return nil
	},
}

func init() {
	issueListCmd.Flags().String("sprint", "", "Filter nach Sprint-Key (z.B. DD2#20)")
	issueListCmd.Flags().String("status", "", "Filter nach Status")
	issueListCmd.Flags().String("search", "", "Volltextsuche")
	issueListCmd.Flags().String("type", "", "Filter nach Typ (bug|feature|improvement|core)")
	issueCreateCmd.Flags().String("title", "", "Titel")
	issueCreateCmd.Flags().String("type", "feature", "Typ")
	issueCreateCmd.Flags().Int("priority", 2, "Priorität 1-4")
	issueCreateCmd.Flags().String("description", "", "Beschreibung (optional)")
	issueCmd.AddCommand(issueListCmd, issueShowCmd, issueStatusCmd, issueAssignCmd, issueCreateCmd)
	rootCmd.AddCommand(issueCmd)
}
