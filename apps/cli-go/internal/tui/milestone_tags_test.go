package tui

import (
	"testing"
)

// DD2-143: Milestone-Tags erscheinen am TreeView-Knoten (tagsInline). Die frühere
// Columns-Liste (msRows) ist mit dem Columns-Sunset (DD2-111) entfallen; die
// Tree-Tag-Anzeige deckt der Tree-Golden-Snapshot ab. tagsInline bleibt Single
// Source (render_shared.go) — der leere Fall ist hier explizit gepinnt.
func TestTagsInlineEmpty(t *testing.T) {
	if got := tagsInline(nil); got != "" {
		t.Errorf("tagsInline(nil)=%q, want empty", got)
	}
}
