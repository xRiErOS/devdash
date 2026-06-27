package tui

// DD2-76: Detail-Fokus-Maschine (read-only). Zwei-Pane-Fokus (Tree↔Detail),
// zwei-Ebenen-Navigation im Detail (Section→Feld), Doppel-Indikator (Pane-Border-
// Tausch + D08-Balken). Reine Navigation, kein Schreibpfad (der folgt in DD2-77).

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// detailFocusModel: Tree mit aufgeklapptem Issue (DD2-1) unter dem Cursor. Das
// Issue hat Goal/Beschreibung/PO-Notes (Section 1, 3 Felder) + Background
// (Section 2, 1 Feld) → zwei navigierbare Sektionen.
func detailFocusModel() model {
	m := treeModel() // M1 → S1(id10) S2(id11)
	m.treeExpMile[1] = true
	g, d, po, bg := "Ziel", "Beschr", "PO sagt", "Hintergrund"
	m.treeIssues[10] = []api.Issue{{
		Key: "DD2-1", Title: "A", Type: "bug", Priority: 1, Status: "in_progress",
		Goal: &g, Description: &d, PoNotes: &po, Background: &bg,
	}}
	m.treeExpSprint[10] = true
	m.view = viewTree
	m.treeCursor = 2 // [mile, s10, issue, s11] → Issue an Index 2
	return m
}

func key(s string) tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)} }

// D01: enter (bzw. l/→) auf einem Issue-Knoten verlagert den Fokus in die Detail-
// Pane; secCursor=0, level=Section, erste Section offen.
func TestEnterDetailFocusFromIssue(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mm := mi.(model)
	if !mm.detailFocus {
		t.Fatal("enter auf Issue sollte detailFocus setzen")
	}
	if mm.detailLevel != 0 || mm.secCursor != 0 {
		t.Errorf("level=%d secCursor=%d, want 0/0", mm.detailLevel, mm.secCursor)
	}
	if mm.accOpen != 1 {
		t.Errorf("accOpen=%d, want 1 (erste Section offen)", mm.accOpen)
	}
	// l/→ macht dasselbe (Drill-in-Muskelmemory).
	ml, _ := detailFocusModel().keyTree(key("l"))
	if !ml.(model).detailFocus {
		t.Error("l/→ auf Issue sollte ebenfalls detailFocus setzen")
	}
}

// D01: Fokus geht nur auf Issue-Knoten in die Detail-Pane; auf Meilenstein/Sprint
// bleibt enter das Expand (kein Detail-Fokus in DD2#12).
func TestDetailFocusOnlyOnIssue(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 0 // Meilenstein
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	if mi.(model).detailFocus {
		t.Error("enter auf Meilenstein sollte NICHT in den Detail-Fokus gehen")
	}
}

// D02: j/k bewegt auf Section-Ebene den secCursor (geklemmt); die offene Section
// folgt dem Cursor (accOpen = secCursor+1).
func TestDetailFocusSectionNav(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)

	mi, _ = m.keyTree(key("j"))
	m = mi.(model)
	if m.secCursor != 1 || m.accOpen != 2 {
		t.Errorf("j → secCursor=%d accOpen=%d, want 1/2", m.secCursor, m.accOpen)
	}
	// Am Ende geklemmt (nur 2 Sektionen).
	mi, _ = m.keyTree(key("j"))
	m = mi.(model)
	if m.secCursor != 1 {
		t.Errorf("j am Ende → secCursor=%d, want 1 (geklemmt)", m.secCursor)
	}
	mi, _ = m.keyTree(key("k"))
	m = mi.(model)
	if m.secCursor != 0 || m.accOpen != 1 {
		t.Errorf("k → secCursor=%d accOpen=%d, want 0/1", m.secCursor, m.accOpen)
	}
}

// D02: l/→ steigt in die Section (Feld-Ebene), fieldCursor=0.
func TestDetailFocusEnterField(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // detail focus, sec0
	m = mi.(model)
	mi, _ = m.keyTree(key("l"))
	m = mi.(model)
	if m.detailLevel != 1 || m.fieldCursor != 0 {
		t.Errorf("l/→ → level=%d fieldCursor=%d, want 1/0", m.detailLevel, m.fieldCursor)
	}
}

