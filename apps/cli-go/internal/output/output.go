// Package output rendert One-Shot-Ausgaben: human (lipgloss) oder maschinell
// (JSON/YAML), gesteuert über die globalen --json/--yaml Flags.
package output

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

type Format int

const (
	FormatHuman Format = iota
	FormatJSON
	FormatYAML
)

// GetFormat liest die --json/--yaml Flags (json gewinnt bei beidem).
func GetFormat(cmd *cobra.Command) Format {
	if j, _ := cmd.Flags().GetBool("json"); j {
		return FormatJSON
	}
	if y, _ := cmd.Flags().GetBool("yaml"); y {
		return FormatYAML
	}
	return FormatHuman
}

// Print gibt data als JSON/YAML aus oder ruft humanFn für die Human-Darstellung.
func Print(cmd *cobra.Command, data any, humanFn func()) {
	switch GetFormat(cmd) {
	case FormatJSON:
		b, _ := json.MarshalIndent(data, "", "  ")
		fmt.Println(string(b))
	case FormatYAML:
		b, _ := yaml.Marshal(data)
		fmt.Print(string(b))
	default:
		humanFn()
	}
}
