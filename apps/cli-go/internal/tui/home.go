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

// centerLine setzt s mittig auf w Spalten (ANSI-sichere Breite via lipgloss.Width).
func centerLine(s string, w int) string {
	sw := lipgloss.Width(s)
	if sw >= w {
		return s
	}
	return strings.Repeat(" ", (w-sw)/2) + s
}

// homeLogo rendert das zentrierte Mauve-Banner; auf schmalen Terminals fällt es
// auf einen kompakten Titel zurück.
func (m model) homeLogo(w int) string {
	lw := 0
	for _, l := range homeLogoLines {
		if x := lipgloss.Width(l); x > lw {
			lw = x
		}
	}
	if w < lw+2 {
		return centerLine(theme.Header.Render("DevDashboard"), w)
	}
	style := lipgloss.NewStyle().Foreground(theme.Mauve)
	out := make([]string, len(homeLogoLines))
	for i, l := range homeLogoLines {
		out[i] = centerLine(style.Render(l), w)
	}
	return strings.Join(out, "\n")
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
		b.WriteString(theme.Muted.Render("  (keine Treffer)") + "\n")
	} else if len(m.projects) == 0 {
		b.WriteString(theme.Muted.Render("  (lädt Projekte …)") + "\n")
	}
	return b.String()
}

// homeListBlock zentriert die Projektliste als Block unter dem Logo.
func (m model) homeListBlock(w int) string {
	lines := strings.Split(m.projectPickerBody(), "\n")
	bw := 0
	for _, l := range lines {
		if x := lipgloss.Width(l); x > bw {
			bw = x
		}
	}
	if bw < 30 {
		bw = 30
	}
	pad := 0
	if w > bw {
		pad = (w - bw) / 2
	}
	prefix := strings.Repeat(" ", pad)
	for i := range lines {
		if strings.TrimSpace(lines[i]) != "" {
			lines[i] = prefix + lines[i]
		}
	}
	return strings.Join(lines, "\n")
}

// viewHome rendert die Lobby: Logo zentriert oben, Projektliste darunter, mittig
// im Frame platziert; Footer mit lokalen Tasten. ctrl+k/p sind global zugänglich.
func (m model) viewHome() string {
	w := m.termWidth()
	var b strings.Builder
	b.WriteString(m.homeLogo(w) + "\n\n")
	b.WriteString(centerLine(theme.Muted.Render("Sprint · Backlog · Review · Live-Cockpit"), w) + "\n\n")
	b.WriteString(m.homeListBlock(w))

	hint := theme.Muted.Render(centerLine("i/k:↑↓   enter:Projekt öffnen   tippen:filtern   ctrl+k:Cmd   esc:beenden", w))
	h := m.height
	if h < 8 {
		h = 24 // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}
	placed := lipgloss.Place(w, h-1, lipgloss.Center, lipgloss.Center, b.String())
	return placed + "\n" + hint
}

// projPickBox rendert den Projekt-Picker als schwebendes Overlay-Modal (DD2-124).
func (m model) projPickBox() string {
	return modalPanel("Projekt wechseln", m.projectPickerBody(),
		"i/k: wählen   enter: öffnen   tippen: filtern   esc: zu",
		clampModalWidth(52, m.width), theme.Mauve)
}

// --- Handler ---

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
	case "ctrl+c", "esc": // DD2-124: esc aus der Lobby → Beenden-Confirm (DD2-49)
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