// D02: auf Feld-Ebene bewegt j/k den fieldCursor (Section 1 hat 3 Felder), geklemmt.
func TestDetailFocusFieldNav(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("l")) // in Feld-Ebene
	m = mi.(model)
	mi, _ = m.keyTree(key("j"))
	m = mi.(model)
	if m.fieldCursor != 1 {
		t.Errorf("j → fieldCursor=%d, want 1", m.fieldCursor)
	}
	mi, _ = m.keyTree(key("j"))
	m = mi.(model)
	mi, _ = m.keyTree(key("j")) // 3 Felder → an Index 2 geklemmt
	m = mi.(model)
	if m.fieldCursor != 2 {
		t.Errorf("j geklemmt → fieldCursor=%d, want 2", m.fieldCursor)
	}
}

// D02: h/← geht eine Ebene zurück — Feld→Section, oberste Section→Tree.
func TestDetailFocusBackLevels(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("l")) // Feld-Ebene
	mi, _ = mi.(model).keyTree(key("h")) // zurück auf Section
	m = mi.(model)
	if m.detailLevel != 0 {
		t.Errorf("h auf Feld → level=%d, want 0", m.detailLevel)
	}
	if !m.detailFocus {
		t.Error("h auf Feld sollte im Detail-Fokus bleiben")
	}
	mi, _ = m.keyTree(key("h")) // Section-Ebene → zurück in den Tree
	m = mi.(model)
	if m.detailFocus {
		t.Error("h auf oberster Section sollte zurück in den Tree-Fokus")
	}
}

// esc verlässt den Detail-Fokus von jeder Ebene.
func TestDetailFocusEsc(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("l")) // Feld-Ebene
	mi, _ = mi.(model).keyTree(tea.KeyMsg{Type: tea.KeyEsc})
	if mi.(model).detailFocus {
		t.Error("esc sollte den Detail-Fokus verlassen")
	}
}

// D02: Ziffer 1..n = Direktsprung in die Section (öffnet sie, Section-Ebene).
func TestDetailFocusDigitJump(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("l")) // erst in Feld-Ebene
	mi, _ = mi.(model).keyTree(key("2")) // Sprung auf Section 2
	m = mi.(model)
	if m.secCursor != 1 || m.accOpen != 2 {
		t.Errorf("Ziffer 2 → secCursor=%d accOpen=%d, want 1/2", m.secCursor, m.accOpen)
	}
	if m.detailLevel != 0 {
		t.Errorf("Ziffer-Sprung → level=%d, want 0 (Section-Ebene)", m.detailLevel)
	}
}

// Read-only-Section (keine editierbaren Felder, z.B. User-Stories) → l/→ ist no-op.
func TestDetailFocusReadOnlySectionNoFieldEntry(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true
	m.treeIssues[10] = []api.Issue{{
		Key: "DD2-9", Title: "RO", Type: "bug", Priority: 1, Status: "to_review",
		UserStories: []api.UserStory{{Title: "US1", Verdict: "open"}},
	}}
	m.treeExpSprint[10] = true
	m.view = viewTree
	m.treeCursor = 2
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	mi, _ = mi.(model).keyTree(key("l"))
	if mi.(model).detailLevel != 0 {
		t.Errorf("l/→ in feldlose Section → level=%d, want 0 (no-op)", mi.(model).detailLevel)
	}
}

// issueSections trägt die editierbaren Felder je Section (Single Source für Nav +
// späteren Edit). Section 1 = goal/description/po_notes; Section 2 = background.
func TestIssueSectionsCarryFields(t *testing.T) {
	g, d, po, bg := "Z", "B", "P", "H"
	it := api.Issue{Key: "DD2-1", Title: "T", Type: "bug", Priority: 1, Status: "in_progress",
		Goal: &g, Description: &d, PoNotes: &po, Background: &bg}
	secs := treeModel().issueSections(it, 60)
	if len(secs) != 2 {
		t.Fatalf("Sektionen=%d, want 2", len(secs))
	}
	keys := func(fs []detailField) []string {
		out := make([]string, len(fs))
		for i, f := range fs {
			out[i] = f.key
		}
		return out
	}
	if got := keys(secs[0].fields); strings.Join(got, ",") != "goal,description,po_notes" {
		t.Errorf("Section 1 fields=%v, want [goal description po_notes]", got)
	}
	if got := keys(secs[1].fields); strings.Join(got, ",") != "background" {
		t.Errorf("Section 2 fields=%v, want [background]", got)
	}
}

