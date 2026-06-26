package cmd

import (
	"fmt"

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
	Long: "Sprint-, Issue-, Review- und Projekt-Kommandos gegen die DevDash API.\n\n" +
		"Ohne Subcommand startet die interaktive TUI (folgt in Phase 2).",
	SilenceUsage: true,
	// Bare `dd` (kein Subcommand) → TUI. Dispatch one-shot-vs-TUI wird in Task 15
	// verdrahtet (Leading-Slug-Erkennung, ResolveProject). Vorerst Phase-2-Stub.
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("dd: TUI folgt in Phase 2 — nutze vorerst die Subcommands (dd --help).")
		return nil
	},
}

func init() {
	rootCmd.PersistentFlags().BoolVar(&flagJSON, "json", false, "Output als JSON")
	rootCmd.PersistentFlags().BoolVar(&flagYAML, "yaml", false, "Output als YAML")
	rootCmd.PersistentFlags().StringVar(&flagProject, "project", "", "Projekt-ID, Slug oder Prefix (überschreibt DEVD_PROJECT_ID)")
}

// Execute ist der Einstiegspunkt aus main.
func Execute() error {
	return rootCmd.Execute()
}
