package tui

// tree.go — Tree+Detail-Layout-Prototyp (DD2-57). Vergleichs-Kandidat zum
// Ranger-Columns-Layout: EINE schmale linke Baum-Spalte (Meilenstein→Sprint→
// Issue, kollabierbar, Pfeiltasten-Nav) zeigt die ganze Hierarchie auf einmal;
// rechts bleibt breite Detail-Fläche. Umschalten aus den Columns mit 't'.
// Bewusst self-contained (leicht vergleichbar/entfernbar). Golden Rule #1:
// Pane-Höhe über Content-Füllung, kein Height() auf bordered Style.

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/clip"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

type treeKind int

const (
	tkMile treeKind = iota
	tkSprint
	tkIssue
	tkInfo // Platzhalter: (lädt …) / (keine Issues)
)

// treeNode ist eine sichtbare (geflachte) Zeile des Baums. Index-Referenzen statt
// Pointer, damit das Value-Receiver-Modell sauber bleibt.
type treeNode struct {
	kind     treeKind
	mileIdx  int
	sprIdx   int
	sprintID int
	issIdx   int
	depth    int
	expand   bool // ist auf-/zuklappbar?
	open     bool
	label    string     // nur tkInfo
	issue    *api.Issue // tkIssue: aufgelöstes Issue (Lazy-Cache ODER Filter-Quelle)
}

// ffItem ist eine Zeile im Tree-Filter-Menü (DD2-62 Rework): eine toggle-bare
// Facetten-Option. facet ∈ {art,type,status}; value der Maschinen-Schlüssel.
type ffItem struct {
	facet string
	value string
	label string
}

// mileDisplayName liefert den Anzeige-Namen eines Meilensteins; der synthetische
// No-Milestone-Sammelknoten (leerer Name) bekommt ein klares Label (DD2-115).
func mileDisplayName(name string) string {
	if strings.TrimSpace(name) == "" {
		return "(no milestone)"
	}
	return name
}

// kindOf übersetzt einen Art-Facetten-Wert in das treeKind.
func kindOf(v string) treeKind {
	switch v {
	case "sprint":
		return tkSprint
	case "issue":
		return tkIssue
	default:
		return tkMile
	}
}

// treeFilterActive = mindestens eine Filter-Facette gesetzt (Art/Type/Status).
func (m *model) treeFilterActive() bool {
	return len(m.fArt)+len(m.fType)+len(m.fStatus)+len(m.fTags) > 0
}

// treeActive = Filter ODER Textsuche aktiv → gefilterte Flachung statt Expansions-Baum.
func (m *model) treeActive() bool {
	return m.treeFilterActive() || strings.TrimSpace(m.treeQuery) != ""
}

// treeNodes flacht den Baum entsprechend der Expansions-Sets in eine sichtbare
// Zeilenliste. Issues werden lazy aus treeIssues[sprintID] gezogen. Bei aktivem
// Filter/Suche (treeActive) ersetzt die Filter-Flachung die Expansions-Logik.
func (m *model) treeNodes() []treeNode {
	if m.treeActive() {
		return m.treeNodesFiltered()
	}
	var nodes []treeNode
	for mi := range m.milestones {
		ms := &m.milestones[mi]
		nodes = append(nodes, treeNode{kind: tkMile, mileIdx: mi, depth: 0,
			expand: len(ms.Sprints) > 0, open: m.treeExpMile[ms.ID]})
		if !m.treeExpMile[ms.ID] {
			continue
		}
		for si := range ms.Sprints {
			sp := &ms.Sprints[si]
			nodes = append(nodes, treeNode{kind: tkSprint, mileIdx: mi, sprIdx: si,
				sprintID: sp.ID, depth: 1, expand: true, open: m.treeExpSprint[sp.ID]})
			if !m.treeExpSprint[sp.ID] {
				continue
			}
			items, ok := m.treeIssues[sp.ID]
			if !ok {
				nodes = append(nodes, treeNode{kind: tkInfo, depth: 2, label: "(loading …)"})
				continue
			}
			if len(items) == 0 {
				nodes = append(nodes, treeNode{kind: tkInfo, depth: 2, label: "(no issues)"})
				continue
			}
			for ii := range items {
				nodes = append(nodes, treeNode{kind: tkIssue, mileIdx: mi, sprIdx: si,
					sprintID: sp.ID, issIdx: ii, depth: 2, issue: &items[ii]})
			}
		}
	}
	return nodes
}

