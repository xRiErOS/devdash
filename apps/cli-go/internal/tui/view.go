package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("\n  %s\n\n  q: quit\n", lipgloss.NewStyle().Foreground(theme.Red).Render("Fehler: "+m.err.Error()))
	}
	switch m.view {
	case viewPicker:
		return m.viewPicker()
	case viewBacklog:
		return m.viewBacklog()
	case viewDetail:
		return m.viewDetail()
	default:
		return m.viewColumns()
	}
}

func (m model) header() string {
	name := "—"
	if m.project != nil {
		name = fmt.Sprintf("%s (%s)", m.project.Slug, m.project.Prefix)
	}
	left := theme.Header.Render("dd · " + name)
	right := lipgloss.NewStyle().Foreground(theme.Overlay).Render("[p]rojekt  [b]acklog  [?]hilfe  [q]uit")
	gap := m.width - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	return left + strings.Repeat(" ", gap) + right
}

func (m model) footer() string {
	hint := "j/k:↑↓  l/→/tab:rein  h/←:raus  enter:Detail  b:Backlog  q:quit"
	if m.status != "" {
		hint = m.status
	}
	return lipgloss.NewStyle().Foreground(theme.Overlay).Render(hint)
}

func (m model) viewPicker() string {
	var b strings.Builder
	b.WriteString("\n  " + theme.Header.Render("Projekt wählen") + "\n\n")
	for i, p := range m.projects {
		cursor := "  "
		line := fmt.Sprintf("%-10s %-26s %d Sprints · %d Backlog", p.Prefix, p.Name, p.SprintCount, p.BacklogCount)
		if i == m.plist.cursor {
			cursor = theme.Key.Render("▸ ")
			line = theme.Header.Render(line)
		}
		b.WriteString("  " + cursor + line + "\n")
	}
	b.WriteString("\n  " + lipgloss.NewStyle().Foreground(theme.Overlay).Render("j/k:↑↓  enter:wählen  q:quit") + "\n")
	return b.String()
}

type pane struct {
	title  string
	rows   []string
	cursor int
	isList bool
}

func (m model) viewColumns() string {
	all := []pane{
		{title: "Meilensteine", rows: m.msRows(), cursor: m.mlist.cursor, isList: true},
		{title: m.ctxTitle("Sprints", m.selMilestone() != nil, msName(m.selMilestone())), rows: m.spRows(), cursor: m.slist.cursor, isList: true},
		{title: m.ctxTitle("Issues", m.selSprint() != nil, spKey(m.selSprint())), rows: m.isRows(), cursor: m.ilist.cursor, isList: true},
		{title: "Detail", rows: m.detailRows(), isList: false},
	}
	start := m.depth
	end := start + 3
	if end > len(all) {
		end = len(all)
	}
	visible := all[start:end]

	w := m.width
	if w < 30 {
		w = 80
	}
	colW := (w - len(visible)*1) / len(visible)
	bodyH := m.height - 4
	if bodyH < 5 {
		bodyH = 16
	}

	cols := make([]string, len(visible))
	for i, p := range visible {
		focused := (start + i) == m.depth
		cols[i] = renderPane(p, colW, bodyH, focused)
	}
	body := lipgloss.JoinHorizontal(lipgloss.Top, cols...)
	return m.header() + "\n" + body + "\n" + m.footer()
}

func renderPane(p pane, w, h int, focused bool) string {
	titleStyle := lipgloss.NewStyle().Foreground(theme.Overlay)
	if focused {
		titleStyle = theme.Header
	}
	var b strings.Builder
	b.WriteString(titleStyle.Render(truncate(p.title, w)) + "\n")
	b.WriteString(strings.Repeat("─", min(w, lipgloss.Width(p.title)+2)) + "\n")
	for i := 0; i < h && i < len(p.rows); i++ {
		row := truncate(p.rows[i], w-2)
		if p.isList && i == p.cursor && focused {
			row = theme.Key.Render("▸ ") + row
		} else if p.isList {
			row = "  " + row
		}
		b.WriteString(row + "\n")
	}
	style := lipgloss.NewStyle().Width(w).Height(h)
	if focused {
		style = style.BorderStyle(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve)
	} else {
		style = style.BorderStyle(lipgloss.RoundedBorder()).BorderForeground(theme.Overlay)
	}
	return style.Render(b.String())
}

