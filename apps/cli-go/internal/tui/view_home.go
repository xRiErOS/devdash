package tui

// view_home.go — DD2-124: viewHome (Startschirm/Lobby) + projPick-Overlay.
// viewHome ist der Einstieg der TUI: ASCII-Logo oben, navigierbare Projektliste
// darunter (Lobby). Der p-Shortcut öffnet denselben Picker als schwebendes
// Overlay (projPick) über der aktuellen View — KEIN View-Wechsel mehr.
// Esc-Spine: Projekt-Views → viewHome → Quit.

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/config"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// homeLogoLines = ASCII-Banner ("DevDash"). Bewusst PURE ASCII — alle Glyphen
// narrow, kein East-Asian-Ambiguous-Drift (DD2-53), terminalunabhängig stabil.
var homeLogoLines = []string{
	"  ____            ____            _    ",
	" |  _ \\  _____ __|  _ \\  __ _ ___| |__ ",
	" | | | |/ _ \\ V /| | | |/ _ \\ __| '_ \\ ",
	" | |_| |  __/ V /| |_| | (_| \\__ \\ | | |",
	" |____/ \\___|\\_/ |____/ \\__,_|___/_| |_|",
}

// centerInto setzt s exakt mittig in ein Feld der Breite w (links + rechts
// gepaddet → Zeile ist genau w breit). ANSI-sichere Breite via lipgloss.Width.
func centerInto(s string, w int) string {
	sw := lipgloss.Width(s)
	if sw >= w {
		return s
	}
	left := (w - sw) / 2
	return strings.Repeat(" ", left) + s + strings.Repeat(" ", w-sw-left)
}

// homeLogoBlock liefert das Mauve-Banner als Zeilen UNIFORMER Breite (jede Zeile
// rechts auf die Logo-Maximalbreite gepaddet) — so bleibt das Banner intern bündig
// (kein Zeilen-Drift). Schmales Terminal → kompakter Titel.
func (m model) homeLogoBlock() []string {
	lw := 0
	for _, l := range homeLogoLines {
		if x := lipgloss.Width(l); x > lw {
			lw = x
		}
	}
	if m.termWidth() < lw+2 {
		return []string{theme.Header.Render("DevDashboard")}
	}
	style := lipgloss.NewStyle().Foreground(theme.Mauve)
	out := make([]string, len(homeLogoLines))
	for i, l := range homeLogoLines {
		padded := l + strings.Repeat(" ", lw-lipgloss.Width(l))
		out[i] = style.Render(padded)
	}
	return out
}

// projectStatusDot codiert den Projekt-Aktivitätsstatus als farbigen Punkt (DD2-81):
// api.Project hat kein Status-Feld → SprintCount als Aktivitäts-Proxy: >0 laufende
// Sprints = aktiv (◉ Grün), sonst ruhend (◦ Overlay). Glyphen East-Asian-neutral
// (◉/◦, kein ambiguous ●/○ → kein Spalten-Drift).
func projectStatusDot(p api.Project) string {
	if p.SprintCount > 0 {
		return lipgloss.NewStyle().Foreground(theme.Green).Render("◉")
	}
	return lipgloss.NewStyle().Foreground(theme.Overlay).Render("◦")
}

// pickerRowFill setzt die right-Spalte rechtsbündig auf w Spalten (links zuerst
// gekürzt → kein Overflow) — ANSI-/runewidth-bewusst.
func pickerRowFill(left, right string, w int) string {
	gap := w - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	return left + strings.Repeat(" ", gap) + right
}

