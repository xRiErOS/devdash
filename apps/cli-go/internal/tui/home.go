package tui

// home.go — DD2-124: viewHome (Startschirm/Lobby) + projPick-Overlay.
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

// projectPickerBody rendert Suchzeile + gefilterte Projektliste — geteilt von
// der viewHome-Lobby und dem projPick-Overlay (Single Source, kein Zweit-Layout).
func (m model) projectPickerBody() string {
	ti := m.projectSearch
	if m.projectQuery != "" {
		ti.TextStyle = lipgloss.NewStyle().Foreground(theme.Red)
	} else {
		ti.TextStyle = lipgloss.NewStyle().Foreground(theme.Text)
	}
	var b strings.Builder
	b.WriteString(theme.Muted.Render("⌕ ") + ti.View() + "\n\n")
	filtered := m.filteredProjects()
	for i, p := range filtered {
		cursor := "  "
		name := lipgloss.NewStyle().Foreground(theme.Text).Render(p.Name)
		hint := theme.Muted.Render(fmt.Sprintf("(%s · %s)", p.Prefix, p.Slug))
		if i == m.plist.cursor {
			cursor = theme.Accent.Render("▸ ")
			name = theme.Header.Render(p.Name)
		}
		b.WriteString(cursor + name + "  " + hint + "\n")
	}
	if len(filtered) == 0 && len(m.projects) > 0 {
		b.WriteString(theme.Muted.Render("  (no matches)") + "\n")
	} else if len(m.projects) == 0 {
		b.WriteString(theme.Muted.Render("  (loading projects …)") + "\n")
	}
	return b.String()
}

// viewHome rendert die Lobby: Logo + Untertitel + Projektliste als EIN zentrierter
// Block (jede Zeile in die gemeinsame Inhaltsbreite zentriert → nichts verrutscht),
// vertikal+horizontal im Frame platziert; Footer mit lokalen Tasten.
func (m model) viewHome() string {
	w := m.termWidth()
	lines := append([]string{}, m.homeLogoBlock()...)
	lines = append(lines, "",
		theme.Muted.Render("Sprint · Backlog · Review · Live-Cockpit"), "")
	lines = append(lines, strings.Split(m.projectPickerBody(), "\n")...)

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
	return modalPanel("Switch project", m.projectPickerBody(),
		"i/k: select   enter: open   type: filter   esc: close",
		clampModalWidth(52, m.width), theme.Mauve)
}

// --- Handler ---

// goHome verlässt eine Projekt-View in die Lobby (DD2-124, q/esc-Spine). Sind die
// Projekte noch nicht geladen (Direkt-Start mit Projekt), werden sie nachgeladen.
func (m model) goHome() (tea.Model, tea.Cmd) {
	m.view = viewHome
	m.status = ""
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
	m.status = ""
	return m, loadProjects(m.global)
}

// selectProject lädt ein Projekt und springt in den Primat-View (Tree). Geteilte
// Auswahl-Logik der Lobby (viewHome) und des projPick-Overlays.
func (m model) selectProject(p api.Project) (tea.Model, tea.Cmd) {
	m.project = &p
	m.client = api.NewClient(fmt.Sprintf("%d", p.ID))
	_ = config.Save(config.State{LastProject: p.Slug})
	m.view = viewTree
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

// keyProjPick steuert das projPick-Overlay: Nav + Auswahl (→ viewTree), esc schließt.
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
