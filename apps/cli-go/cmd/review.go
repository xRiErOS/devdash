package cmd

import (
	"fmt"
	"strings"

	"devd-cli/internal/output"
	"github.com/spf13/cobra"
)

var reviewCmd = &cobra.Command{
	Use:   "review <sprint-key|id>",
	Short: "to_review-Issues + Readiness eines Sprints",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		id, err := c.ResolveSprintID(args[0])
		if err != nil {
			return err
		}
		s, err := c.GetSprint(id)
		if err != nil {
			return err
		}
		comp, _ := c.SprintCompleteness(id)
		output.Print(cmd, map[string]any{"sprint": s.Key, "items": s.Items}, func() {
			fmt.Printf("\n  Review %s — %s\n", output.Key(s.Key), s.Name)
			if len(comp) > 0 {
				fmt.Printf("  Readiness: %s\n", strings.TrimSpace(string(comp)))
			}
			var rows [][]string
			for _, it := range s.Items {
				rows = append(rows, []string{output.Key(it.Key), it.Title, output.ColorStatus(it.Status)})
			}
			fmt.Println()
			output.SimpleTable([]string{"Key", "Titel", "Status"}, rows)
			fmt.Println()
		})
		return nil
	},
}

var issuePassCmd = &cobra.Command{
	Use:   "pass <key|id>",
	Short: "Issue im Review abnehmen (passed)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		note, _ := cmd.Flags().GetString("note")
		return submitVerdict(cmd, args[0], "passed", "", note)
	},
}

var issueRejectCmd = &cobra.Command{
	Use:   "reject <key|id>",
	Short: "Issue im Review ablehnen (not_passed, Kommentar Pflicht)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		comment, _ := cmd.Flags().GetString("comment")
		if strings.TrimSpace(comment) == "" {
			return fmt.Errorf("--comment ist Pflicht bei reject (not_passed)")
		}
		note, _ := cmd.Flags().GetString("note")
		return submitVerdict(cmd, args[0], "not_passed", comment, note)
	},
}

func submitVerdict(cmd *cobra.Command, ref, verdict, comment, note string) error {
	c, err := resolveClient()
	if err != nil {
		return err
	}
	id, err := c.ResolveIssueID(ref)
	if err != nil {
		return err
	}
	raw, err := c.SubmitReview(id, verdict, comment, note)
	if err != nil {
		return err
	}
	output.Print(cmd, string(raw), func() {
		fmt.Printf("  %s → %s\n", ref, output.ColorStatus(verdictToStatus(verdict)))
	})
	return nil
}

func verdictToStatus(v string) string {
	if v == "passed" {
		return "passed"
	}
	return "rejected"
}

var sprintReviewCmd = &cobra.Command{
	Use:   "review <key|id>",
	Short: "Sprint zur Review stellen (in_progress → to_review)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		id, err := c.ResolveSprintID(args[0])
		if err != nil {
			return err
		}
		s, err := c.SprintTo(id, "to_review")
		if err != nil {
			return err
		}
		output.Print(cmd, s, func() {
			fmt.Printf("  %s → %s\n", output.Key(s.Key), output.ColorStatus(s.Status))
		})
		return nil
	},
}

var sprintCompleteCmd = &cobra.Command{
	Use:   "complete <key|id>",
	Short: "Sprint abschließen (to_review → completed) — PO-exklusiv, DD-186",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		yes, _ := cmd.Flags().GetBool("yes")
		if !yes {
			return fmt.Errorf("Sprint-Abschluss ist PO-exklusiv (DD-186) — bestätige mit --yes")
		}
		c, err := resolveClient()
		if err != nil {
			return err
		}
		id, err := c.ResolveSprintID(args[0])
		if err != nil {
			return err
		}
		s, err := c.SprintTo(id, "completed")
		if err != nil {
			return err
		}
		output.Print(cmd, s, func() {
			fmt.Printf("  %s abgeschlossen → %s\n", output.Key(s.Key), output.ColorStatus(s.Status))
		})
		return nil
	},
}

func init() {
	issuePassCmd.Flags().String("note", "", "Optionale Review-Notiz")
	issueRejectCmd.Flags().String("comment", "", "Ablehnungs-Kommentar (Pflicht)")
	issueRejectCmd.Flags().String("note", "", "Optionale Review-Notiz")
	sprintCompleteCmd.Flags().Bool("yes", false, "PO-Bestätigung für den Abschluss")

	issueCmd.AddCommand(issuePassCmd, issueRejectCmd)
	sprintCmd.AddCommand(sprintReviewCmd, sprintCompleteCmd)
	rootCmd.AddCommand(reviewCmd)
}