// treeNodesFiltered zeigt nur Pfade zu Treffern (DD2-62). Treffer = Knoten, dessen
// Art (fArt) erlaubt ist UND Status (fStatus) UND — bei Issues — Issue-Type (fType)
// UND Textsuche (treeQuery) passen. Vorfahren von Treffern bleiben als Kontext
// sichtbar (Pfad), unabhängig von der Art-Facette. Issue-Quelle ist projektweit
// (treeFilterIssues, einmal geladen), sonst der Lazy-Cache (treeIssues).
func (m *model) treeNodesFiltered() []treeNode {
	q := strings.ToLower(strings.TrimSpace(m.treeQuery))
	artAll := len(m.fArt) == 0
	showKind := func(k treeKind) bool { return artAll || m.fArt[k] }
	typeOK := func(t string) bool { return len(m.fType) == 0 || m.fType[t] }
	statusOK := func(s string) bool { return len(m.fStatus) == 0 || m.fStatus[s] }
	matchText := func(s string) bool { return q == "" || strings.Contains(strings.ToLower(s), q) }
	tagOK := func(tags []api.Tag) bool { // DD2-116: Issue hat ≥1 gewähltes Tag (sonst alle ok)
		if len(m.fTags) == 0 {
			return true
		}
		for _, t := range tags {
			if m.fTags[t.Name] {
				return true
			}
		}
		return false
	}

	// Gruppierung nach Sprint-ID; stabile Slices, damit &items[ii]-Pointer halten.
	bySprint := map[int][]api.Issue{}
	if m.treeIssuesLoaded {
		for _, it := range m.treeFilterIssues {
			if it.AssignedSprint != nil {
				bySprint[*it.AssignedSprint] = append(bySprint[*it.AssignedSprint], it)
			}
		}
	} else {
		for sid, items := range m.treeIssues {
			bySprint[sid] = items
		}
	}

	var nodes []treeNode
	for mi := range m.milestones {
		ms := &m.milestones[mi]
		mileHit := showKind(tkMile) && statusOK(ms.Status) && matchText(ms.Name)
		var subs []treeNode
		for si := range ms.Sprints {
			sp := &ms.Sprints[si]
			spHit := showKind(tkSprint) && statusOK(sp.Status) && matchText(sp.Key+" "+sp.Name)
			items := bySprint[sp.ID]
			var iss []treeNode
			for ii := range items {
				it := &items[ii]
				if showKind(tkIssue) && typeOK(it.Type) && statusOK(it.Status) && tagOK(it.Tags) && matchText(it.Key+" "+it.Title) {
					iss = append(iss, treeNode{kind: tkIssue, mileIdx: mi, sprIdx: si,
						sprintID: sp.ID, issIdx: ii, depth: 2, issue: it})
				}
			}
			if spHit || len(iss) > 0 { // Sprint als Treffer ODER als Pfad-Vorfahr
				subs = append(subs, treeNode{kind: tkSprint, mileIdx: mi, sprIdx: si,
					sprintID: sp.ID, depth: 1, expand: true, open: true})
				subs = append(subs, iss...)
			}
		}
		if mileHit || len(subs) > 0 {
			nodes = append(nodes, treeNode{kind: tkMile, mileIdx: mi, depth: 0,
				expand: len(ms.Sprints) > 0, open: true})
			nodes = append(nodes, subs...)
		}
	}
	return nodes
}

// treeLayout liefert Header, lokale Shortcuts und die Pane-Geometrie des Primat-
// Views (DD2-61). Single Source für Render (viewTree) UND Maus-Klick-Mapping
// (handleMouse, DD2-51) — sonst driften Render-Zeilen und Klick-Y auseinander.
func (m model) treeLayout() (head, localKeys string, lw, rw, innerH int) {
	w := m.termWidth()
	head = m.breadcrumb("Project browser") // Zone 1: `> slug: Title` + globale Shortcuts
	// Zone 3 = NUR view-spezifische Tasten; globale (b/R/p/q/Cmd) stehen bereits im
	// Header rechts → nicht doppeln (verwirrt, PO-Befund Augenschein).
	hint := "i/k:↑↓  l/→:expand  j/←:collapse  1…n:section  s:status  S:milestone  d:delete  y:yank  /:search  f:filter  t:tags  ctrl+r:reload"
	switch {
	case m.treeSearching:
		hint = "type: filter   enter: apply   esc: cancel"
	case m.detailFocus: // DD2-76/86: Detail-Pane fokussiert — Section/Feld-Navigation
		hint = "i/k:section/field  l/→:in  enter:in/edit  j/←:back  1…n:section  esc: tree focus"
	case m.treeActive():
		hint = "i/k:↑↓  l/→:expand  s:status  /:search  f:filter  esc: clear filter+search  t:tags  ctrl+r:reload"
	}
	localKeys = theme.Muted.Render(wrapText(hint, w)) // Zone 3: lokale Shortcuts
	footH := lipgloss.Height(localKeys) + 1           // + 1 Status-Zeile (Split-Status)
	avail := m.frameH() - lipgloss.Height(head) - footH // DD2-84: Innenhöhe (Rahmen reserviert)
	if avail < 4 {
		avail = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}
	lw = m.cfg.Layout.TreeWidth // DD2-40: konfigurierbar (layout.tree_width)
	if lw <= 0 {
		lw = 36 // Default / zero-Config (Tests ohne geladene Settings)
	}
	if cap := w * 2 / 5; lw > cap {
		lw = cap
	}
	if lw < 24 {
		lw = 24
	}
	rw = w - lw - 4 // je Pane 2 Border-Spalten
	if rw < 20 {
		rw = 20
	}
	innerH = avail - 2 // Border oben/unten — NICHT via Height() (Golden Rule #1)
	if innerH < 3 {
		innerH = 3
	}
	return
}

