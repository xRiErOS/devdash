package tui

import (
	"fmt"
	"path"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// view_docs.go — Dokumente-Browser (DD2-167): MasterDetail über die documents
// eines Owners (Meilenstein ODER Sprint, DD2#22). Owner kommt aus dem Tree-Kontext
// (fokussierter Knoten). Titel-Filter (/), neovim-Edit des body (enter), Create (n),
// Delete (d). Einstieg via Command-Palette (nur sinnvoll mit fokussiertem
// Meilenstein/Sprint).

// filteredDocs wendet den clientseitigen Titel-Filter auf docList an.
func (m *model) filteredDocs() []api.Document {
	q := strings.ToLower(strings.TrimSpace(m.docQuery))
	if q == "" {
		return m.docList
	}
	out := make([]api.Document, 0, len(m.docList))
	for _, d := range m.docList {
		if strings.Contains(strings.ToLower(d.Title), q) {
			out = append(out, d)
		}
	}
	return out
}

func (m *model) selDoc() *api.Document {
	list := m.filteredDocs()
	if m.doclist.cursor >= 0 && m.doclist.cursor < len(list) {
		return &list[m.doclist.cursor]
	}
	return nil
}

// openDocsFromContext leitet den Owner aus dem fokussierten Tree-Knoten ab und
// öffnet den Docs-Browser. Ohne Meilenstein-/Sprint-Fokus → Hinweis.
func (m model) openDocsFromContext() (tea.Model, tea.Cmd) {
	n := m.focusedNode()
	if n != nil {
		switch n.kind {
		case tkMile:
			ms := m.milestones[n.mileIdx]
			return m.openDocs("milestone", ms.ID, ms.Name)
		case tkSprint:
			sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
			return m.openDocs("sprint", sp.ID, sp.Name)
		}
	}
	return m, func() tea.Msg {
		return noticeMsg{"select a milestone or sprint in the tree first"}
	}
}

// openDocs öffnet den Docs-Browser für einen konkreten Owner.
func (m model) openDocs(ownerType string, ownerID int, ownerName string) (tea.Model, tea.Cmd) {
	m.view = viewDocs
	m.doclist = listState{}
	m.docList = nil
	m.docOwnerType = ownerType
	m.docOwnerID = ownerID
	m.docOwnerName = ownerName
	m.docSearching = false
	m.docQuery = ""
	m.docEditID = 0
	m.docAllMode = false
	m.status = ""
	return m, loadDocs(m.client, ownerType, ownerID)
}

// openAllDocs öffnet den globalen Docs-Browser (alle Dokumente des Projekts,
// entitätsübergreifend) — DD2-163 Rework. Owner pro Dokument wird beim Edit/Delete
// aus der Zeile aufgelöst (docOwnerOf); Create ist hier mangels Owner gesperrt.
func (m model) openAllDocs() (tea.Model, tea.Cmd) {
	m.view = viewDocs
	m.doclist = listState{}
	m.docList = nil
	m.docOwnerType = ""
	m.docOwnerID = 0
	m.docOwnerName = ""
	m.docSearching = false
	m.docQuery = ""
	m.docEditID = 0
	m.docAllMode = true
	m.status = ""
	return m, loadAllDocs(m.client)
}

// docOwnerOf leitet (ownerType, ownerID) aus einer Dokument-Zeile ab (All-Docs-Modus).
func docOwnerOf(d *api.Document) (string, int) {
	if d.MilestoneID != nil {
		return "milestone", *d.MilestoneID
	}
	if d.SprintID != nil {
		return "sprint", *d.SprintID
	}
	return "", 0
}

// keyDocs steuert den Browser. Voll-Intercept (/ tippt Suche).
func (m model) keyDocs(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.docSearching {
		return m.keyDocsSearch(msg)
	}
	switch navKey(msg.String()) {
	case "up":
		m.doclist.move(-1)
		return m, nil
	case "down":
		m.doclist.move(1)
		return m, nil
	}
	// DD2-243: a öffnet den Meilenstein/Sprint-Zuweisungs-Picker (Parität zu Backlog,
	// keys.Assign) — zentrale Keymap, restliche Docs-Keys bleiben roh (out-of-scope).
	if keybind.Matches(msg, keys.Assign) {
		return m.openDocAssign()
	}
	switch msg.String() {
	case "esc", "q":
		m.view = m.topReturn
		m.status = ""
		return m, nil
	case "/":
		m.docSearching = true
		m.docQuery = ""
		m.status = ""
		return m, nil
	case "enter": // edit body in neovim
		cur := m.selDoc()
		if cur == nil {
			return m, nil
		}
		if m.docAllMode { // DD2-163 Rework: Owner aus der Zeile auflösen
			m.docOwnerType, m.docOwnerID = docOwnerOf(cur)
		}
		m.docEditID = cur.ID
		return m, editInEditor(cur.Body, ".md")
	case "n": // create: erste Buffer-Zeile = title
		if m.docAllMode { // ohne Owner kein Create — aus Meilenstein/Sprint-Kontext anlegen
			return m, func() tea.Msg {
				return noticeMsg{"create from a milestone/sprint (tree) context"}
			}
		}
		m.docEditID = 0
		return m, editInEditor("# Title\n\n", ".md")
	case "d":
		cur := m.selDoc()
		if cur == nil {
			return m, nil
		}
		if m.docAllMode { // DD2-163 Rework: Owner aus der Zeile auflösen
			m.docOwnerType, m.docOwnerID = docOwnerOf(cur)
		}
		return m.openDelete("document", cur.ID, cur.Title)
	}
	return m, nil
}

// keyDocsSearch ist der Titel-Suchmodus (clientseitig, live).
func (m model) keyDocsSearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter, tea.KeyEsc:
		m.docSearching = false
		if msg.Type == tea.KeyEsc {
			m.docQuery = ""
		}
		m.doclist = listState{}
		return m, nil
	case tea.KeyBackspace, tea.KeyDelete:
		if len(m.docQuery) > 0 {
			r := []rune(m.docQuery)
			m.docQuery = string(r[:len(r)-1])
			m.doclist = listState{}
		}
		return m, nil
	case tea.KeyRunes, tea.KeySpace:
		m.docQuery += string(msg.Runes)
		m.doclist = listState{}
		return m, nil
	}
	return m, nil
}