// projectPickerBody rendert Suchzeile + gefilterte Projektliste als ausgerichtete
// Tabelle (DD2-81/82/83) — geteilt von der viewHome-Lobby und dem projPick-Overlay
// (Single Source). w = Tabellenbreite (Lobby: breit gedeckelt; Overlay: Modal-Innen-
// breite). Spalten: Aktivitäts-Dot + Name links, Prefix·Slug + Sprints/Backlog rechts.
func (m model) projectPickerBody(w int) string {
	ti := m.projectSearch
	if m.projectQuery != "" {
		ti.TextStyle = lipgloss.NewStyle().Foreground(theme.Red)
	} else {
		ti.TextStyle = lipgloss.NewStyle().Foreground(theme.Text)
	}
	var b strings.Builder
	b.WriteString(theme.Muted.Render("⌕ ") + ti.View() + "\n\n")
	// DD2-83: Spalten-Header (Project | Prefix·Slug · S/B) + Trennlinie → Tabellen-Optik.
	b.WriteString(pickerRowFill(theme.Dim.Render("  ◦ Project"), theme.Dim.Render("Prefix · Slug    S/B"), w) + "\n")
	b.WriteString(theme.Dim.Render(strings.Repeat("─", w)) + "\n")
	filtered := m.filteredProjects()
	for i, p := range filtered {
		cursor := "  "
		nameStyle := lipgloss.NewStyle().Foreground(theme.Text)
		if i == m.plist.cursor {
			cursor = theme.Accent.Render("▸ ")
			nameStyle = theme.Header
		}
		// DD2-82: volle Metriken sichtbar (kein Abschnitt), Breite dynamisch genutzt.
		meta := theme.Muted.Render(fmt.Sprintf("%s · %s   %d/%d", p.Prefix, p.Slug, p.SprintCount, p.BacklogCount))
		nameW := w - lipgloss.Width(cursor) - 2 - lipgloss.Width(meta) - 1 // dot(1)+space(1)
		if nameW < 8 {
			nameW = 8
		}
		left := cursor + projectStatusDot(p) + " " + nameStyle.Render(truncate(p.Name, nameW))
		b.WriteString(pickerRowFill(left, meta, w) + "\n")
	}
	if len(filtered) == 0 && len(m.projects) > 0 {
		b.WriteString(theme.Muted.Render("  (no matches)") + "\n")
	} else if len(m.projects) == 0 {
		b.WriteString(theme.Muted.Render("  (loading projects …)") + "\n")
	}
	return b.String()
}

// pickerBodyWidth = Tabellenbreite der Lobby: breit, aber gedeckelt, damit der
// zentrierte Block nicht über das halbe Terminal hinausläuft.
func (m model) pickerBodyWidth() int {
	w := m.termWidth() - 8
	if w > 72 {
		w = 72
	}
	if w < 30 {
		w = 30
	}
	return w
}