func (m model) viewTree() string {
	nodes := m.treeNodes()
	if m.treeCursor >= len(nodes) {
		m.treeCursor = len(nodes) - 1
	}
	if m.treeCursor < 0 {
		m.treeCursor = 0
	}
	head, localKeys, lw, rw, innerH := m.treeLayout()

	// Linke Spalte: Such-/Filterbox als Kopfzeile (DD2-62), darunter die Baumzeilen
	// gefenstert um den Cursor. Die Kopfzeile kostet 1 Zeile der Innenhöhe.
	searchLine := m.treeSearchLine(lw - 2)
	treeLines := m.treeLeftLines(nodes, lw-2, !m.detailFocus) // Cursor friert bei Detail-Fokus (D03)
	treeLines = windowAround(treeLines, innerH-1, m.treeCursor)
	left := append([]string{searchLine}, treeLines...)
	for len(left) < innerH {
		left = append(left, "")
	}

	// Rechte Spalte: Detail des selektierten Knotens. Bei leerer Knotenliste
	// (Daten noch nicht geladen, da viewTree Primat-Default ist) NICHT auf die
	// Zero-treeNode{} fallen — die wäre kind=tkMile/mileIdx=0 und würde
	// m.milestones[0] auf leerer Slice greifen (Panic). Platzhalter stattdessen.
	var detailStr string
	if len(nodes) > 0 {
		detailStr = m.treeDetail(nodes[m.treeCursor], rw-2)
	} else {
		detailStr = theme.Dim.Render("(loading … — l/→ expands)")
	}
	detail := strings.Split(detailStr, "\n")
	for i := range detail {
		detail[i] = truncate(detail[i], rw-2)
	}
	if len(detail) > innerH {
		detail = detail[:innerH]
	}
	for len(detail) < innerH {
		detail = append(detail, "")
	}

	// D03: Pane-Border-Tausch — der fokussierte Pane ist Mauve (aktiv), der andere
	// Overlay (inaktiv). Tree-Fokus = links Mauve, Detail-Fokus = rechts Mauve.
	leftCol, rightCol := paneBorderColors(m.detailFocus)
	leftBox := lipgloss.NewStyle().Width(lw).
		Border(lipgloss.RoundedBorder()).BorderForeground(leftCol).
		Render(strings.Join(left, "\n"))
	rightBox := lipgloss.NewStyle().Width(rw).
		Border(lipgloss.RoundedBorder()).BorderForeground(rightCol).
		Render(strings.Join(detail, "\n"))
	body := lipgloss.JoinHorizontal(lipgloss.Top, leftBox, rightBox)

	status := m.statusBar("") // Zone 4: Split-Status (Info blau | Fehler rot)
	return m.outerBorder(head + "\n" + body + "\n" + localKeys + "\n" + status) // DD2-84
}

// treeLeftLines rendert die Baumzeilen (mit Expand-Marker, Einrückung, Cursor).
// Der Cursor wird per absolutem Index gesetzt, bevor windowAround fenstert.
func (m model) treeLeftLines(nodes []treeNode, w int, active bool) []string {
	lines := make([]string, 0, len(nodes))
	for i, n := range nodes {
		marker := "  "
		if n.expand {
			if n.open {
				marker = "▾ "
			} else {
				marker = "▸ "
			}
		}
		var label string
		switch n.kind {
		case tkMile:
			ms := m.milestones[n.mileIdx]
			label = statusDot(ms.Status) + " " + mileDisplayName(ms.Name)
		case tkSprint:
			sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
			if sp.Status == "cancelled" { // DD2-133 Rework: ID/Key bleibt weiß (wie completed), NUR der Status-Text grau
				label = sp.Key + " " + theme.Dim.Render(sp.Status)
			} else {
				label = sp.Key + " " + statusText(sp.Status)
			}
		case tkIssue:
			if n.issue != nil { // aufgelöst (Lazy-Cache ODER Filter-Quelle)
				label = theme.TypeIcon(n.issue.Type) + " " + theme.Key.Render(n.issue.Key)
			}
		case tkInfo:
			label = theme.Dim.Render(n.label)
		}
		row := strings.Repeat("  ", n.depth) + marker + label
		if i == m.treeCursor {
			// D08: Cursor = Balken ▌ + ganze Zeile in Akzentfarbe getönt. Eigen-Farben
			// der Zelle (Status-Dot, Key, Typ-Icon) werden gestrippt und einheitlich
			// in Akzent umgefärbt — die Selektion ist als Ganzes erkennbar. Bei Detail-
			// Fokus friert der Tree-Cursor (D03): Balken bleibt, aber muted/Overlay statt
			// Accent — nur der fokussierte Pane zeigt seinen aktiven Cursor.
			plain := truncate(ansi.Strip(row), w-1)
			if active {
				lines = append(lines, theme.Accent.Render("▌"+plain))
			} else {
				lines = append(lines, theme.Dim.Render("▌"+plain))
			}
		} else {
			lines = append(lines, " "+truncate(row, w-1))
		}
	}
	return lines
}

