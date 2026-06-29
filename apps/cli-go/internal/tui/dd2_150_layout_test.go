package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// DD2-150: Backlog-View — Issue-Pane 1fr, Detail-Pane 2fr, dynamisch an der
// Terminalbreite. backlogLayout delegiert an den geteilten masterDetailWidths-Helper
// (vorher: auf layout.tree_width gepinnte fixe schmale Spalte).
func TestDD2150_BacklogPaneRatio(t *testing.T) {
	m := model{view: viewBacklog, width: 120, height: 30, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	_, _, lw, rw, _ := m.backlogLayout()

	// Delegation: identisch zu masterDetailWidths (Single-Source mit Memory/Search).
	wantLw, wantRw := m.masterDetailWidths(m.termWidth())
	if lw != wantLw || rw != wantRw {
		t.Errorf("backlogLayout lw/rw=%d/%d, want masterDetailWidths %d/%d", lw, rw, wantLw, wantRw)
	}

	// 1fr:2fr — Detail-Pane deutlich breiter als die Issue-Pane (≈ doppelt).
	if rw < lw*3/2 {
		t.Errorf("Detail-Pane rw=%d sollte ~2fr der Issue-Pane lw=%d sein (1fr:2fr)", rw, lw)
	}
}

// Dynamik: breiteres Terminal → breitere Issue-Pane (kein fixes Pinning mehr).
func TestDD2150_BacklogPaneScales(t *testing.T) {
	narrow := model{view: viewBacklog, width: 90, height: 30, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	wide := model{view: viewBacklog, width: 180, height: 30, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	_, _, lwN, _, _ := narrow.backlogLayout()
	_, _, lwW, _, _ := wide.backlogLayout()
	if lwW <= lwN {
		t.Errorf("Issue-Pane skaliert nicht: lw(180)=%d <= lw(90)=%d", lwW, lwN)
	}
}
