package tui

// detail.go — Detail-Fokus-Maschine (DD2-76). Macht die rechte Detail-Pane aus
// einem read-only Anzeigeblock zur fokussierbaren, zwei-stufig navigierbaren
// Arbeitsfläche. Tree bleibt Navigator (D01); enter/l auf einem Issue-Knoten
// verlagert den Fokus, h/← bzw. esc geben ihn zurück. Reine Navigation — der
// Schreibpfad (huh-Form → UpdateIssue) folgt in DD2-77. Guardrail: tui-plan.md.

import (
	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// focusedIssue liefert das Issue unter dem Tree-Cursor, falls der Knoten ein
// Issue ist (nur dort ist der Detail-Fokus gültig, D01/Sprint-Schnitt DD2#12).
func (m model) focusedIssue() *api.Issue {
	nodes := m.treeNodes()
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return nil
	}
	if n := nodes[m.treeCursor]; n.kind == tkIssue {
		return n.issue
	}
	return nil
}

// focusSections liefert die navigierbaren Sektionen des fokussierten Issues
// (Single Source = issueSections, kein Parallel-Modell → kein Drift). Breite egal
// für die Feld-Struktur. nil, wenn kein Issue fokussiert ist.
func (m model) focusSections() []accordionSection {
	it := m.focusedIssue()
	if it == nil {
		return nil
	}
	_, _, _, rw, _ := m.treeLayout()
	return m.issueSections(*it, rw-4)
}

// enterDetailFocus verlagert den Fokus vom Tree in die Detail-Pane (D01): erste
// Section, Section-Ebene, Section offen.
func (m model) enterDetailFocus() (tea.Model, tea.Cmd) {
	m.detailFocus = true
	m.detailLevel = 0
	m.secCursor = 0
	m.fieldCursor = 0
	m.accOpen = 1
	m.status = ""
	return m, nil
}

// exitDetailFocus gibt den Fokus an den Tree zurück; der Tree-Cursor (eingefroren
// während des Detail-Fokus) wird wieder aktiv.
func (m *model) exitDetailFocus() {
	m.detailFocus = false
	m.detailLevel = 0
	m.fieldCursor = 0
}

// clampDetailCursor klemmt sec-/fieldCursor an die aktuelle Sektions-/Feld-Anzahl
// (analog treeCursor) — die Sektionen sind inhalts-gegated, können sich also je
// Issue unterscheiden. Eine feldlose (read-only) Section fällt auf Section-Ebene.
func (m *model) clampDetailCursor(secs []accordionSection) {
	if len(secs) == 0 {
		m.secCursor, m.fieldCursor, m.detailLevel = 0, 0, 0
		return
	}
	if m.secCursor < 0 {
		m.secCursor = 0
	}
	if m.secCursor >= len(secs) {
		m.secCursor = len(secs) - 1
	}
	fn := len(secs[m.secCursor].fields)
	if fn == 0 {
		m.fieldCursor = 0
		m.detailLevel = 0
		return
	}
	if m.fieldCursor < 0 {
		m.fieldCursor = 0
	}
	if m.fieldCursor >= fn {
		m.fieldCursor = fn - 1
	}
}

// keyDetailFocus steuert die Detail-Pane im Fokus (DD2-76, read-only): zwei-Ebenen-
// Navigation Section↔Feld mit j/k, l/→ rein, h/← raus (oberste → Tree), Ziffer-
// Sprung, esc zurück. Vom keyTree-Dispatch aufgerufen, solange detailFocus gilt.
func (m model) keyDetailFocus(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	secs := m.focusSections()
	if len(secs) == 0 { // Issue weg/feldlos → Fokus zurück in den Tree
		m.exitDetailFocus()
		return m, nil
	}
	m.clampDetailCursor(secs)

	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "esc":
		m.exitDetailFocus()
		return m, nil
	}

	// Ziffer 1..n = Direktsprung in die Section (öffnet sie, Section-Ebene).
	if s := msg.String(); len(s) == 1 && s[0] >= '1' && s[0] <= '9' {
		if d := int(s[0] - '0'); d <= len(secs) {
			m.secCursor = d - 1
			m.accOpen = d
			m.detailLevel = 0
			m.fieldCursor = 0
		}
		return m, nil
	}

	switch navKey(msg.String()) {
	case "down":
		if m.detailLevel == 0 {
			if m.secCursor < len(secs)-1 {
				m.secCursor++
				m.accOpen = m.secCursor + 1
				m.fieldCursor = 0
			}
		} else if m.fieldCursor < len(secs[m.secCursor].fields)-1 {
			m.fieldCursor++
		}
	case "up":
		if m.detailLevel == 0 {
			if m.secCursor > 0 {
				m.secCursor--
				m.accOpen = m.secCursor + 1
				m.fieldCursor = 0
			}
		} else if m.fieldCursor > 0 {
			m.fieldCursor--
		}
	case "right": // l/→ : in die Section rein (nur wenn editierbare Felder da sind)
		if m.detailLevel == 0 && len(secs[m.secCursor].fields) > 0 {
			m.detailLevel = 1
			m.fieldCursor = 0
			m.accOpen = m.secCursor + 1
		}
	case "left": // h/← : eine Ebene zurück (oberste Section → Tree)
		if m.detailLevel == 1 {
			m.detailLevel = 0
		} else {
			m.exitDetailFocus()
		}
	}
	return m, nil
}

// paneBorderColors liefert die Border-Farben (links, rechts) je nach Fokus (D03):
// der fokussierte Pane ist Mauve (aktiv), der andere Overlay (inaktiv).
func paneBorderColors(detailFocus bool) (left, right lipgloss.Color) {
	if detailFocus {
		return theme.Overlay, theme.Mauve
	}
	return theme.Mauve, theme.Overlay
}