// syncDeps lädt die Abhängigkeiten des fokussierten Milestone-/Sprint-Knotens
// lazy nach (DD2-89), falls noch nicht im Cache. nil, wenn nichts zu laden ist
// (Issue/Info-Knoten, bereits gecacht oder Out-of-bounds). Analog syncMemDetail.
func (m model) syncDeps(nodes []treeNode) tea.Cmd {
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return nil
	}
	n := nodes[m.treeCursor]
	switch n.kind {
	case tkMile:
		if n.mileIdx < 0 || n.mileIdx >= len(m.milestones) {
			return nil
		}
		id := m.milestones[n.mileIdx].ID
		if _, ok := m.depsCache[depCacheKey("m", id)]; !ok {
			return loadMilestoneDeps(m.client, id)
		}
	case tkSprint:
		if n.sprintID != 0 {
			if _, ok := m.depsCache[depCacheKey("s", n.sprintID)]; !ok {
				return loadSprintDeps(m.client, n.sprintID)
			}
		}
	}
	return nil
}

// renderTreeDeps rendert Vorgänger/Nachfolger eines Milestone-/Sprint-Knotens aus
// dem Lazy-Cache (DD2-89, read-only). Nicht gecacht → Lade-Hinweis; keine → "none".
func (m model) renderTreeDeps(key string, w int) string {
	d, ok := m.depsCache[key]
	if !ok {
		return theme.Dim.Render("Dependencies: (loading …)")
	}
	if len(d.Predecessors) == 0 && len(d.Successors) == 0 {
		return theme.Dim.Render("Dependencies: none")
	}
	names := func(es []api.DepEntry) string {
		out := make([]string, len(es))
		for i, e := range es {
			out[i] = e.Name
		}
		return strings.Join(out, ", ")
	}
	var b strings.Builder
	b.WriteString(theme.Dim.Render("Dependencies"))
	if len(d.Predecessors) > 0 {
		b.WriteString("\n" + wrapText(theme.Dim.Render("Predecessors: ")+names(d.Predecessors), w))
	}
	if len(d.Successors) > 0 {
		b.WriteString("\n" + wrapText(theme.Dim.Render("Successors: ")+names(d.Successors), w))
	}
	return b.String()
}

// treeDetail rendert die rechte Detail-Fläche für den selektierten Knoten —
// breit, der eigentliche Mehrwert des Layouts (Platz für Felder/Accordion).
func (m model) treeDetail(n treeNode, w int) string {
	var b strings.Builder
	// Bounds-Guard (gleiche Fehlerklasse wie der leere-Knotenliste-Fall): Indizes
	// auf stale/leere Slices nie blind dereferenzieren — sonst Panic im View.
	switch n.kind {
	case tkMile:
		if n.mileIdx < 0 || n.mileIdx >= len(m.milestones) {
			return theme.Dim.Render("(nothing selected)")
		}
		ms := m.milestones[n.mileIdx]
		// Meilenstein hat keinen Key → Titel ohne Key; Meta-Strip Fortschritt/Status.
		b.WriteString(detailTitle("", mileDisplayName(ms.Name), w) + "\n")
		b.WriteString(metaStrip([]metaPair{
			{fmt.Sprintf("%d/%d", ms.Done, ms.Total), "Progress"},
		}, statusText(ms.Status), w) + "\n\n")
		// DD2-78: editierbare Felder als flache, fokussierbare Liste (kein Accordion,
		// D09). Bei Detail-Fokus auf diesem Knoten trägt das aktive Feld den D08-Balken.
		fields := milestoneFields()
		b.WriteString(renderFlatFields(fields, milestoneFieldValues(ms, fields), m.fieldCursor, m.detailFocus, w))
		b.WriteString("\n\n" + m.renderTreeDeps(depCacheKey("m", ms.ID), w)) // DD2-89
		b.WriteString("\n\n" + theme.Dim.Render(fmt.Sprintf("Sprints (%d)", len(ms.Sprints))) + "\n")
	case tkSprint:
		if n.mileIdx < 0 || n.mileIdx >= len(m.milestones) ||
			n.sprIdx < 0 || n.sprIdx >= len(m.milestones[n.mileIdx].Sprints) {
			return theme.Dim.Render("(nothing selected)")
		}
		ms := m.milestones[n.mileIdx]
		sp := ms.Sprints[n.sprIdx]
		b.WriteString(detailTitle(sp.Key, sp.Name, w) + "\n")
		b.WriteString(metaStrip([]metaPair{
			{sprintMilestoneName(&sp, &ms), "Milestone"},
			{fmt.Sprintf("%d/%d", sp.DoneCount, sp.ItemCount), "Progress"},
		}, statusText(sp.Status), w) + "\n\n")
		// DD2-78: name/goal als flache, fokussierbare Feldliste (D09, kein Accordion).
		fields := sprintFields()
		b.WriteString(renderFlatFields(fields, sprintFieldValues(sp, fields), m.fieldCursor, m.detailFocus, w))
		b.WriteString("\n\n" + m.renderTreeDeps(depCacheKey("s", sp.ID), w)) // DD2-89
	case tkIssue:
		if n.issue == nil {
			return theme.Dim.Render("(nothing selected)")
		}
		it := *n.issue
		// DD2-77: die Übersicht (Kopf, Fokus-Index 0) trägt title/type/priority. Bei
		// Detail-Fokus auf der Übersicht bekommt der Titel den D08-Balken; auf Feld-
		// Ebene zeigt ein Feld-Streifen, welches Header-Feld editiert würde.
		kopfActive := m.detailFocus && m.secCursor == 0
		title := detailTitle(it.Key, it.Title, w)
		if kopfActive {
			title = theme.Accent.Render("▌" + truncate(ansi.Strip(title), w-1))
		}
		b.WriteString(title + "\n")
		// Meta-Strip wie Wireframe: milestone/prio/type/tags + Status rechtsbündig (D01).
		var tags string
		if len(it.Tags) > 0 {
			names := make([]string, len(it.Tags))
			for i, t := range it.Tags {
				names[i] = t.Name
			}
			tags = strings.Join(names, ",")
		}
		b.WriteString(metaStrip([]metaPair{
			{deref(it.Milestone), "milestone"},
			{theme.Priority(it.Priority), "prio"},
			{theme.TypeIcon(it.Type) + " " + theme.TypeStyle(it.Type).Render(it.Type), "type"},
			{tags, "tags"},
		}, statusText(it.Status), w))
		if kopfActive && m.detailLevel == 1 {
			b.WriteString("\n" + fieldStrip(kopfFields(), m.fieldCursor, w))
		}
		b.WriteString("\n\n")
		// DD2-50: Felder als ziffern-aktiviertes Accordion (löst DD2-43). bodyW = w-2,
		// da die Body-Box ihre Border außen anlegt (renderAccordion).
		b.WriteString(theme.Muted.Render("Sections: digit [1..n] opens") + "\n")
		// DD2-76/77: Accordion-Fokus nur, wenn der Cursor auf einer Content-Section
		// steht (secCursor ≥ 1); sec = secCursor-1 (Übersicht ist Index 0).
		focus := detailFocusView{active: m.detailFocus && m.secCursor >= 1,
			level: m.detailLevel, sec: m.secCursor - 1, field: m.fieldCursor}
		b.WriteString(renderAccordion(m.issueSections(it, w-2), m.accOpen, w, focus))
	default:
		b.WriteString(theme.Dim.Render("(nothing selected — l/→ expands)"))
	}
	return b.String()
}

