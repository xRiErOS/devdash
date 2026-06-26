// Package tui hält die interaktiven Bubble-Tea/huh-Oberflächen. create.go ist
// das Issue-Create-Formular (One-Shot-Fallback + Phase-2-Wiederverwendung).
package tui

import (
	"fmt"
	"strconv"

	"devd-cli/internal/api"
	"github.com/charmbracelet/huh"
)

// RunIssueCreateForm zeigt ein interaktives Formular und liefert den Create-Body.
func RunIssueCreateForm() (*api.IssueCreateBody, error) {
	body := &api.IssueCreateBody{Type: "feature", Priority: 2}
	var desc, typeStr, prioStr = "", "feature", "2"

	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Titel").
				Placeholder("Kurze Beschreibung des Issues").
				Value(&body.Title).
				Validate(func(s string) error {
					if s == "" {
						return fmt.Errorf("Titel darf nicht leer sein")
					}
					return nil
				}),
			huh.NewSelect[string]().
				Title("Typ").
				Options(
					huh.NewOption("Feature", "feature"),
					huh.NewOption("Bug", "bug"),
					huh.NewOption("Improvement", "improvement"),
					huh.NewOption("Core", "core"),
				).
				Value(&typeStr),
			huh.NewSelect[string]().
				Title("Priorität").
				Options(
					huh.NewOption("P1 — Kritisch", "1"),
					huh.NewOption("P2 — Hoch", "2"),
					huh.NewOption("P3 — Mittel", "3"),
					huh.NewOption("P4 — Niedrig", "4"),
				).
				Value(&prioStr),
			huh.NewText().Title("Beschreibung (optional)").Value(&desc),
		),
	)

	if err := form.Run(); err != nil {
		return nil, err
	}

	body.Type = typeStr
	if p, err := strconv.Atoi(prioStr); err == nil {
		body.Priority = p
	}
	if desc != "" {
		body.Description = &desc
	}
	return body, nil
}