// --- View ---

func (m model) viewDocs() string {
	w := m.termWidth()
	h := m.bodyHeight()
	leftW, rightW := m.masterDetailWidths(w)

	left := m.docLeftPane(leftW, h)
	detP := pane{title: "Detail", rows: m.docDetailRows(rightW - 2), isList: false}
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("Documents"))
	footer := theme.Dim.Render("i/k:↑↓  /:search  enter:edit  n:new  d:delete  a:assign  esc/q:back")
	if m.docSearching {
		footer = theme.Key.Render("Search: ") + m.docQuery + "▏"
	} else if m.status != "" {
		footer = m.status
	}
	return head + "\n" + body + "\n" + footer
}

func (m model) docListTitle() string {
	if m.docAllMode { // DD2-163 Rework: projektweiter Modus
		return fmt.Sprintf("All documents (%d)", len(m.filteredDocs()))
	}
	owner := m.docOwnerName
	if owner == "" {
		owner = m.docOwnerType
	}
	return fmt.Sprintf("Docs ∙ %s (%d)", truncate(owner, 22), len(m.filteredDocs()))
}

// docLeftPane rendert die Master-Liste mit umbrechenden Titeln (DD2-244 Rework,
// Reject-Fix — PO: Titel brechen in der Ranleiste weiterhin nicht um). Eigener
// Renderer (nicht renderPane), analog todoLeftPane (DD2-171/DD2-239): ein Dokument
// belegt dadurch mehrere visuelle Zeilen, blockWindow/windowBlocks fenstern die
// Blöcke auf die Innenhöhe, der Cursor-Block bleibt sichtbar.
func (m model) docLeftPane(w, h int) string {
	title := m.docListTitle()
	head := []string{
		theme.Header.Render(truncate(title, w)),
		theme.Dim.Render(strings.Repeat("─", min(w, lipgloss.Width(title)+2))),
	}
	list := m.filteredDocs()
	if len(list) == 0 {
		msg := "(none — n: new, / search)"
		if m.docAllMode {
			msg = "(no documents — / search)"
		}
		head = append(head, theme.Dim.Render(msg))
		return borderedPane(head, w, h, theme.Mauve)
	}
	blocks := make([][]string, len(list))
	for i, d := range list {
		ownerPrefix := ""
		if m.docAllMode && d.OwnerName != "" { // Owner-Name voranstellen (entitätsübergreifend)
			ownerPrefix = "[" + truncate(d.OwnerName, 14) + "] "
		}
		indent := strings.Repeat(" ", lipgloss.Width(ownerPrefix))
		wrapW := w - 2 - lipgloss.Width(ownerPrefix) // -2 = Cursor/Indent-Spalte
		if wrapW < 8 {
			wrapW = 8
		}
		// DD2-251: Zeile 1 = Dateiname (Klammer-Notation wie ownerPrefix), Zeile 2+ =
		// gewrappter Titel darunter — PO-Layout-Wunsch nach DD2-244.
		fname := "(no file)"
		if fp := deref(d.FilePath); fp != "" {
			fname = path.Base(fp)
		}
		fileLine := ownerPrefix + "[" + fname + "]"
		titleSegs := strings.Split(wrapText(d.Title, wrapW), "\n")
		var allLines []string
		allLines = append(allLines, fileLine)
		for _, seg := range titleSegs {
			allLines = append(allLines, indent+seg)
		}
		sel := i == m.doclist.cursor
		var block []string
		for j, plain := range allLines {
			cursor := "  "
			var text string
			switch {
			case sel:
				if j == 0 {
					cursor = theme.Accent.Render("▸ ")
				}
				text = theme.Accent.Render(plain) // ganze Item-Zeile tönen
			case j == 0:
				text = theme.Dim.Render(plain) // Dateiname-Zeile gedimmt
			default:
				text = plain
			}
			block = append(block, cursor+text)
		}
		blocks[i] = block
	}
	itemH := h - len(head)
	if itemH < 1 {
		itemH = 1
	}
	lines := append(head, windowBlocks(blocks, itemH, m.doclist.cursor)...)
	return borderedPane(lines, w, h, theme.Mauve)
}

func (m model) docDetailRows(width int) []string {
	cur := m.selDoc()
	if cur == nil {
		return []string{theme.Dim.Render("(select a document →)")}
	}
	// DD2-244: langer Titel wird mehrzeilig gewrappt statt (via renderPane) auf
	// eine Zeile abgeschnitten — im Detail soll der volle Titel lesbar sein.
	titleW := width
	if titleW < 8 {
		titleW = 8
	}
	var rows []string
	for _, line := range strings.Split(wrapText(cur.Title, titleW), "\n") {
		rows = append(rows, theme.Header.Render(line))
	}
	// DD2-167 Rework: Metadaten-Header (created/updated/status).
	if meta := entityMetaLine(cur.CreatedAt, cur.UpdatedAt, cur.Status); meta != "" {
		rows = append(rows, meta)
	}
	rows = append(rows, "")
	if strings.TrimSpace(cur.Body) == "" {
		rows = append(rows, theme.Dim.Render("(empty — enter to edit)"))
	} else {
		rows = append(rows, strings.Split(glowRender(cur.Body, width), "\n")...)
	}
	if fp := deref(cur.FilePath); fp != "" {
		rows = append(rows, "", theme.Dim.Render("file: "+fp))
	}
	return rows
}