// windowStart berechnet den Fenster-Anfang so, dass cursor sichtbar bleibt —
// geteilt von windowAround (Render) und handleMouse (Klick-Y→Zeilenindex, DD2-51).
func windowStart(n, height, cursor int) int {
	if n <= height {
		return 0
	}
	start := cursor - height/2
	if start < 0 {
		start = 0
	}
	if start+height > n {
		start = n - height
	}
	return start
}

// windowAround fenstert lines auf height Zeilen so, dass cursor sichtbar bleibt.
func windowAround(lines []string, height, cursor int) []string {
	if len(lines) <= height {
		return lines
	}
	start := windowStart(len(lines), height, cursor)
	return lines[start : start+height]
}

// keyTree steuert den Primat-View. Bei aktiver Suche (treeSearching) fließen alle
// Tasten ins Suchfeld (live-Filter), bis enter (übernehmen) oder esc (abbrechen).
func (m model) keyTree(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.treeSearching {
		return m.keyTreeSearch(msg)
	}
	// DD2-76: liegt der Fokus in der Detail-Pane, übernimmt die Fokus-Maschine
	// (Section/Feld-Nav) — vor der Tree-Navigation.
	if m.detailFocus {
		return m.keyDetailFocus(msg)
	}
	nodes := m.treeNodes()
	switch msg.String() {
	case "q": // DD2-124: q → Lobby (immer Home)
		return m.goHome()
	case "ctrl+c":
		return m.requestQuit() // DD2-49
	case "/": // DD2-62: Suchfeld öffnen, mit aktuellem Filter vorbelegen
		m.treeSearching = true
		m.treeSearch.SetValue(m.treeQuery)
		m.treeSearch.CursorEnd()
		m.treeSearch.Focus()
		// Suche wird projektweit: alle Issues einmal laden (sonst nur Lazy-Cache).
		var cmd tea.Cmd
		if !m.treeIssuesLoaded {
			cmd = loadAllIssues(m.client)
		}
		return m, tea.Batch(textinput.Blink, cmd)
	case "ctrl+r": // DD2-72: manueller Daten-Reload — Meilensteine + alle expandierten Sprints (atomar, Toast bleibt)
		var ids []int
		for sid, open := range m.treeExpSprint {
			if open {
				ids = append(ids, sid)
			}
		}
		var extra tea.Cmd
		if m.treeIssuesLoaded {
			extra = loadAllIssues(m.client)
		}
		return m, tea.Batch(doRefresh(m.client, ids), extra)
	case "f": // DD2-62 Rework: Filter-Facetten-Menü (Art/Issue-Type/Status)
		return m.openTreeFilter()
	case "1", "2", "3", "4", "5", "6", "7", "8", "9":
		// DD2-50: Ziffer toggelt die Accordion-Section im Issue-Detail (exklusiv —
		// gleiche Ziffer schließt, andere wechselt). Nur sinnvoll auf Issue-Knoten,
		// schadet aber sonst nicht (Meilenstein/Sprint rendern kein Accordion).
		d := int(msg.String()[0] - '0')
		if m.accOpen == d {
			m.accOpen = 0
		} else {
			m.accOpen = d
		}
		return m, nil
	case "esc":
		if m.treeActive() { // erst Filter + Suche löschen, dann Ranger
			m.treeQuery = ""
			m.treeSearch.SetValue("")
			m.fArt = map[treeKind]bool{}
			m.fType = map[string]bool{}
			m.fStatus = map[string]bool{}
			m.fTags = map[string]bool{}
			m.treeCursor = 0
			return m, nil
		}
		return m.goHome() // DD2-124: Esc aus dem Primat-View → Lobby (Esc-Spine)
	case "p": // Projekt-Switch-Overlay (DD2-124) — keyTree fängt vor dem globalen Switch
		if m.global != nil {
			return m.openProjPick()
		}
		return m, nil
	case "R": // Reviews-Liste — analog, sonst im Tree verschluckt
		return m.openReviewsList()
	case "b": // Backlog — analog
		return m.openBacklog()
	case "S": // Meilenstein-Status (1:1 Ranger) — nur auf Meilenstein-Knoten
		if m.treeCursor < len(nodes) {
			if n := nodes[m.treeCursor]; n.kind == tkMile {
				return m.openMilestoneStatusFor(&m.milestones[n.mileIdx])
			}
		}
		return m, nil
	case "s": // Sprint-Status (Sprint-Knoten) / Issue-Status (Issue-Knoten), 1:1 Ranger
		if m.treeCursor < len(nodes) {
			n := nodes[m.treeCursor]
			switch n.kind {
			case tkSprint:
				sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
				return m.openSprintStatus(sp.ID, sp.Status)
			case tkIssue:
				if n.issue != nil {
					return m.openIssueStatus(n.issue, n.sprintID)
				}
			}
		}
		return m, nil
	case "d": // Delete — Meilenstein/Sprint kaskadierend, Issue einzeln (DD2-65)
		if m.treeCursor < len(nodes) {
			n := nodes[m.treeCursor]
			switch n.kind {
			case tkMile:
				ms := m.milestones[n.mileIdx]
				return m.openDelete("milestone", ms.ID, ms.Name)
			case tkSprint:
				sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
				return m.openDelete("sprint", sp.ID, sp.Name)
			case tkIssue:
				if n.issue != nil {
					return m.openDelete("issue", n.issue.ID, n.issue.Key+" "+n.issue.Title)
				}
			}
		}
		return m, nil
	case "y": // Kontext yanken (1:1 Ranger) — Meilenstein/Sprint
		return m.treeYank(nodes)
	case "T": // DD2-75: Tag-Manager (keyTree fängt vor dem globalen Switch)
		return m.openTagManager()
	case "t": // DD2-33: Tag-Picker für den fokussierten Knoten
		if m.treeCursor < len(nodes) {
			n := nodes[m.treeCursor]
			switch n.kind {
			case tkMile:
				ms := m.milestones[n.mileIdx]
				return m.openTagPicker("milestone", ms.ID, ms.Name, nil)
			case tkSprint:
				sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
				return m.openTagPicker("sprint", sp.ID, sp.Name, nil)
			case tkIssue:
				if n.issue != nil {
					return m.openTagPicker("issue", n.issue.ID, n.issue.Key+" "+n.issue.Title, n.issue.Tags)
				}
			}
		}
		return m, nil
	}
	switch navKey(msg.String()) {
	case "up":
		if m.treeCursor > 0 {
			m.treeCursor--
		}
		return m, m.syncDeps(nodes) // DD2-89: Deps des neu fokussierten Knotens lazy nachladen
	case "down":
		if m.treeCursor < len(nodes)-1 {
			m.treeCursor++
		}
		return m, m.syncDeps(nodes)
	case "right":
		return m.treeExpand(nodes)
	case "left":
		return m.treeCollapse(nodes)
	}
	if msg.String() == "enter" {
		// DD2-78: enter „geht ins Detail" — auf Meilenstein/Sprint verlagert es den
		// Fokus in die Detail-Pane (flache Feldliste), statt nur aufzuklappen (l/→
		// bleibt das Tree-Expand). Auf einem Issue (Blatt) ist es ohnehin der Detail-
		// Fokus (treeExpand → enterDetailFocus).
		if m.treeCursor < len(nodes) {
			switch nodes[m.treeCursor].kind {
			case tkMile, tkSprint:
				return m.enterDetailFocus()
			}
		}
		return m.treeExpand(nodes)
	}
	return m, nil
}

