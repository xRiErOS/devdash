package cmd

import (
	"fmt"
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
	p, err := resolveStartupProject(global, token)
	if err != nil {
		return err
	}
	if p == nil {
		return tui.Run(nil, nil, global) // Picker
	}
	return tui.Run(api.NewClient(strconv.Itoa(p.ID)), p, global)
}

// resolveStartupProject wählt das Boot-Projekt nach DD2-162-Präzedenz. Sammelt die
// vier Quellen (env, token, config start_project, state.json LastProject) und
// delegiert die reine Präzedenz-Logik an pickStartupProject.
func resolveStartupProject(global *api.Client, token string) (*api.Project, error) {
	cfg, _ := config.LoadSettings()
	st, _ := config.Load()
	p, _, err := pickStartupProject(global.ResolveProject,
		os.Getenv("DEVD_START_PROJECT"), token, cfg.StartProject, st.LastProject)
	return p, err
}

// pickStartupProject ist die reine DD2-162-Präzedenz (FS-/Netz-frei via resolve-
// Closure, daher testbar). Reihenfolge:
// env DEVD_START_PROJECT > token (--project/positional) > start_project > LastProject
// > nil (Projekt-Picker). source = die gewinnende Quelle bzw. "picker".
// Ungültige env/start_project/LastProject fallen STILL durch (stderr-Hinweis,
// US-167 „Resolve-Fail → Picker-Fallback"). Ein explizit übergebener, ungültiger
// token bleibt ein harter Fehler (Tippfehler-Schutz, bisheriges Verhalten).
func pickStartupProject(resolve func(string) (*api.Project, error), env, token, startProject, lastProject string) (*api.Project, string, error) {
	warn := func(src, val string) {
		fmt.Fprintf(os.Stderr, "devd-cli: %s %q could not be resolved — falling back\n", src, val)
	}
	if env = strings.TrimSpace(env); env != "" {
		if p, err := resolve(env); err == nil {
			return p, "env", nil
		}
		warn("DEVD_START_PROJECT", env)
	}
	if token = strings.TrimSpace(token); token != "" {
		p, err := resolve(token) // explizit → harter Fehler bei ungültig
		if err != nil {
			return nil, "", err
		}
		return p, "token", nil
	}
	if startProject = strings.TrimSpace(startProject); startProject != "" {
		if p, err := resolve(startProject); err == nil {
			return p, "start_project", nil
		}
		warn("start_project", startProject)
	}
	if lastProject = strings.TrimSpace(lastProject); lastProject != "" {
		if p, err := resolve(lastProject); err == nil {
			return p, "last_project", nil
		}
		warn("last_project", lastProject)
	}
	return nil, "picker", nil
}
