package tui

// tags.go — Tag-Manager (DD2-75) + Tag-Zuweisungs-Picker (DD2-33).
//   DD2-75: T öffnet viewTags (projektweite CRUD-Liste). n/e öffnen die huh-Form
//           (Name + Farb-Select), d löscht nach Confirm.
//   DD2-33: g öffnet ein Checkbox-Overlay über die Projekt-Tags für das fokussierte
//           Issue/Sprint/Meilenstein; enter ruft den vollständigen Replace.

import (
	"fmt"
	"strconv"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

// --- Farb-Mapping (Contract-Enum → Catppuccin-Token) ---

// tagColor übersetzt einen TagColors-Namen in ein Theme-Token (für den Swatch).
func tagColor(name string) lipgloss.Color {
	switch name {
	case "blue":
		return theme.Blue
	case "green":
		return theme.Green
	case "peach":
		return theme.Peach
	case "mauve":
		return theme.Mauve
	case "teal":
		return theme.Teal
	case "overlay0":
		return theme.Overlay
	}
	return theme.Overlay
}

// tagSwatch rendert „● name" in der Tag-Farbe.
func tagSwatch(t api.Tag) string {
	return lipgloss.NewStyle().Foreground(tagColor(t.Color)).Render("● " + t.Name)
}

// tagColorOptions liefert die Farb-Auswahl für das huh-Select (DD2-75).
func tagColorOptions() []huh.Option[string] {
	opts := make([]huh.Option[string], 0, len(api.TagColors))
	for _, c := range api.TagColors {
		opts = append(opts, huh.NewOption(c, c))
	}
	return opts
}

// tagMultiSelect liefert ein optionales Tag-Multiselect-Feld für die Create-Forms
// (DD2-33: Tags direkt beim Anlegen setzen — spart Create-dann-Zuweisen). Wert wird
// keyed gelesen (form.Get("tags").([]string)), nicht per Pointer (Value-Copy-Bruch).
func tagMultiSelect(tags []api.Tag) *huh.MultiSelect[string] {
	opts := make([]huh.Option[string], 0, len(tags))
	for _, t := range tags {
		opts = append(opts, huh.NewOption(t.Name, strconv.Itoa(t.ID)))
	}
	return huh.NewMultiSelect[string]().Key("tags").
		Title("Tags (optional)").
		Description("x: an/aus · enter: weiter — leer lassen = kein Tag").
		Options(opts...)
}

// buildTagForm baut die Tag-huh-Form (Name + Farbe), vorbelegt für edit (DD2-75).
func buildTagForm(name, color string) *huh.Form {
	n, c := name, color
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("name").Title("Name").Validate(nonEmpty).Value(&n),
		huh.NewSelect[string]().Key("color").Title("Farbe").Options(tagColorOptions()...).Value(&c),
	)).WithShowHelp(true)
}

// --- DD2-75: Manager-Screen ---

// openTagManager öffnet die Tag-Verwaltung (T) und merkt die Quell-View für esc/q.
func (m model) openTagManager() (tea.Model, tea.Cmd) {
	if m.view != viewTags {
		m.tagReturn = m.view
	}
	m.view = viewTags
	m.taglist = listState{}
	m.status = ""
	return m, loadTags(m.client)
}

// openTagForm öffnet die huh-Form für create (id=0) bzw. edit (id>0, vorbelegt).
func (m model) openTagForm(id int, name, color string) (tea.Model, tea.Cmd) {
	m.tagEditID = id
	if id == 0 {
		m.formKind = "tagCreate"
	} else {
		m.formKind = "tagEdit"
	}
	form := buildTagForm(name, color)
	form = form.WithWidth(formInnerWidth(m.width)).WithHeight(formInnerHeight(m.height))
	m.form = form
	m.status = ""
	return m, m.form.Init()
}

func (m model) keyTags(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.tagDelConfNo {
		return m.keyTagDelete(msg)
	}
	switch navKey(msg.String()) {
	case "up":
		m.taglist.move(-1)
		return m, nil
	case "down":
		m.taglist.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q":
		m.view = m.tagReturn
		m.status = ""
		return m, nil
	case "n": // neuer Tag
		return m.openTagForm(0, "", "mauve")
	case "e", "enter": // Tag bearbeiten
		if t := m.selTag(); t != nil {
			return m.openTagForm(t.ID, t.Name, t.Color)
		}
		return m, nil
	case "d": // Tag löschen (Confirm)
		if t := m.selTag(); t != nil {
			m.tagDelConfNo = true
			m.tagDelID = t.ID
			m.tagDelName = t.Name
			m.tagDelUsage = t.UsageCount
			m.status = ""
		}
		return m, nil
	}
	return m, nil
}