// D03: Pane-Border-Tausch — Tree-Fokus = linker Pane Mauve, Detail-Fokus = rechter
// Pane Mauve (jeweils der andere Overlay).
func TestPaneBorderSwap(t *testing.T) {
	l, r := paneBorderColors(false)
	if l != theme.Mauve || r != theme.Overlay {
		t.Errorf("Tree-Fokus: left=%v right=%v, want Mauve/Overlay", l, r)
	}
	l, r = paneBorderColors(true)
	if l != theme.Overlay || r != theme.Mauve {
		t.Errorf("Detail-Fokus: left=%v right=%v, want Overlay/Mauve", l, r)
	}
}

// D03: Bei Detail-Fokus friert der Tree-Cursor — die Cursor-Zeile ist NICHT mehr
// einheitlich akzentgetönt (nur der fokussierte Pane zeigt seinen aktiven Cursor).
func TestTreeCursorFrozenWhenDetailFocus(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := treeModel()
	m.treeExpMile[1] = true
	nodes := m.treeNodes()
	m.treeCursor = 0

	active := m.treeLeftLines(nodes, 32, true)[0]
	frozen := m.treeLeftLines(nodes, 32, false)[0]
	if active == frozen {
		t.Error("frozen Cursor sollte sich vom aktiven unterscheiden")
	}
	if frozen == theme.Accent.Render(ansi.Strip(frozen)) {
		t.Errorf("frozen Cursor fälschlich voll akzentgetönt: %q", frozen)
	}
}

// D03: Aktive Section bekommt im Detail-Fokus den D08-Balken ▌ auf dem Header.
func TestAccordionActiveSectionBar(t *testing.T) {
	secs := []accordionSection{
		{title: "Eins", body: "B1", fields: []detailField{{key: "goal", label: "Goal", editor: "text"}}},
		{title: "Zwei", body: "B2", fields: []detailField{{key: "background", label: "Background", editor: "text"}}},
	}
	focus := detailFocusView{active: true, level: 0, sec: 1}
	out := ansi.Strip(renderAccordion(secs, 2, 60, focus))
	// Der Balken ▌ steht an der aktiven (zweiten) Section, nicht an der ersten.
	lines := strings.Split(out, "\n")
	barLine := ""
	for _, l := range lines {
		if strings.Contains(l, "▌") {
			barLine = l
		}
	}
	if !strings.Contains(barLine, "Zwei") {
		t.Errorf("D08-Balken nicht an aktiver Section 'Zwei': %q", barLine)
	}
}

// D03: Auf Feld-Ebene zeigt die aktive Section einen Feld-Streifen mit dem aktiven
// Feld hervorgehoben.
func TestAccordionFieldStrip(t *testing.T) {
	secs := []accordionSection{
		{title: "Eins", body: "B1", fields: []detailField{
			{key: "goal", label: "Goal", editor: "text"},
			{key: "description", label: "Beschreibung", editor: "text"},
		}},
	}
	focus := detailFocusView{active: true, level: 1, sec: 0, field: 1}
	out := ansi.Strip(renderAccordion(secs, 1, 60, focus))
	if !strings.Contains(out, "Felder:") {
		t.Errorf("Feld-Streifen fehlt: %q", out)
	}
	if !strings.Contains(out, "Beschreibung") {
		t.Errorf("aktives Feld 'Beschreibung' nicht im Streifen: %q", out)
	}
}

// renderAccordion ohne Fokus (detailFocusView{}) verhält sich wie bisher
// (Regression — Golden bleibt stabil).
func TestAccordionNoFocusUnchanged(t *testing.T) {
	secs := []accordionSection{{title: "Eins", body: "BODY", fields: nil}}
	out := ansi.Strip(renderAccordion(secs, 1, 60, detailFocusView{}))
	if strings.Contains(out, "▌") {
		t.Errorf("ohne Fokus kein D08-Balken erwartet: %q", out)
	}
	if !strings.Contains(out, "BODY") {
		t.Errorf("offene Section-Body fehlt: %q", out)
	}
}
