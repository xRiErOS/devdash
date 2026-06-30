package cmd

// DD2-162: Boot-Projekt-Präzedenz env > token > start_project > LastProject > Picker.
// Reine Logik über pickStartupProject (resolve-Closure injiziert, kein Netz).

import (
	"errors"
	"testing"

	"devd-cli/internal/api"
)

func fakeResolve(known map[string]int) func(string) (*api.Project, error) {
	return func(t string) (*api.Project, error) {
		if id, ok := known[t]; ok {
			return &api.Project{ID: id, Slug: t}, nil
		}
		return nil, errors.New("not found: " + t)
	}
}

func TestDD2162_StartupPrecedence(t *testing.T) {
	resolve := fakeResolve(map[string]int{"envp": 1, "tok": 2, "startp": 3, "lastp": 4})

	cases := []struct {
		name                            string
		env, token, startP, lastP, want string
		wantErr                         bool
	}{
		{name: "env wins over all", env: "envp", token: "tok", startP: "startp", lastP: "lastp", want: "env"},
		{name: "token when no env", token: "tok", startP: "startp", lastP: "lastp", want: "token"},
		{name: "start_project when no env/token", startP: "startp", lastP: "lastp", want: "start_project"},
		{name: "last_project only", lastP: "lastp", want: "last_project"},
		{name: "nothing → picker", want: "picker"},
		{name: "invalid env falls through to token", env: "nope", token: "tok", want: "token"},
		{name: "invalid start_project falls to last_project", startP: "nope", lastP: "lastp", want: "last_project"},
		{name: "invalid token = hard error", token: "nope", wantErr: true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, source, err := pickStartupProject(resolve, c.env, c.token, c.startP, c.lastP)
			if c.wantErr {
				if err == nil {
					t.Fatalf("erwartet harter Fehler bei ungültigem token")
				}
				return
			}
			if err != nil {
				t.Fatalf("unerwarteter Fehler: %v", err)
			}
			if source != c.want {
				t.Errorf("source=%q, want %q", source, c.want)
			}
		})
	}
}
