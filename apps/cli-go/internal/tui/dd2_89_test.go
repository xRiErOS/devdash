package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

// DD2-89: renderTreeDeps zeigt Lade-Hinweis (uncached), "none" (leer) bzw.
// Vorgänger/Nachfolger (gecacht) read-only an.
func TestRenderTreeDeps(t *testing.T) {
	m := columnsModel()
	m.depsCache = map[string]*api.Dependencies{}

	if got := m.depsSectionBody(depCacheKey("m", 1), 60); !strings.Contains(got, "loading") {
		t.Errorf("uncached → want loading-Hinweis, got %q", got)
	}

	m.depsCache[depCacheKey("m", 1)] = &api.Dependencies{}
	if got := m.depsSectionBody(depCacheKey("m", 1), 60); !strings.Contains(got, "none") {
		t.Errorf("leer → want none, got %q", got)
	}

	m.depsCache[depCacheKey("s", 2)] = &api.Dependencies{
		Predecessors: []api.DepEntry{{ID: 9, Name: "Setup"}},
		Successors:   []api.DepEntry{{ID: 10, Name: "Launch"}},
	}
	got := m.depsSectionBody(depCacheKey("s", 2), 60)
	for _, want := range []string{"Predecessors", "Setup", "Successors", "Launch"} {
		if !strings.Contains(got, want) {
			t.Errorf("deps render fehlt %q: %q", want, got)
		}
	}
}

// syncDeps liefert für einen uncached Milestone-Knoten einen Lade-Cmd, für einen
// bereits gecachten nil.
func TestSyncDepsLazyLoads(t *testing.T) {
	m := columnsModel()
	m.depsCache = map[string]*api.Dependencies{}
	m.milestones = []api.Milestone{{ID: 7, Name: "M"}}
	nodes := []treeNode{{kind: tkMile, mileIdx: 0}}
	m.treeCursor = 0
	if cmd := m.syncDeps(nodes); cmd == nil {
		t.Error("uncached Milestone sollte einen Deps-Load-Cmd liefern")
	}
	m.depsCache[depCacheKey("m", 7)] = &api.Dependencies{}
	if cmd := m.syncDeps(nodes); cmd != nil {
		t.Error("gecachter Milestone sollte keinen erneuten Load dispatchen")
	}
}