func (m model) msRows() []string {
	rows := make([]string, len(m.milestones))
	for i, ms := range m.milestones {
		rows[i] = fmt.Sprintf("%s  %s  %d/%d", statusDot(ms.Status), ms.Name, ms.Done, ms.Total)
	}
	return rows
}

func (m model) spRows() []string {
	sp := m.sprintsOfSel()
	rows := make([]string, len(sp))
	for i, s := range sp {
		rows[i] = fmt.Sprintf("%-8s %s  %d/%d", s.Key, api_short(s.Status), s.DoneCount, s.ItemCount)
	}
	return rows
}

func (m model) isRows() []string {
	is := m.issuesOfSel()
	if is == nil && m.selSprint() != nil {
		return []string{lipgloss.NewStyle().Foreground(theme.Overlay).Render("(lädt …)")}
	}
	rows := make([]string, len(is))
	for i, it := range is {
		rows[i] = fmt.Sprintf("%-9s %s", it.Key, it.Title)
	}
	return rows
}

func (m model) detailRows() []string {
	it := m.selIssue()
	if it == nil {
		return []string{lipgloss.NewStyle().Foreground(theme.Overlay).Render("(Issue wählen →)")}
	}
	rows := []string{
		theme.Key.Render(it.Key),
		fmt.Sprintf("%s · P%d", it.Type, it.Priority),
		theme.StatusStyle(it.Status).Render(it.Status),
		"",
	}
	if it.Goal != nil && *it.Goal != "" {
		rows = append(rows, "Goal:", *it.Goal)
	}
	return rows
}

func (m model) viewDetail() string {
	it := m.selIssue()
	if it == nil {
		return "\n  (kein Issue)\n"
	}
	var b strings.Builder
	b.WriteString("\n  " + theme.StatusStyle(it.Status).Render(it.Status) + "  " + theme.Key.Render(it.Key) + "\n")
	b.WriteString("  " + theme.Header.Render(it.Title) + "\n")
	b.WriteString(fmt.Sprintf("  Typ: %s  Prio: P%d\n", it.Type, it.Priority))
	if it.Goal != nil && *it.Goal != "" {
		b.WriteString("\n  Goal:\n  " + *it.Goal + "\n")
	}
	if it.Result != nil && *it.Result != "" {
		b.WriteString("\n  Result:\n  " + *it.Result + "\n")
	}
	b.WriteString("\n  " + lipgloss.NewStyle().Foreground(theme.Overlay).Render("esc/q: zurück") + "\n")
	return b.String()
}

func (m model) viewBacklog() string {
	var b strings.Builder
	b.WriteString(m.header() + "\n\n")
	b.WriteString("  " + theme.Header.Render("Backlog") + "\n\n")
	for i, it := range m.backlog {
		cursor := "  "
		if i == m.blist.cursor {
			cursor = theme.Key.Render("▸ ")
		}
		b.WriteString("  " + cursor + fmt.Sprintf("%-9s %s  %s", it.Key, truncate(it.Title, 50), api_short(it.Status)) + "\n")
	}
	b.WriteString("\n  " + lipgloss.NewStyle().Foreground(theme.Overlay).Render("j/k:↑↓  b/esc:zurück  q:quit") + "\n")
	return b.String()
}

// --- kleine Helfer ---

func (m model) ctxTitle(base string, ok bool, ctx string) string {
	if ok && ctx != "" {
		return base + " · " + ctx
	}
	return base
}

func msName(ms *api.Milestone) string {
	if ms == nil {
		return ""
	}
	return ms.Name
}

func spKey(s *api.Sprint) string {
	if s == nil {
		return ""
	}
	return s.Key
}

func statusDot(status string) string {
	switch status {
	case "active":
		return theme.StatusStyle(status).Render("●")
	case "completed", "closed":
		return theme.StatusStyle(status).Render("○")
	default:
		return theme.StatusStyle(status).Render("◌")
	}
}

func api_short(status string) string {
	return theme.StatusStyle(status).Render(status)
}

func truncate(s string, w int) string {
	if w < 1 {
		return ""
	}
	r := []rune(s)
	if len(r) <= w {
		return s
	}
	if w <= 1 {
		return string(r[:w])
	}
	return string(r[:w-1]) + "…"
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
