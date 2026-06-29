package cmd

import (
	"fmt"

	"devd-cli/internal/output"
	"github.com/charmbracelet/glamour"
	"github.com/spf13/cobra"
)

var sprintCmd = &cobra.Command{Use: "sprint", Short: "Sprint-Kommandos"}

var sprintListCmd = &cobra.Command{
	Use:   "list",
	Short: "Sprints auflisten",
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		status, _ := cmd.Flags().GetString("status")
		sprints, err := c.ListSprints(status)
		if err != nil {
			return err
		}
		output.Print(cmd, sprints, func() {
			rows := make([][]string, len(sprints))
			for i, s := range sprints {
				ms := ""
				if s.MilestoneName != nil {
					ms = *s.MilestoneName
				}
				rows[i] = []string{
					output.Key(s.Key), s.Name, output.ColorStatus(s.Status),
					fmt.Sprintf("%d/%d", s.DoneCount, s.ItemCount), ms,
				}
			}
			output.SimpleTable([]string{"Sprint", "Name", "Status", "Issues", "Milestone"}, rows)
		})
		return nil
	},
}

var sprintShowCmd = &cobra.Command{
	Use:   "show <key|id>",
	Short: "Sprint-Details anzeigen",
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
		output.Print(cmd, s, func() {
			fmt.Printf("\n  %s  %s\n", output.ColorStatus(s.Status), output.Key(s.Key))
			fmt.Printf("  %s\n", s.Name)
			if s.Goal != nil && *s.Goal != "" {
				fmt.Printf("\n  Goal: %s\n", *s.Goal)
			}
			fmt.Printf("\n  Issues: %d / %d done\n\n", s.DoneCount, s.ItemCount)
			if len(s.Items) > 0 {
				rows := make([][]string, len(s.Items))
				for i, it := range s.Items {
					rows[i] = []string{output.Key(it.Key), it.Title, output.ColorStatus(it.Status), it.Type}
				}
				output.SimpleTable([]string{"Key", "Titel", "Status", "Typ"}, rows)
			}
			fmt.Println()
		})
		return nil
	},
}

var sprintContextCmd = &cobra.Command{
	Use:   "context <key|id>",
	Short: "Sprint-Kontext abrufen",
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
		// B02: globales --json/--yaml gewinnt über --format.
		format, _ := cmd.Flags().GetString("format")
		if output.GetFormat(cmd) != output.FormatHuman {
			format = "json"
		}
		raw, err := c.GetSprintContext(id, format)
		if err != nil {
			return err
		}
		if format == "markdown" {
			if rendered, err := glamour.Render(string(raw), "dark"); err == nil {
				fmt.Print(rendered)
				return nil
			}
		}
		fmt.Println(string(raw))
		return nil
	},
}

func init() {
	sprintListCmd.Flags().String("status", "", "Filter nach Status (new, in_progress, to_review, completed)")
	sprintContextCmd.Flags().String("format", "markdown", "Kontext-Format (json|markdown)")
	sprintCmd.AddCommand(sprintListCmd, sprintShowCmd, sprintContextCmd)
	rootCmd.AddCommand(sprintCmd)
}
