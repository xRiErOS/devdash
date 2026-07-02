package cmd

import (
	"encoding/json"
	"fmt"

	"devd-cli/internal/api"
	"devd-cli/internal/api/generated"
	"devd-cli/internal/output"

	"github.com/spf13/cobra"
)

var projectCmd = &cobra.Command{Use: "project", Short: "Project commands"}

var projectListCmd = &cobra.Command{
	Use:   "list",
	Short: "List projects",
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		projects, err := c.ListProjects()
		if err != nil {
			return err
		}
		output.Print(cmd, projects, func() {
			rows := make([][]string, len(projects))
			for i, p := range projects {
				rows[i] = []string{
					fmt.Sprintf("%d", p.ID), output.Key(p.Prefix), p.Slug, p.Name,
					fmt.Sprintf("%d", p.SprintCount), fmt.Sprintf("%d", p.BacklogCount),
				}
			}
			output.SimpleTable([]string{"ID", "Prefix", "Slug", "Name", "Sprints", "Backlog"}, rows)
		})
		return nil
	},
}

var projectShowCmd = &cobra.Command{
	Use:   "show <id|slug|prefix>",
	Short: "Show a single project",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		p, err := c.ResolveProject(args[0])
		if err != nil {
			return err
		}
		output.Print(cmd, p, func() {
			fmt.Printf("\n  %s  %s\n  %s\n\n  Sprints: %d   Backlog: %d\n\n",
				output.Key(p.Prefix), p.Slug, p.Name, p.SprintCount, p.BacklogCount)
		})
		return nil
	},
}

var projectCreateCmd = &cobra.Command{
	Use:   "create --slug <slug> --name <name> --prefix <PREFIX>",
	Short: "Create a new project (slug/name/prefix required)",
	RunE: func(cmd *cobra.Command, args []string) error {
		slug, _ := cmd.Flags().GetString("slug")
		name, _ := cmd.Flags().GetString("name")
		prefix, _ := cmd.Flags().GetString("prefix")
		if slug == "" || name == "" || prefix == "" {
			return fmt.Errorf("--slug, --name und --prefix sind Pflicht")
		}
		cargs := generated.ProjectCreateArgs{Slug: slug, Name: name, Prefix: prefix}
		if desc, _ := cmd.Flags().GetString("description"); desc != "" {
			cargs.Description = &desc
		}
		c, err := resolveClient()
		if err != nil {
			return err
		}
		raw, err := c.ProjectCreate(cargs)
		if err != nil {
			return err
		}
		var p api.Project
		if err := json.Unmarshal(raw, &p); err != nil {
			return err
		}
		output.Print(cmd, p, func() {
			fmt.Printf("  Created: %s — %s (%s)\n", output.Key(p.Prefix), p.Name, p.Slug)
		})
		return nil
	},
}

var projectDeleteCmd = &cobra.Command{
	Use:   "delete <id|slug|prefix>",
	Short: "Delete a project (--cascade to tear down its whole child graph)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		c, err := resolveClient()
		if err != nil {
			return err
		}
		p, err := c.ResolveProject(args[0])
		if err != nil {
			return err
		}
		cascade, _ := cmd.Flags().GetBool("cascade")
		if !cascade {
			// Ohne --cascade: "empty-only"-Gate durchreichen (409 wenn nicht leer).
			if _, err := c.ProjectDelete(generated.ProjectDeleteArgs{IdOrSlug: p.ID, Cascade: false}); err != nil {
				return err
			}
			fmt.Printf("  Deleted: %s — %s\n", output.Key(p.Prefix), p.Name)
			return nil
		}
		// Mit --cascade: Preview zeigen, dann Teardown.
		prev, err := c.ProjectDeletePreview(p.ID)
		if err != nil {
			return err
		}
		fmt.Printf("  Cascade-delete %s — %s will remove: %d sprints, %d backlog items, %d milestones, %d tags, %d memories, %d notes, %d todos\n",
			output.Key(p.Prefix), p.Name, prev.Sprints, prev.Backlog, prev.Milestones, prev.Tags, prev.ProjectMemories, prev.UserNotes, prev.Todos)
		if err := c.DeleteProjectCascade(p.ID); err != nil {
			return err
		}
		fmt.Printf("  Deleted (cascade): %s — %s\n", output.Key(p.Prefix), p.Name)
		return nil
	},
}

func init() {
	projectCreateCmd.Flags().String("slug", "", "URL slug (a-z 0-9 -, immutable)")
	projectCreateCmd.Flags().String("name", "", "Display name")
	projectCreateCmd.Flags().String("prefix", "", "Issue-key prefix (2-6 A-Z 0-9, immutable)")
	projectCreateCmd.Flags().String("description", "", "Description (optional)")
	projectDeleteCmd.Flags().Bool("cascade", false, "Tear down the whole project (sprints/issues/milestones/tags/memories/todos/notes)")
	projectCmd.AddCommand(projectListCmd, projectShowCmd, projectCreateCmd, projectDeleteCmd)
	rootCmd.AddCommand(projectCmd)
}