// selTag liefert den unter dem Cursor stehenden Tag (bounds-sicher).
func (m *model) selTag() *api.Tag {
	if m.taglist.cursor >= 0 && m.taglist.cursor < len(m.tags) {
		return &m.tags[m.taglist.cursor]
	}
	return nil
}

func (m model) keyTagDelete(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "Y", "enter":
		m.tagDelConfNo = false
		m.status = "Tag wird gelöscht …"
		return m, doDeleteTag(m.client, m.tagDelID, m.tagDelName)
	case "n", "N", "esc", "q":
		m.tagDelConfNo = false
		m.status = noticeText("Abgebrochen")
		return m, nil
	}
	return m, nil
}

// viewTags rendert die Tag-Verwaltungs-Liste (DD2-75).
func (m model) viewTags() string {
	var b strings.Builder
	b.WriteString(theme.Dim.Render("projektweite Tags — n:neu  e:edit  d:löschen") + "\n\n")
	if len(m.tags) == 0 {
		b.WriteString(theme.Dim.Render("(noch keine Tags — n legt den ersten an)") + "\n")
	}
	for i, t := range m.tags {
		cursor := "  "
		swatch := tagSwatch(t)
		if i == m.taglist.cursor {
			cursor = theme.Accent.Render("▸ ")
		}
		usage := theme.Dim.Render(fmt.Sprintf("  (%d×)", t.UsageCount))
		b.WriteString(cursor + swatch + usage + "\n")
	}
	body := b.String()
	if m.tagDelConfNo { // Confirm inline unter der Liste
		red := lipgloss.NewStyle().Foreground(theme.Red)
		body += "\n" + red.Render(fmt.Sprintf("Tag „%s\" löschen?", m.tagDelName))
		if m.tagDelUsage > 0 {
			body += theme.Dim.Render(fmt.Sprintf(" (entfernt %d Zuweisung[en])", m.tagDelUsage))
		}
		body += "  " + red.Render("y") + theme.Dim.Render(":löschen  ") + theme.Accent.Render("n/esc") + theme.Dim.Render(":abbrechen")
	}
	return m.framed("Tag-Manager", body, "n:neu  e:edit  d:löschen  esc:zurück  q:quit")
}

// --- DD2-33: Tag-Zuweisungs-Picker ---

// openTagPicker öffnet das Checkbox-Overlay für eine Entität. current = bereits
// gesetzte Tags (Issue: embedded; Sprint/Milestone: leer, wird async nachgeladen).
func (m model) openTagPicker(kind string, id int, label string, current []api.Tag) (tea.Model, tea.Cmd) {
	m.tagPick = true
	m.tagPickKind = kind
	m.tagPickID = id
	m.tagPickLabel = label
	m.tagPickAll = nil
	m.tagPickLoaded = false
	m.tagPickChecked = map[int]bool{}
	for _, t := range current {
		m.tagPickChecked[t.ID] = true
	}
	m.tagPickMenu = listState{}
	m.status = ""
	return m, loadTagPick(m.client, kind, id)
}

func (m model) keyTagPicker(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.tagPickMenu.move(-1)
		return m, nil
	case "down":
		m.tagPickMenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "t":
		m.tagPick = false
		m.status = ""
		return m, nil
	case " ", "x":
		if m.tagPickMenu.cursor >= 0 && m.tagPickMenu.cursor < len(m.tagPickAll) {
			id := m.tagPickAll[m.tagPickMenu.cursor].ID
			m.tagPickChecked[id] = !m.tagPickChecked[id]
		}
		return m, nil
	case "enter":
		var ids []int
		for _, t := range m.tagPickAll {
			if m.tagPickChecked[t.ID] {
				ids = append(ids, t.ID)
			}
		}
		m.tagPick = false
		m.status = "Tags werden gesetzt …"
		return m, doAssignTags(m.client, m.tagPickKind, m.tagPickID, ids, m.tagPickLabel)
	}
	return m, nil
}

