package cmd

import (
	"strconv"

	"devd-cli/internal/api"
	"devd-cli/internal/tui"
	"github.com/spf13/cobra"
)

var tuiCmd = &cobra.Command{
	Use:   "tui [project]",
	Short: "Start interactive TUI (milestone → sprint → issue)",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		global := api.NewClient("")
		token := flagProject
		if len(args) > 0 {
			token = args[0]
		}
		// DD2-162: Präzedenz env > token > config start_project > LastProject > Picker.
		p, err := resolveStartupProject(global, token)
		if err != nil {
			return err
		}
		if p == nil {
			return tui.Run(nil, nil, global) // Picker zuerst
		}
		return tui.Run(api.NewClient(strconv.Itoa(p.ID)), p, global)
	},
}

func init() {
	rootCmd.AddCommand(tuiCmd)
}
