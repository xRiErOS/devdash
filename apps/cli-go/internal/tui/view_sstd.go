package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// view_sstd.go — SSTD-Browser (DD2-166): MasterDetail über die 6 editierbaren
// Prosa-Slots + 2 read-only Projektionen (Next Steps ← Todos, Session Log ←
// session_log-Memories). Q01: nur die 6 Slots editierbar. Q02: Edit immer als
// ganze Datei via neovim (editInEditor). Einstieg via Command-Palette.

// sstdSlotTitles spiegelt SLOT_KEYS auf englische UI-Labels (i18n-Konvention).
var sstdSlotTitles = map[string]string{
	"architecture": "Architecture",
	"conventions":  "Conventions",
	"sprint_state": "Sprint State",
	"roadmap":      "Roadmap",
	"cross_refs":   "Cross-Refs",
	"misc":         "Misc",
}

// sstdEntry ist eine Zeile der linken Liste: ein Slot (editierbar) oder eine
// Projektion (read-only).
type sstdEntry struct {
	key      string
	title    string
	content  string
	editable bool
}

// sstdEntries baut die kombinierte Liste: 6 Slots (in fixer Reihenfolge) gefolgt
// von den 2 Projektionen.
func (m *model) sstdEntries() []sstdEntry {
	out := make([]sstdEntry, 0, len(m.sstdSlots)+2)
	for _, s := range m.sstdSlots {
		title := sstdSlotTitles[s.SlotKey]
		if title == "" {
			title = s.SlotKey
		}
		out = append(out, sstdEntry{key: s.SlotKey, title: title, content: s.Content, editable: true})
	}
	if m.sstdProj != nil {
		out = append(out,
			sstdEntry{key: "next_steps", title: "Next Steps", content: m.sstdProj.NextSteps, editable: false},
			sstdEntry{key: "journal", title: "Session Log", content: m.sstdProj.Journal, editable: false},
		)
	}
	return out
}

func (m *model) selSstdEntry() *sstdEntry {
	entries := m.sstdEntries()
	if m.sstdList.cursor >= 0 && m.sstdList.cursor < len(entries) {
		return &entries[m.sstdList.cursor]
	}
	return nil
}

// openSSTD öffnet den SSTD-Browser (lädt Slots + Projektionen).
func (m model) openSSTD() (tea.Model, tea.Cmd) {
	m.view = viewSSTD
	m.sstdList = listState{}
	m.sstdSlots = nil
	m.sstdProj = nil
	m.sstdEditKey = ""
	m.status = ""
	return m, loadSstd(m.client)
}

// keySSTD steuert den SSTD-Browser. i/k navigieren, enter editiert den Slot in
// neovim (Projektionen read-only), esc/q zurück in die Heimat-View.
func (m model) keySSTD(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.sstdList.move(-1)
		return m, nil
	case "down":
		m.sstdList.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q":
		m.view = m.topReturn
		m.status = ""
		return m, nil
	case "enter":
		cur := m.selSstdEntry()
		if cur == nil {
			return m, nil
		}
		if !cur.editable {
			return m, func() tea.Msg { return noticeMsg{"read-only projection — not editable"} }
		}
		m.sstdEditKey = cur.key
		return m, editInEditor(cur.content, ".md")
	}
	return m, nil
}

// --- View ---

func (m model) viewSSTD() string {
	w := m.termWidth()
	h := m.bodyHeight()
	leftW, rightW := m.masterDetailWidths(w)

	listP := pane{title: m.sstdListTitle(), rows: m.sstdRows(), cursor: m.sstdList.cursor, isList: true}
	detP := pane{title: m.sstdDetailTitle(), rows: m.sstdDetailRows(rightW - 2), isList: false}
	left := renderPane(listP, leftW, h, true)
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("SSTD"))
	footer := theme.Dim.Render("i/k:↑↓  enter:edit (neovim)  esc/q:back")
	if m.status != "" {
		footer = m.status
	}
	return head + "\n" + body + "\n" + footer
}

func (m model) sstdListTitle() string {
	return fmt.Sprintf("Slots ∙ 6 + 2 proj (%d)", len(m.sstdEntries()))
}

func (m model) sstdRows() []string {
	entries := m.sstdEntries()
	if len(entries) == 0 {
		return []string{theme.Dim.Render("(loading …)")}
	}
	rows := make([]string, len(entries))
	for i, e := range entries {
		marker := " "
		if !e.editable {
			marker = theme.Dim.Render("◦") // read-only projection
		}
		empty := ""
		if strings.TrimSpace(e.content) == "" {
			empty = theme.Dim.Render(" ·empty")
		}
		rows[i] = fmt.Sprintf("%s %s%s", marker, e.title, empty)
	}
	return rows
}

func (m model) sstdDetailTitle() string {
	cur := m.selSstdEntry()
	if cur == nil {
		return "Detail"
	}
	if cur.editable {
		return cur.title
	}
	return cur.title + " (read-only)"
}

func (m model) sstdDetailRows(width int) []string {
	cur := m.selSstdEntry()
	if cur == nil {
		return []string{theme.Dim.Render("(select a slot →)")}
	}
	if strings.TrimSpace(cur.content) == "" {
		if cur.editable {
			return []string{theme.Dim.Render("(empty — enter to edit in neovim)")}
		}
		return []string{theme.Dim.Render("(no content)")}
	}
	rendered := glowRender(cur.content, width)
	return strings.Split(rendered, "\n")
}