// tagPickerMenu rendert das schwebende Checkbox-Overlay (DD2-33).
func (m model) tagPickerMenu() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Tags → "+truncate(m.tagPickLabel, 32)) + "\n")
	b.WriteString(theme.Dim.Render("space: an/aus   enter: setzen   esc: abbrechen") + "\n\n")
	switch {
	case !m.tagPickLoaded:
		b.WriteString(theme.Dim.Render("(lädt …)") + "\n")
	case len(m.tagPickAll) == 0:
		b.WriteString(theme.Dim.Render("(keine Tags — erst T: Tag-Manager)") + "\n")
	}
	for i, t := range m.tagPickAll {
		box := theme.Dim.Render("[ ]")
		if m.tagPickChecked[t.ID] {
			box = theme.Accent.Render("[x]")
		}
		cursor := "  "
		if i == m.tagPickMenu.cursor {
			cursor = theme.Accent.Render("▸ ")
		}
		b.WriteString(cursor + box + " " + tagSwatch(t) + "\n")
	}
	return lipgloss.NewStyle().
		Width(clampModalWidth(46, m.width)).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}

// patchIssueTags ersetzt die Tags eines Issues in allen lokalen Caches (DD2-33,
// live-Update analog mergeIssueIntoCache — Tags werden nur am Issue gerendert).
func (m *model) patchIssueTags(id int, tags []api.Tag) {
	for sid := range m.treeIssues {
		items := m.treeIssues[sid]
		for i := range items {
			if items[i].ID == id {
				items[i].Tags = tags
			}
		}
	}
	for i := range m.treeFilterIssues {
		if m.treeFilterIssues[i].ID == id {
			m.treeFilterIssues[i].Tags = tags
		}
	}
	if m.curSprint != nil {
		for i := range m.curSprint.Items {
			if m.curSprint.Items[i].ID == id {
				m.curSprint.Items[i].Tags = tags
			}
		}
	}
	for i := range m.backlog {
		if m.backlog[i].ID == id {
			m.backlog[i].Tags = tags
		}
	}
}

// --- Cmds + Msgs ---

type tagsLoadedMsg struct{ items []api.Tag }
type tagMutatedMsg struct{ label string } // create/update/delete → Liste neu
type tagPickDataMsg struct {
	kind       string
	id         int
	all        []api.Tag
	current    []api.Tag
	hasCurrent bool
}
type tagAssignedMsg struct {
	kind  string
	id    int
	tags  []api.Tag
	label string
}

func loadTags(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		ts, err := c.ListTags()
		if err != nil {
			return errMsg{err}
		}
		return tagsLoadedMsg{ts}
	}
}

func doCreateTag(c *api.Client, name, color string) tea.Cmd {
	return func() tea.Msg {
		t, err := c.CreateTag(name, color)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return tagMutatedMsg{"Tag angelegt: " + t.Name}
	}
}

func doUpdateTag(c *api.Client, id int, name, color string) tea.Cmd {
	return func() tea.Msg {
		t, err := c.UpdateTag(id, name, color)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return tagMutatedMsg{"Tag gespeichert: " + t.Name}
	}
}

func doDeleteTag(c *api.Client, id int, name string) tea.Cmd {
	return func() tea.Msg {
		if err := c.DeleteTag(id); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return tagMutatedMsg{"Tag gelöscht: " + name}
	}
}

// loadTagPick holt alle Projekt-Tags; für Sprint/Meilenstein zusätzlich die aktuell
// gesetzten (Issue trägt sie embedded → Vorbelegung kommt synchron vom Knoten).
func loadTagPick(c *api.Client, kind string, id int) tea.Cmd {
	return func() tea.Msg {
		all, err := c.ListTags()
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		msg := tagPickDataMsg{kind: kind, id: id, all: all}
		switch kind {
		case "sprint":
			if cur, err := c.GetSprintTags(id); err == nil {
				msg.current, msg.hasCurrent = cur, true
			}
		case "milestone":
			if cur, err := c.GetMilestoneTags(id); err == nil {
				msg.current, msg.hasCurrent = cur, true
			}
		}
		return msg
	}
}

func doAssignTags(c *api.Client, kind string, id int, ids []int, label string) tea.Cmd {
	return func() tea.Msg {
		var tags []api.Tag
		var err error
		switch kind {
		case "issue":
			tags, err = c.SetIssueTags(id, ids)
		case "sprint":
			tags, err = c.SetSprintTags(id, ids)
		case "milestone":
			tags, err = c.SetMilestoneTags(id, ids)
		}
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return tagAssignedMsg{kind, id, tags, label}
	}
}