// treeYank kopiert den Kontext des selektierten Knotens (1:1 Ranger-yankContext):
// Meilenstein → Sprints-Übersicht, Sprint → Issues-Übersicht.
func (m model) treeYank(nodes []treeNode) (tea.Model, tea.Cmd) {
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil
	}
	n := nodes[m.treeCursor]
	switch n.kind {
	case tkMile:
		ms := m.milestones[n.mileIdx]
		if err := clip.Copy(milestoneClip(&ms)); err != nil {
			m.errNote = "Clipboard-Fehler: " + err.Error()
		} else {
			m.errNote = ""
			m.status = "Milestone context copied (" + ms.Name + ")"
		}
	case tkSprint:
		sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
		src := &sp
		if m.curSprint != nil && m.curSprint.ID == sp.ID {
			src = m.curSprint
		}
		if err := clip.Copy(sprintClip(src)); err != nil {
			m.errNote = "Clipboard-Fehler: " + err.Error()
		} else {
			m.errNote = ""
			m.status = "Sprint context copied (" + sp.Key + ")"
		}
	default:
		m.status = "Yank: on milestone or sprint"
	}
	return m, nil
}

// openTreeFilter öffnet das Facetten-Menü und lädt projektweit alle Issues nach
// (damit Type/Status-Facetten greifen, nicht nur die Lazy-gecachten).
func (m model) openTreeFilter() (tea.Model, tea.Cmd) {
	m.ffItems = m.buildFilterItems()
	m.ffMenu = listState{}
	m.ffMenu.setLen(len(m.ffItems))
	m.treeFilterOpen = true
	if !m.treeIssuesLoaded {
		return m, loadAllIssues(m.client)
	}
	return m, nil
}

