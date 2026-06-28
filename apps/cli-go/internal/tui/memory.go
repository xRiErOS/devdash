package tui

// memory.go — Memory-Browser (T18): PO-Sicht auf project_memories. Master-Detail
// (links Compact-Liste, rechts Detail mit content), Volltext-Suche (/),
// Kategorie-Filter (c-Zyklus), Clipboard-Export für Agenten (y).

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/clip"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// memCategories spiegelt MEMORY_CATEGORIES (project-memory.contracts.js).
var memCategories = []string{
	"architecture_decision", "dead_end", "bug_pattern",
	"convention", "external_constraint", "session_note",
}

// memCatShort kürzt die langen Kategorie-Namen für die Listenspalte.
func memCatShort(cat string) string {
	switch cat {
	case "architecture_decision":
		return "arch"
	case "dead_end":
		return "dead"
	case "bug_pattern":
		return "bug"
	case "convention":
		return "conv"
	case "external_constraint":
		return "ext"
	case "session_note":
		return "note"
	}
	return cat
}

// nextMemCategory schaltet den Kategorie-Filter zyklisch weiter ("" = alle).
func nextMemCategory(cur string) string {
	if cur == "" {
		return memCategories[0]
	}
	for i, c := range memCategories {
		if c == cur {
			if i+1 < len(memCategories) {
				return memCategories[i+1]
			}
			return "" // hinter der letzten Kategorie wieder "alle"
		}
	}
	return ""
}

func (m *model) selMemory() *api.ProjectMemory {
	if m.memlist.cursor >= 0 && m.memlist.cursor < len(m.memList) {
		return &m.memList[m.memlist.cursor]
	}
	return nil
}

// syncMemDetail lädt den content des selektierten Memorys, falls noch nicht geladen.
func (m *model) syncMemDetail() tea.Cmd {
	cur := m.selMemory()
	if cur == nil {
		m.memDetail = nil
		return nil
	}
	if m.memDetail != nil && m.memDetailID == cur.ID {
		return nil
	}
	m.memDetail = nil
	return loadMemDetail(m.client, cur.ID)
}

// openMemory öffnet den Memory-Browser (lädt die Compact-Liste).
func (m model) openMemory() (tea.Model, tea.Cmd) {
	m.view = viewMemory
	m.memlist = listState{}
	m.memCat = ""
	m.memQuery = ""
	m.memSearching = false
	m.memDetail = nil
	m.memDetailID = 0
	m.status = ""
	return m, loadMemories(m.client, "")
}

// keyMemory steuert den Memory-Browser. Voll-Intercept (auch globale Tasten),
// damit die Suche q/R/p als Text tippen kann.
func (m model) keyMemory(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.memSearching {
		return m.keyMemSearch(msg)
	}
	switch navKey(msg.String()) {
	case "up":
		m.memlist.move(-1)
		return m, m.syncMemDetail()
	case "down":
		m.memlist.move(1)
		return m, m.syncMemDetail()
	}
	switch msg.String() {
	case "esc", "q":
		m.view = viewColumns
		m.status = ""
		return m, nil
	case "/":
		m.memSearching = true
		m.memQuery = ""
		m.status = ""
		return m, nil
	case "c":
		m.memCat = nextMemCategory(m.memCat)
		m.memlist = listState{}
		m.memDetail = nil
		return m, loadMemories(m.client, m.memCat)
	case "y":
		return m.yankMemories()
	}
	return m, nil
}

// keyMemSearch ist der Volltext-Eingabemodus (/).
func (m model) keyMemSearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		m.memSearching = false
		q := strings.TrimSpace(m.memQuery)
		m.memlist = listState{}
		m.memDetail = nil
		if q == "" {
			return m, loadMemories(m.client, m.memCat)
		}
		return m, searchMemoriesCmd(m.client, q, m.memCat)
	case tea.KeyEsc:
		m.memSearching = false
		m.memQuery = ""
		m.memlist = listState{}
		m.memDetail = nil
		return m, loadMemories(m.client, m.memCat)
	case tea.KeyBackspace, tea.KeyDelete:
		if len(m.memQuery) > 0 {
			r := []rune(m.memQuery)
			m.memQuery = string(r[:len(r)-1])
		}
		return m, nil
	case tea.KeyRunes, tea.KeySpace:
		m.memQuery += string(msg.Runes)
		return m, nil
	}
	return m, nil
}

