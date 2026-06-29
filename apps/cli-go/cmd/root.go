package cmd

import (
	"os"
	"strconv"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/config"
	"devd-cli/internal/tui"
	"github.com/spf13/cobra"
)

var (
	flagJSON    bool
	flagYAML    bool
	flagProject string
)

var rootCmd = &cobra.Command{
	Use:   "dd",
	Short: "DevDashboard CLI",
	Long: "Sprint, issue, review and project commands against the DevDash API.\n\n" +
		"Without a subcommand the interactive TUI starts (coming in phase 2).",
	SilenceUsage:  true,
	SilenceErrors: true, // main gibt den Fehler aus — kein doppeltes "Error:"
}

// knownSubcommands sind die Verben, die an Cobra gehen. Alles andere als erstes
// Nicht-Flag-Argument wird als Projekt-Slug/Prefix interpretiert → TUI.
var knownSubcommands = map[string]bool{
	"sprint": true, "issue": true, "review": true, "tui": true,
	"help": true, "completion": true, "__complete": true, "__completeNoDesc": true,
}

func firstNonFlag(args []string) string {
	for _, a := range args {
		if !strings.HasPrefix(a, "-") {
			return a
		}
	}
	return ""
}

func init() {
	rootCmd.PersistentFlags().BoolVar(&flagJSON, "json", false, "Output as JSON")
	rootCmd.PersistentFlags().BoolVar(&flagYAML, "yaml", false, "Output as YAML")
	rootCmd.PersistentFlags().StringVar(&flagProject, "project", "", "Project ID, slug or prefix (overrides DEVD_PROJECT_ID)")
}

// Execute ist der Einstiegspunkt aus main. Dispatch: bare `dd` oder
// `dd <slug|prefix>` (kein bekanntes Subcommand, kein Help/Version-Flag) → TUI;
// sonst Cobra-One-Shot.
func Execute() error {
	args := os.Args[1:]
	for _, a := range args {
		if a == "-h" || a == "--help" || a == "--version" {
			return rootCmd.Execute()
		}
	}
	first := firstNonFlag(args)
	if first == "" && len(args) == 0 {
		return runTUI("")
	}
	if first != "" && !knownSubcommands[first] {
		return runTUI(first)
	}
	return rootCmd.Execute()
}

func runTUI(token string) error {
	global := api.NewClient("")
	if token == "" {
		if st, err := config.Load(); err == nil && st.LastProject != "" {
			if p, err := global.ResolveProject(st.LastProject); err == nil {
				return tui.Run(api.NewClient(strconv.Itoa(p.ID)), p, global)
			}
		}
		return tui.Run(nil, nil, global) // Picker
	}
	p, err := global.ResolveProject(token)
	if err != nil {
		return err
	}
	return tui.Run(api.NewClient(strconv.Itoa(p.ID)), p, global)
}
