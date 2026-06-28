package tui

// result.go — Ergebnisfeld-Helfer (I02). Das Cockpit-`r`-Formular sammelt
// outcome_summary/type/commits/vorgehen und baut denselben YAML+Markdown-Block,
// den der MCP-set_result-Pfad schreibt, dann PUT /api/backlog/:id {result}.

import (
	"fmt"
	"strings"
)

// buildResultYAML rendert den strukturierten result-String (Front-Matter + Vorgehen).
func buildResultYAML(summary, outcomeType string, commits []string, vorgehen, issueKey string) string {
	if strings.TrimSpace(outcomeType) == "" {
		outcomeType = "feat"
	}
	var b strings.Builder
	b.WriteString("---\n")
	fmt.Fprintf(&b, "outcome_summary: %s\n", strings.TrimSpace(summary))
	fmt.Fprintf(&b, "outcome_type: %s\n", outcomeType)
	b.WriteString("commits:\n")
	if len(commits) == 0 {
		b.WriteString("  -\n")
	} else {
		for _, c := range commits {
			fmt.Fprintf(&b, "  - %s\n", c)
		}
	}
	b.WriteString("breaking_changes: false\n")
	if issueKey != "" {
		b.WriteString("related_issues:\n")
		fmt.Fprintf(&b, "  - %s\n", issueKey)
	}
	b.WriteString("---\n")
	if v := strings.TrimSpace(vorgehen); v != "" {
		fmt.Fprintf(&b, "\n## Approach\n\n%s\n", v)
	}
	return b.String()
}

// splitCSV zerlegt eine Komma-Liste in getrimmte, nicht-leere Teile.
func splitCSV(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