// buildFilterItems baut die Menü-Zeilen: feste Art-/Type-Facetten + dynamische
// Status-Werte (aus den geladenen Meilensteinen/Sprints/Issues).
func (m model) buildFilterItems() []ffItem {
	items := []ffItem{
		{"art", "mile", "Milestone"},
		{"art", "sprint", "Sprint"},
		{"art", "issue", "Issue"},
		{"type", "bug", "Bug"},
		{"type", "feature", "Feature"},
		{"type", "improvement", "Improvement"},
		{"type", "core", "Core"},
	}
	for _, s := range m.filterStatusOptions() {
		items = append(items, ffItem{"status", s, s})
	}
	for _, t := range m.tagFilterOptions() { // DD2-116: dynamische Tag-Facette
		items = append(items, ffItem{"tags", t, t})
	}
	return items
}

// tagFilterOptions sammelt distinkte Issue-Tag-Namen (projektweit geladen), in
// stabiler Reihenfolge (Datenreihenfolge), für die Tag-Facette (DD2-116).
func (m model) tagFilterOptions() []string {
	seen := map[string]bool{}
	var out []string
	for _, it := range m.treeFilterIssues {
		for _, t := range it.Tags {
			if t.Name != "" && !seen[t.Name] {
				seen[t.Name] = true
				out = append(out, t.Name)
			}
		}
	}
	return out
}

// filterStatusOptions sammelt distinkte Status-Werte (Meilenstein/Sprint/Issue),
// in stabiler Reihenfolge (Datenreihenfolge), für die Status-Facette.
func (m model) filterStatusOptions() []string {
	seen := map[string]bool{}
	var out []string
	add := func(s string) {
		if s != "" && !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	for _, ms := range m.milestones {
		add(ms.Status)
		for _, sp := range ms.Sprints {
			add(sp.Status)
		}
	}
	for _, it := range m.treeFilterIssues {
		add(it.Status)
	}
	return out
}

// keyTreeFilter steuert das Filter-Menü: space toggelt die Facette, c leert alles,
// enter/esc schließt (und lädt bei aktivem Filter projektweit frisch nach).
func (m model) keyTreeFilter(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.ffMenu.move(-1)
		return m, nil
	case "down":
		m.ffMenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "f", "enter":
		m.treeFilterOpen = false
		m.treeCursor = 0
		if m.treeFilterActive() {
			return m, loadAllIssues(m.client) // frische projektweite Daten
		}
		return m, nil
	case "c": // alle Facetten leeren
		m.fArt = map[treeKind]bool{}
		m.fType = map[string]bool{}
		m.fStatus = map[string]bool{}
		m.fTags = map[string]bool{}
		return m, nil
	case " ", "x":
		if m.ffMenu.cursor < 0 || m.ffMenu.cursor >= len(m.ffItems) {
			return m, nil
		}
		it := m.ffItems[m.ffMenu.cursor]
		switch it.facet {
		case "art":
			k := kindOf(it.value)
			if m.fArt[k] {
				delete(m.fArt, k)
			} else {
				m.fArt[k] = true
			}
		case "type":
			if m.fType[it.value] {
				delete(m.fType, it.value)
			} else {
				m.fType[it.value] = true
			}
		case "status":
			if m.fStatus[it.value] {
				delete(m.fStatus, it.value)
			} else {
				m.fStatus[it.value] = true
			}
		case "tags":
			if m.fTags[it.value] {
				delete(m.fTags, it.value)
			} else {
				m.fTags[it.value] = true
			}
		}
		return m, nil
	}
	return m, nil
}

// treeFilterBox rendert das schwebende Filter-Menü (Checkboxen je Facette).
func (m model) treeFilterBox() string {
	var b strings.Builder
	b.WriteString(theme.Muted.Render("space:toggle  c:clear  enter/esc:done") + "\n")
	lastFacet := ""
	facetHead := map[string]string{"art": "Art", "type": "Issue-Type", "status": "Status", "tags": "Tags"}
	for i, it := range m.ffItems {
		if it.facet != lastFacet {
			b.WriteString("\n" + theme.Dim.Render(facetHead[it.facet]) + "\n")
			lastFacet = it.facet
		}
		on := false
		switch it.facet {
		case "art":
			on = m.fArt[kindOf(it.value)]
		case "type":
			on = m.fType[it.value]
		case "status":
			on = m.fStatus[it.value]
		case "tags":
			on = m.fTags[it.value]
		}
		box := theme.Dim.Render("[ ]")
		if on {
			box = theme.Accent.Render("[x]")
		}
		cursor := "  "
		label := it.label
		if i == m.ffMenu.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(label)
		}
		b.WriteString(cursor + box + " " + label + "\n")
	}
	return modalPanel("Tree-Filter", b.String(), "", clampModalWidth(40, m.width), theme.Mauve)
}