// yankMemories kopiert die aktuell gelisteten Memories (ID + Summary) mit einem
// CLI-Hinweis, damit Agenten das Detail per devd_project_memory_show ziehen können.
func (m model) yankMemories() (tea.Model, tea.Cmd) {
	if len(m.memList) == 0 {
		m.status = noticeText("Keine Memories zum Kopieren")
		return m, nil
	}
	var b strings.Builder
	b.WriteString("# DevD Project-Memories\n")
	b.WriteString("# Detail je Memory via MCP: devd_project_memory_show <id>\n\n")
	for _, mm := range m.memList {
		b.WriteString(fmt.Sprintf("- [%d] (%s) %s\n", mm.ID, mm.Category, mm.Summary))
	}
	if err := clip.Copy(b.String()); err != nil {
		m.errNote = "Clipboard-Fehler: " + err.Error()
	} else {
		m.errNote = ""
		m.status = noticeText(fmt.Sprintf("%d Memories kopiert (mit show-Hinweis für Agenten)", len(m.memList)))
	}
	return m, nil
}

// --- View ---

func (m model) viewMemory() string {
	w := m.termWidth()
	h := m.bodyHeight()
	leftW := w/2 - 2
	if leftW < 16 {
		leftW = 16
	}
	rightW := w - leftW - 4
	if rightW < 16 {
		rightW = 16
	}

	listP := pane{title: m.memListTitle(), rows: m.memRows(), cursor: m.memlist.cursor, isList: true}
	detP := pane{title: "Detail", rows: m.memDetailRows(), isList: false}
	left := renderPane(listP, leftW, h, true)
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	// DD2-48: globaler Header (Projekt-Nav) + Präfix-Titel "dd2 — Memory-Browser",
	// konsistent zu den übrigen Screens (Zwei-Pane-Body bleibt eigenständig).
	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("Memory-Browser"))
	footer := theme.Dim.Render("j/k:↑↓  /:Suche  c:Kategorie  y:kopieren  esc/q:zurück")
	if m.memSearching {
		footer = theme.Key.Render("Suche: ") + m.memQuery + "▏"
	} else if m.status != "" {
		footer = m.status
	}
	return head + "\n" + body + "\n" + footer
}

func (m model) memListTitle() string {
	cat := "alle"
	if m.memCat != "" {
		cat = memCatShort(m.memCat)
	}
	return fmt.Sprintf("Memories ∙ %s (%d)", cat, len(m.memList))
}

func (m model) memRows() []string {
	if len(m.memList) == 0 {
		return []string{theme.Dim.Render("(keine — / Suche, c Kategorie)")}
	}
	rows := make([]string, len(m.memList))
	for i, mm := range m.memList {
		rows[i] = fmt.Sprintf("%-5s %s", theme.Dim.Render(memCatShort(mm.Category)), mm.Summary)
	}
	return rows
}

func (m model) memDetailRows() []string {
	cur := m.selMemory()
	if cur == nil {
		return []string{theme.Dim.Render("(Memory wählen →)")}
	}
	rows := []string{
		theme.Key.Render(fmt.Sprintf("#%d", cur.ID)) + "  " + theme.Dim.Render(cur.Category),
		"",
		theme.Header.Render(cur.Summary),
		"",
	}
	if m.memDetail != nil && m.memDetailID == cur.ID {
		if c := deref(m.memDetail.Content); c != "" {
			rows = append(rows, theme.Dim.Render("Inhalt:"))
			rows = append(rows, strings.Split(c, "\n")...)
		}
		if a := deref(m.memDetail.Anchor); a != "" {
			rows = append(rows, "", theme.Dim.Render("Anchor: "+a))
		}
		if u := deref(m.memDetail.UpdatedAt); u != "" {
			rows = append(rows, theme.Dim.Render("aktualisiert "+u))
		}
	} else {
		rows = append(rows, theme.Dim.Render("(lädt Inhalt …)"))
	}
	return rows
}
