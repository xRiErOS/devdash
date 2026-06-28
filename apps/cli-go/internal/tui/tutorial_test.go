package tui

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

// DD2-122: Tutorial öffnet auf Seite 1, blättert per jkli vor/zurück und kehrt
// mit esc in die Heimat-View zurück. Seiten speisen sich aus der Keymap.
func TestTutorialPagesAndNav(t *testing.T) {
	m := columnsModel()
	m.view = viewTree
	mi, _ := m.openTutorial()
	m = mi.(model)
	if m.view != viewTutorial {
		t.Fatalf("openTutorial → view=%d, want viewTutorial", m.view)
	}
	pages := m.tutorialPages()
	if len(pages) < 3 {
		t.Fatalf("erwarte ≥3 Tutorialseiten (Intro + Keymap-Gruppen + Abschluss), got %d", len(pages))
	}
	if !strings.Contains(pages[0].title, "Welcome") {
		t.Errorf("erste Seite=%q, want Welcome…", pages[0].title)
	}

	mi, _ = m.Update(keyMsg("l")) // vor
	m = mi.(model)
	if m.tutorialPage != 1 {
		t.Errorf("l → page %d, want 1", m.tutorialPage)
	}
	mi, _ = m.Update(keyMsg("j")) // zurück
	m = mi.(model)
	if m.tutorialPage != 0 {
		t.Errorf("j → page %d, want 0", m.tutorialPage)
	}

	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyEsc})
	if mi.(model).view != viewTree {
		t.Errorf("esc → view=%d, want viewTree (topReturn)", mi.(model).view)
	}
}

func TestPaletteDispatchTutorial(t *testing.T) {
	m := paletteModel()
	mi, _ := m.dispatchPalette("go_tutorial")
	if mi.(model).view != viewTutorial {
		t.Errorf("go_tutorial → view=%d, want viewTutorial", mi.(model).view)
	}
}