// viewHome rendert die Lobby: Logo + Untertitel + Projektliste als EIN zentrierter
// Block (jede Zeile in die gemeinsame Inhaltsbreite zentriert → nichts verrutscht),
// vertikal+horizontal im Frame platziert; Footer mit lokalen Tasten.
func (m model) viewHome() string {
	w := m.termWidth()
	lines := append([]string{}, m.homeLogoBlock()...)
	lines = append(lines, "",
		theme.Muted.Render("Sprint · Backlog · Review · Live-Cockpit"), "")
	lines = append(lines, strings.Split(m.projectPickerBody(m.pickerBodyWidth()), "\n")...)

	cw := 0 // Inhaltsbreite = breiteste Zeile (Logo oder Liste)
	for _, l := range lines {
		if x := lipgloss.Width(l); x > cw {
			cw = x
		}
	}
	for i := range lines {
		lines[i] = centerInto(lines[i], cw)
	}
	body := strings.Join(lines, "\n")

	hint := theme.Muted.Render(centerInto("i/k:↑↓   enter:open project   type:filter   ctrl+k:Cmd   q/esc:quit", w))
	h := m.frameH() // DD2-84: Innenhöhe (App-Außenrahmen reserviert)
	if h < 8 {
		h = 24 // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}
	placed := lipgloss.Place(w, h-1, lipgloss.Center, lipgloss.Center, body)
	return m.outerBorder(placed + "\n" + hint) // DD2-84
}

// projPickBox rendert den Projekt-Picker als schwebendes Overlay-Modal (DD2-124).
func (m model) projPickBox() string {
	pw := clampModalWidth(52, m.width)
	return modalPanel("Switch project", m.projectPickerBody(pw-4),
		"i/k: select   enter: open   type: filter   esc: close",
		pw, theme.Mauve)
}

// --- Handler ---

// goHome verlässt eine Projekt-View in die Lobby (DD2-124, q/esc-Spine). Sind die
// Projekte noch nicht geladen (Direkt-Start mit Projekt), werden sie nachgeladen.
func (m model) goHome() (tea.Model, tea.Cmd) {
	m.view = viewHome
	if len(m.projects) == 0 && m.global != nil {
		return m, loadProjects(m.global)
	}
	return m, nil
}

// openProjPick öffnet das Projekt-Picker-Overlay (p von überall, DD2-124).
func (m model) openProjPick() (tea.Model, tea.Cmd) {
	m.projPick = true
	m.projectQuery = ""
	m.projectSearch.SetValue("")
	m.plist.cursor = 0
	m.plist.setLen(len(m.projects))
	return m, loadProjects(m.global)
}

// selectProject lädt ein Projekt und springt in den Primat-View (Tree). Geteilte
// Auswahl-Logik der Lobby (viewHome) und des projPick-Overlays.
func (m model) selectProject(p api.Project) (tea.Model, tea.Cmd) {
	m.project = &p
	m.client = api.NewClient(fmt.Sprintf("%d", p.ID))
	// Read-Modify-Write (DD2-273): ein nackter Save(State{LastProject: ...}) würde
	// LastSeenVersion beim Projekt-Wechsel auf "" zurücksetzen → Overlay-Spam beim
	// nächsten Start trotz unverändertem appVersion.
	st, _ := config.Load()
	st.LastProject = p.Slug
	_ = config.Save(st)
	m.view = viewBrowseProject
	m.projPick = false
	m.treeCursor = 0
	m.milestones = nil
	m.depth = 0
	m.mlist = listState{}
	m.slist = listState{}
	m.ilist = listState{}
	m.curSprint = nil
	m.projectQuery = ""
	m.projectSearch.SetValue("")
	return m, tea.Batch(loadMilestones(m.client), loadTags(m.client))
}

// projFilterType leitet eine Taste ins Suchfeld und aktualisiert den Live-Filter.
func (m model) projFilterType(msg tea.KeyMsg) (model, tea.Cmd) {
	m.projectSearch.Focus()
	var cmd tea.Cmd
	m.projectSearch, cmd = m.projectSearch.Update(msg)
	prev := m.projectQuery
	m.projectQuery = strings.TrimSpace(m.projectSearch.Value())
	if m.projectQuery != prev {
		m.plist.cursor = 0
		m.plist.setLen(len(m.filteredProjects()))
	}
	return m, cmd
}

// keyHome steuert die Lobby (viewHome): Nav + Auswahl, esc → Beenden, tippen filtert.
func (m model) keyHome(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.plist.move(-1)
		return m, nil
	case "down":
		m.plist.setLen(len(m.filteredProjects()))
		m.plist.move(1)
		return m, nil
	case "enter":
		filtered := m.filteredProjects()
		if m.plist.cursor >= 0 && m.plist.cursor < len(filtered) {
			return m.selectProject(filtered[m.plist.cursor])
		}
		return m, nil
	}
	switch msg.String() {
	case "ctrl+c", "esc", "q": // DD2-124: q/esc aus der Lobby → Beenden-Confirm (DD2-49)
		return m.requestQuit()
	}
	nm, cmd := m.projFilterType(msg)
	return nm, cmd
}

// keyProjPick steuert das projPick-Overlay: Nav + Auswahl (→ viewBrowseProject), esc schließt.
func (m model) keyProjPick(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.plist.move(-1)
		return m, nil
	case "down":
		m.plist.setLen(len(m.filteredProjects()))
		m.plist.move(1)
		return m, nil
	case "enter":
		filtered := m.filteredProjects()
		if m.plist.cursor >= 0 && m.plist.cursor < len(filtered) {
			return m.selectProject(filtered[m.plist.cursor])
		}
		return m, nil
	}
	switch msg.String() {
	case "esc", "ctrl+c":
		m.projPick = false
		m.projectQuery = ""
		m.projectSearch.SetValue("")
		return m, nil
	}
	nm, cmd := m.projFilterType(msg)
	return nm, cmd
}