// filterSummary fasst die aktiven Facetten kurz zusammen (Such-/Filterbox-Kopf).
func (m model) filterSummary() string {
	var p []string
	if len(m.fArt) > 0 {
		var a []string
		for _, it := range []struct {
			k treeKind
			s string
		}{{tkMile, "M"}, {tkSprint, "S"}, {tkIssue, "Issue"}} {
			if m.fArt[it.k] {
				a = append(a, it.s)
			}
		}
		p = append(p, "Art:"+strings.Join(a, ","))
	}
	if len(m.fType) > 0 {
		p = append(p, "Type:"+joinFilterKeys(m.fType))
	}
	if len(m.fStatus) > 0 {
		p = append(p, "St:"+joinFilterKeys(m.fStatus))
	}
	if len(m.fTags) > 0 {
		p = append(p, "Tags:"+joinFilterKeys(m.fTags))
	}
	return strings.Join(p, " ")
}

// joinFilterKeys liefert die gesetzten Map-Keys kommasepariert (Anzeige).
func joinFilterKeys(mp map[string]bool) string {
	var out []string
	for k, v := range mp {
		if v {
			out = append(out, k)
		}
	}
	return strings.Join(out, ",")
}

// keyTreeSearch behandelt die aktive Tree-Suche (DD2-62): tippen filtert live,
// enter übernimmt den Filter (Feld blurt, Filter bleibt aktiv), esc bricht ab und
// löscht den Filter. Cursor springt bei jeder Filteränderung auf 0.
func (m model) keyTreeSearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		m.treeQuery = strings.TrimSpace(m.treeSearch.Value())
		m.treeSearching = false
		m.treeSearch.Blur()
		m.treeCursor = 0
		return m, nil
	case tea.KeyEsc:
		m.treeSearching = false
		m.treeSearch.Blur()
		m.treeSearch.SetValue("")
		m.treeQuery = ""
		m.treeCursor = 0
		return m, nil
	}
	var cmd tea.Cmd
	m.treeSearch, cmd = m.treeSearch.Update(msg)
	m.treeQuery = strings.TrimSpace(m.treeSearch.Value()) // live-Filter
	m.treeCursor = 0
	return m, cmd
}

// treeSearchLine rendert den Tree-Kopf (DESIGN „Such-/Filterbox"): Shield + Status.
// Inaktiv = Hint, Eingabe aktiv = Suchfeld, Filter gesetzt = Shield+Query rot.
func (m model) treeSearchLine(w int) string {
	const shield = "⌕" // U+2315 Such-Glyph (neutral; war ⌕ U+26E8 = ambiguous, DD2-53)
	if m.treeSearching {
		return truncate(shield+" "+m.treeSearch.View(), w)
	}
	var parts []string
	if m.treeFilterActive() {
		parts = append(parts, m.filterSummary())
	}
	if m.treeQuery != "" {
		parts = append(parts, m.treeQuery)
	}
	if len(parts) > 0 { // aktiver Filter/Suche = rot (DESIGN „Filter aktiv")
		return truncate(lipgloss.NewStyle().Foreground(theme.Red).Render(shield+" "+strings.Join(parts, " ")), w)
	}
	return truncate(theme.Muted.Render(shield+" search with /  ∙  filter f"), w)
}

// treeExpand klappt den Knoten unter dem Cursor auf; bei Sprints werden die
// Issues lazy nachgeladen (sprintMsg füllt treeIssues).
func (m model) treeExpand(nodes []treeNode) (tea.Model, tea.Cmd) {
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil
	}
	n := nodes[m.treeCursor]
	switch n.kind {
	case tkMile:
		m.treeExpMile[m.milestones[n.mileIdx].ID] = true
	case tkSprint:
		sp := m.milestones[n.mileIdx].Sprints[n.sprIdx]
		m.treeExpSprint[sp.ID] = true
		if _, ok := m.treeIssues[sp.ID]; !ok {
			m.status = "loading issues …"
			return m, loadSprint(m.client, sp.ID)
		}
	case tkIssue:
		// DD2-76: ein Issue ist ein Blatt — „rein" verlagert den Fokus in die
		// Detail-Pane statt aufzuklappen (D01).
		if n.issue != nil {
			return m.enterDetailFocus()
		}
	}
	return m, nil
}

// treeCollapse klappt den Knoten (bzw. dessen Eltern-Sprint bei Issues) zu.
func (m model) treeCollapse(nodes []treeNode) (tea.Model, tea.Cmd) {
	if m.treeCursor < 0 || m.treeCursor >= len(nodes) {
		return m, nil
	}
	n := nodes[m.treeCursor]
	switch n.kind {
	case tkMile:
		delete(m.treeExpMile, m.milestones[n.mileIdx].ID)
	case tkSprint, tkIssue:
		delete(m.treeExpSprint, m.milestones[n.mileIdx].Sprints[n.sprIdx].ID)
	}
	nn := m.treeNodes()
	if m.treeCursor >= len(nn) {
		m.treeCursor = len(nn) - 1
	}
	if m.treeCursor < 0 {
		m.treeCursor = 0
	}
	return m, nil
}
