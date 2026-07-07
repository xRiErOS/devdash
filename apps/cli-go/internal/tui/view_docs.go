package tui

import (
	"fmt"
	"path"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/clip"
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

// nextDocStatus zykelt den Docs-Status-Filter (DD2-255, Taste f): open→draft→
// active→archived→all→open. Vorbild nextTodoStatus (view_todo.go, DD2-242).
func nextDocStatus(cur string) string {
	switch cur {
	case "open":
		return "draft"
	case "draft":
		return "active"
	case "active":
		return "archived"
	case "archived":
		return "all"
	default: // "all", "" (Sonderfall, sollte via openDocs/openAllDocs nicht vorkommen)
		return "open"
	}
}

// docMatchesStatusFilter meldet, ob ein Dokument-Status unter den aktiven Filter
// fällt (DD2-254/255). "" und "all" zeigen alles; "open" bündelt draft+active
// (Default — archivierte Dokumente ausgeblendet); sonst exakter Status-Match.
func docMatchesStatusFilter(status, filter string) bool {
	switch filter {
	case "", "all":
		return true
	case "open":
		return status == "draft" || status == "active"
	default:
		return status == filter
	}
}

// filteredDocs wendet Status-Filter (DD2-254) und Titel-Filter auf docList an.
func (m *model) filteredDocs() []api.Document {
	q := strings.ToLower(strings.TrimSpace(m.docQuery))
	out := make([]api.Document, 0, len(m.docList))
	for _, d := range m.docList {
		if !docMatchesStatusFilter(d.Status, m.docStatusFilter) {
			continue
		}
		if q != "" && !strings.Contains(strings.ToLower(d.Title), q) {
			continue
		}
		out = append(out, d)
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
	return m.openDocsFromContextEx(false)
}

// openDocsFromContextEx wie openDocsFromContext; create=true hängt direkt den
// "n"-Editor-Launch an (DD2-237: create: document aus der Command-Palette, ohne
// den Browser separat zu betreten).
func (m model) openDocsFromContextEx(create bool) (tea.Model, tea.Cmd) {
	n := m.focusedNode()
	if n != nil {
		var mi tea.Model
		var cmd tea.Cmd
		switch n.kind {
		case tkMile:
			ms := m.milestones[n.mileIdx]
			mi, cmd = m.openDocs("milestone", ms.ID, ms.Name)
		case tkSprint:
			sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
			mi, cmd = m.openDocs("sprint", sp.ID, sp.Name)
		}
		if mi != nil {
			if create {
				return mi, tea.Batch(cmd, editInEditor("# Title\n\n", ".md"))
			}
			return mi, cmd
		}
	}
	return m, func() tea.Msg {
		return noticeMsg{text: "select a milestone or sprint in the tree first", kind: toastWarn}
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
	m.docStatusFilter = "open" // DD2-254: Default blendet archivierte Dokumente aus
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
	m.docStatusFilter = "open" // DD2-254: Default blendet archivierte Dokumente aus
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
	// DD2-252: r öffnet die Rename-Form für den file_path des selektierten Dokuments.
	if keybind.Matches(msg, keys.Rename) {
		return m.openDocRename()
	}
	// DD2-253: y kopiert das selektierte Dokument (Titel+Body als Markdown), Parität
	// zum Yank im Tree-Browser (keys.Yank, view_browse_project.go::treeYank).
	if keybind.Matches(msg, keys.Yank) {
		return m.docYank()
	}
	// DD2-255: f zykelt den Status-Filter (Vorbild DD2-242 nextTodoStatus). Cursor
	// zurücksetzen, sonst zeigt er nach dem Filterwechsel auf ein falsches Dokument.
	if keybind.Matches(msg, keys.Filter) {
		m.docStatusFilter = nextDocStatus(m.docStatusFilter)
		m.doclist = listState{}
		m.doclist.setLen(len(m.filteredDocs()))
		return m, nil
	}
	switch msg.String() {
	case "esc", "q":
		m.view = m.topReturn
		return m, nil
	case "/":
		m.docSearching = true
		m.docQuery = ""
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
				return noticeMsg{text: "create from a milestone/sprint (tree) context", kind: toastWarn}
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
	// DD2-256: Suche verortet sich im Kopf der Detail-Pane statt im Footer (klobberte
	// dort zuvor die Status-Zeile) — Prinzip wie treeSearchLine (view_browse_project.go),
	// hier bewusst rechts (Detail), da PO das explizit so wünschte.
	detTitle := "Detail"
	if m.docSearching {
		detTitle = "⌕ " + m.docQuery + "▏"
	}
	detP := pane{title: detTitle, rows: m.docDetailRows(rightW - 2), isList: false}
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("Documents"))
	footer := theme.Dim.Render("i/k:↑↓  /:search  enter:edit  n:new  d:delete  a:assign  r:rename  y:yank  f:filter  esc/q:back")
	if m.docSearching {
		footer = theme.Dim.Render("type: filter   enter: apply   esc: cancel")
	}
	// DD2-272: transiente Meldungen laufen über den Eck-Toast, nicht mehr über
	// diese Footer-Zeile.
	return head + "\n" + body + "\n" + footer
}

// docFilterLabel liefert den Anzeigenamen des Status-Filters für Titel/Footer (DD2-255).
func docFilterLabel(filter string) string {
	if filter == "" {
		return "open"
	}
	return filter
}

func (m model) docListTitle() string {
	filter := " [" + docFilterLabel(m.docStatusFilter) + "]"
	if m.docAllMode { // DD2-163 Rework: projektweiter Modus
		return fmt.Sprintf("All documents (%d)%s", len(m.filteredDocs()), filter)
	}
	owner := m.docOwnerName
	if owner == "" {
		owner = m.docOwnerType
	}
	return fmt.Sprintf("Docs ∙ %s (%d)%s", truncate(owner, 22), len(m.filteredDocs()), filter)
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

// docClip baut den Markdown-Kontext eines Dokuments fürs Yank (DD2-253) — Titel
// als Kopfzeile, Body darunter (Vorbild milestoneClip/sprintClip, context.go).
func docClip(d *api.Document) string {
	return "# " + d.Title + "\n\n" + d.Body
}

// docYank kopiert das selektierte Dokument in die Zwischenablage (DD2-253),
// Parität zum Tree-Yank (keys.Yank → yankContext/treeYank).
func (m model) docYank() (tea.Model, tea.Cmd) {
	cur := m.selDoc()
	if cur == nil {
		return m, nil
	}
	if err := clip.Copy(docClip(cur)); err != nil {
		return m.showToast(toastError, "Clipboard error: "+err.Error(), "", nil, false)
	}
	return m.showToast(toastInfo, "Document copied ("+cur.Title+")", "", nil, false)
}
