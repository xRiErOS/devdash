package cmd

import (
	"fmt"
	"os"
	"strconv"

	"devd-cli/internal/api"
	"devd-cli/internal/config"
)

// resolveClient baut einen API-Client mit aufgelöstem Projekt-Scope.
// Reihenfolge: --project (slug|prefix|id) > DEVD_PROJECT_ID > state.json > Fehler.
func resolveClient() (*api.Client, error) {
	if flagProject != "" {
		if _, err := strconv.Atoi(flagProject); err == nil {
			return api.NewClient(flagProject), nil
		}
		p, err := api.NewClient("").ResolveProject(flagProject)
		if err != nil {
			return nil, err
		}
		return api.NewClient(strconv.Itoa(p.ID)), nil
	}
	if os.Getenv("DEVD_PROJECT_ID") != "" {
		return api.NewClient(""), nil
	}
	if st, err := config.Load(); err == nil && st.LastProject != "" {
		if p, err := api.NewClient("").ResolveProject(st.LastProject); err == nil {
			return api.NewClient(strconv.Itoa(p.ID)), nil
		}
	}
	return nil, fmt.Errorf("kein Projekt gewählt — nutze --project <slug|prefix|id> oder setze DEVD_PROJECT_ID")
}
