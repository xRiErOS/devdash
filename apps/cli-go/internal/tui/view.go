package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("\n  %s\n\n  q: quit\n", lipgloss.NewStyle().Foreground(theme.Red).Render("Fehler: "+m.err.Error()))
	}
	// DD2-272: der Eck-Toast schwebt über ALLEM (auch Modals) — nicht modal, blockiert
	// keine Tastatur. renderToast() ist ein No-Op, wenn kein Toast aktiv ist.
	return m.renderToast(m.viewComposite())
}

// viewComposite komponiert die Basis-View + alle modalen Overlays (Confirms/
// Picker/Formulare) — ausgelagert aus View(), damit der Toast-Layer (DD2-272)
// zentral über das fertige Ergebnis gelegt werden kann, egal welcher Zweig griff.
func (m model) viewComposite() string {
	base := m.viewBase()
	if m.confirmQuit { // DD2-49: Beenden-Confirm liegt top-most über allem
		return placeOverlay(base, m.quitBox(), m.termWidth(), m.height)
	}
	if m.helpOpen { // DD2-31: Shortcut-Übersicht
		return placeOverlay(base, m.helpBox(), m.termWidth(), m.height)
	}
	// Command-Center (T16): Formular bzw. Palette schweben zentriert über dem Frame.
	if m.form != nil {
		return placeOverlay(base, m.formChrome(), m.termWidth(), m.height)
	}
	if m.paletteOpen {
		return placeOverlay(base, m.paletteBox(), m.termWidth(), m.height)
	}
	if m.projPick { // DD2-124: Projekt-Picker als schwebendes Overlay (p von überall)
		return placeOverlay(base, m.projPickBox(), m.termWidth(), m.height)
	}
	if m.msPick {
		return placeOverlay(base, m.milestoneStatusMenu(), m.termWidth(), m.height)
	}
	if m.sprintPick { // T05: view-übergreifend (Cockpit + Ranger-Columns)
		return placeOverlay(base, m.sprintStatusMenu(), m.termWidth(), m.height)
	}
	if m.statusPick { // DD2-29: Issue-Status-Menü view-übergreifend (Cockpit + Columns/Detail)
		return placeOverlay(base, m.statusMenu(), m.termWidth(), m.height)
	}
	if m.treeFilterOpen { // DD2-62 Rework: Tree-Filter-Facetten-Menü
		return placeOverlay(base, m.treeFilterBox(), m.termWidth(), m.height)
	}
	if m.blFilterOpen { // DD2-46: Backlog-Facetten-Filter
		return placeOverlay(base, m.backlogFilterBox(), m.termWidth(), m.height)
	}
	if m.blSortOpen { // DD2-46: Backlog-Sortier-Picker
		return placeOverlay(base, m.backlogSortBox(), m.termWidth(), m.height)
	}
	if m.asPick { // DD2-136: Issue→Sprint-Picker
		return placeOverlay(base, m.assignSprintMenu(), m.termWidth(), m.height)
	}
	if m.docAsPick { // DD2-243: Dokument→Meilenstein/Sprint-Picker
		return placeOverlay(base, m.docAssignMenu(), m.termWidth(), m.height)
	}
	if m.smPick { // T03 Flow A: Sprint→Meilenstein-Picker
		return placeOverlay(base, m.sprintMilestoneMenu(), m.termWidth(), m.height)
	}
	if m.maPick { // T03 Flow B: Meilenstein→Sprints-Checkliste
		return placeOverlay(base, m.milestoneAssignMenu(), m.termWidth(), m.height)
	}
	if m.tagPick { // DD2-33: Tag-Zuweisungs-Picker
		return placeOverlay(base, m.tagPickerMenu(), m.termWidth(), m.height)
	}
	if m.createConfirm { // DD2-93: y/n-Confirm vor der Anlage neuer Entitäten
		return placeOverlay(base, m.createConfirmBox(), m.termWidth(), m.height)
	}
	if m.delConfirm { // T02b: Cascade-Delete-Confirm
		return placeOverlay(base, m.deleteBox(), m.termWidth(), m.height)
	}
	if m.mcConfirm { // DD2-28: Cascade-Complete-Confirm
		return placeOverlay(base, m.milestoneCascadeBox(), m.termWidth(), m.height)
	}
	return base
}

// milestoneCascadeBox: Confirm für den PO-getriggerten Cascade-Complete (DD2-28) —
// schließt den Meilenstein und setzt offene Sprints/Issues terminal.
func (m model) milestoneCascadeBox() string {
	body := "\n" + m.mcName + "\n\n"
	body += theme.Dim.Render(fmt.Sprintf("%d open sprint(s) → completed, their open issues → done.", m.mcSprints)) + "\n"
	body += theme.Dim.Render("PO action (DD-186) — not reversible.") + "\n\n"
	body += lipgloss.NewStyle().Foreground(theme.Red).Render("y") + theme.Dim.Render(": close cascading   ") +
		theme.Accent.Render("n/esc") + theme.Dim.Render(": cancel")
	return modalPanel("Complete milestone", body, "", modalBoxWidth(m.width), theme.Red)
}

// milestoneStatusMenu: schwebendes Meilenstein-Status-Menü (Taste S, T01).
func (m model) milestoneStatusMenu() string {
	body := theme.Dim.Render("aktuell: "+m.msTargetStatus) + "\n\n"
	body += menuList(len(m.msopts), m.msmenu.cursor, func(i int, sel bool) string {
		s := m.msopts[i]
		label := statusText(s)
		if s == "completed" {
			label = statusText(s) + theme.Dim.Render(" (all sprints must be terminal)")
		}
		if sel {
			label = theme.Header.Render(s)
			if s == "completed" {
				label = theme.Header.Render(s) + theme.Dim.Render(" (all sprints must be terminal)")
			}
		}
		return label
	})
	return modalPanel("Set milestone status", body, "enter: set   esc: cancel", clampModalWidth(46, m.width), theme.Mauve)
}

func (m model) viewBase() string {
	switch m.view {
	case viewHome:
		return m.viewHome() // DD2-124: Lobby (Logo + Projektauswahl)
	case viewBrowseBacklog:
		return m.viewBrowseBacklog()
	case viewDetailIssue:
		return m.viewDetailIssue()
	case viewDetailMilestone:
		return m.viewDetailMilestone()
	case viewDetailSprint:
		return m.viewDetailSprint()
	case viewReviewSprint:
		return m.viewReviewSprint()
	case viewNavigateReviews:
		return m.viewNavigateReviews()
	case viewManageMemory:
		return m.viewManageMemory()
	case viewBrowseProject:
		return m.viewBrowseProject() // DD2-57: Tree+Detail-Prototyp
	case viewManageTags:
		return m.viewManageTags() // DD2-75: Tag-Manager
	case viewCommandCenter:
		return m.viewCommandCenter() // DD2-91: projektweite Suche
	case viewUserNotes:
		return m.viewUserNotes()
	case viewToDos:
		return m.viewToDos()
	case viewDocs:
		return m.viewDocs()
	case viewTutorial:
		return m.viewTutorial() // DD2-122: Onboarding
	default:
		return m.viewBrowseProject() // DD2-111: Columns gesunset → Tree-Primat als Fallback
	}
}

// --- Header / Footer ---

// globalKeys = auf JEDEM Screen identische Shortcuts (Wireframe-Zone „Globale
// Shortcuts", rechts im Header). Muted (D01: Hinweis, nicht echte Info).
func globalKeys() string {
	return theme.Muted.Render("ctrl+k:cmd  p:project  b:backlog  R:reviews  ?:help  q:quit")
}

// breadcrumb = Header-Zone 1 (Wireframe): links `> slug: Title` (Chevron+slug
// Peach, Title Mauve bold), rechts globale Shortcuts. title="" → nur `> slug`.
func (m model) breadcrumb(title string) string {
	slug := "dd"
	if m.project != nil && m.project.Slug != "" {
		slug = m.project.Slug
	}
	left := theme.Chevron.Render("> " + slug)
	if title != "" {
		left += theme.Chevron.Render(":") + " " + theme.Header.Render(title)
	}
	right := globalKeys()
	w := m.termWidth()
	if lipgloss.Width(left)+lipgloss.Width(right)+1 > w { // schmal: stapeln statt überlaufen
		return ansi.Truncate(left, w, "…") + "\n" + ansi.Truncate(right, w, "…")
	}
	gap := w - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	return left + strings.Repeat(" ", gap) + right
}

// wrapText bricht s ANSI-sicher auf w Zellen um: zuerst an Wortgrenzen
// (Wordwrap), dann harte Umbrüche für überlange Tokens (URLs/Pfade), die sonst
// überlaufen (DD2-60 Review-Befund). Erhält bestehende Zeilenumbrüche.
func wrapText(s string, w int) string {
	if w < 1 {
		w = 1
	}
	return ansi.Hardwrap(ansi.Wordwrap(s, w, ""), w, true)
}

// header = breadcrumb ohne Screen-Titel (Standalone-Aufrufer: Columns/Tree/Memory
// setzen ihren Titel selbst). chrome() nutzt breadcrumb(title) direkt.
func (m model) header() string {
	return m.breadcrumb("")
}

// statusBar = Footer-Zone 4 (Wireframe): Scroll-Indikator (Accent) + kritische
// Fehler (Red), rechtsbündig. Leer → leere Zeile. DD2-272: transiente Meldungen
// (vormals links, Blue) laufen jetzt über den Eck-Toast (overlay_show_toast.go)
// statt über diese Zeile — Footer zeigt keine Statuszeile mehr.
func (m model) statusBar(ind string) string {
	var rparts []string
	if ind != "" {
		rparts = append(rparts, theme.Accent.Render(ind))
	}
	if m.errNote != "" {
		rparts = append(rparts, lipgloss.NewStyle().Foreground(theme.Red).Render(m.errNote))
	}
	right := strings.Join(rparts, "  ")
	if right == "" {
		return ""
	}
	w := m.termWidth()
	if lipgloss.Width(right)+1 > w {
		return ansi.Truncate(right, w, "…")
	}
	gap := w - lipgloss.Width(right)
	if gap < 0 {
		gap = 0
	}
	return strings.Repeat(" ", gap) + right
}

func (m model) footer() string {
	// DD2-272: der transiente Toast lief früher hier ein (m.status) — läuft jetzt
	// über den Eck-Toast (overlay_show_toast.go). Footer zeigt nur noch die Hints.
	// DD2-175: Footer-Hint wird nicht mehr als hardcoded String gepflegt, sondern
	// aus der Keymap (Single-Source) abgeleitet — kann damit nie mehr von den
	// echten Bindings driften. Depth-abhängige lokale Tasten + globaler Block.
	local := m.localKeyHints()
	global := []keybind.Binding{keys.Filter, keys.Yank, keys.Tags, keys.Refresh, keys.Backlog, keys.Reviews, keys.Quit}
	hint := renderBindings(append(local, global...))
	// DD2-73: auf schmalen Terminals umbrechen statt in die Pane-Spalten überlaufen
	// (analog chrome()). Der Tree rechnet die Footer-Höhe in die Body-Höhe ein.
	return theme.Dim.Render(wrapText(hint, m.termWidth()))
}

// renderBindings rendert eine Bindungs-Liste als "key:desc"-Hint, getrennt durch
// zwei Spaces. Bindings ohne Help.Key werden übersprungen (DD2-175).
func renderBindings(bs []keybind.Binding) string {
	parts := make([]string, 0, len(bs))
	for _, b := range bs {
		h := b.Help()
		if h.Key != "" {
			parts = append(parts, h.Key+":"+h.Desc)
		}
	}
	return strings.Join(parts, "  ")
}

// localKeyHints liefert die depth-abhängigen lokalen Tasten für den Footer aus der
// Keymap (DD2-175). s (Status) wirkt je Ebene auf den fokussierten Node; Delete
// nur auf den oberen Ebenen (Meilenstein/Sprint).
func (m model) localKeyHints() []keybind.Binding {
	switch m.depth {
	case 0:
		return []keybind.Binding{keys.Up, keys.Down, keys.Left, keys.Right, keys.Enter, keys.Status, keys.Delete}
	case 1:
		return []keybind.Binding{keys.Up, keys.Down, keys.Left, keys.Right, keys.Enter, keys.Status, keys.Delete}
	default:
		return []keybind.Binding{keys.Up, keys.Down, keys.Left, keys.Right, keys.Enter, keys.Status}
	}
}

func (m model) termWidth() int {
	w := m.width
	if w < 30 {
		w = 100
	}
	if m.viewBordered() {
		w -= 2 // DD2-68: App-Außenrahmen reserviert je 1 Spalte links/rechts (Innenbreite)
	}
	return w
}

// masterDetailWidths liefert die geteilte Master-Detail-Pane-Breite als echtes
// 1fr:2fr: die Liste links bekommt ein Drittel (w/3), das Detail rechts den Rest
// (rw = w - lw - 4, je Pane 2 Border-Spalten). DD2-91 Rework: vorher auf
// layout.tree_width (36) GEPINNT → auf breiten Terminals eine fixe schmale Spalte
// statt 1fr; tree_width gilt jetzt nur noch als Mindestbreite (Lesbarkeit auf
// schmalen Terminals), gekappt auf w*2/5. Single Source für Memory-Browser (DD2-127)
// und Such-Ansicht (DD2-91).
func (m model) masterDetailWidths(w int) (lw, rw int) {
	lw = w / 3 // 1fr
	if floor := m.cfg.Layout.TreeWidth; floor > 0 && lw < floor {
		lw = floor // layout.tree_width = Mindestbreite, nicht Fixbreite
	}
	if lw < 24 {
		lw = 24
	}
	if cap := w * 2 / 5; lw > cap {
		lw = cap
	}
	rw = w - lw - 4
	if rw < 20 {
		rw = 20
	}
	return
}

// viewBordered meldet, ob die aktuelle View den App-Außenrahmen trägt (DD2-68 →
// DD2-84). DD2-68 erfasst die chrome()/framed()-basierten Screens; DD2-84 weitet das
// auf den vollständigen View-Satz (inkl. viewHome-Lobby) aus. Steuert ZUGLEICH die
// Innen-Reservierung in termWidth()/frameH() — Rahmen-Wrap und Maß bleiben synchron.
func (m model) viewBordered() bool {
	switch m.view {
	case viewDetailIssue, viewDetailMilestone, viewDetailSprint, viewNavigateReviews, viewManageTags, // DD2-68 chrome-Subset
		viewHome, viewBrowseBacklog, viewReviewSprint, viewBrowseProject, // DD2-84 vollständiger Satz
		viewCommandCenter: // DD2-91 Rework: Such-Ansicht trägt den App-Außenrahmen (Chrome-Parität)
		return true
	}
	return false
}

// frameH ist die Innenhöhe für rahmen-bewusste Layouts: bei App-Außenrahmen 2
// Zeilen (oben/unten) weniger als die Terminalhöhe, sonst die volle Höhe.
func (m model) frameH() int {
	if m.viewBordered() {
		return m.height - 2
	}
	return m.height
}

// outerBorder legt den App-Außenrahmen (RoundedBorder, Overlay) um den fertigen
// Screen-Inhalt — nur wenn viewBordered(). Width = termWidth() (bereits Innenbreite)
// → Gesamtbreite m.width; KEIN Height() (Golden Rule #1): der Inhalt füllt bereits
// frameH() Zeilen, der Rahmen wächst natürlich auf m.height.
func (m model) outerBorder(content string) string {
	if !m.viewBordered() {
		return content
	}
	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(theme.Overlay).
		Width(m.termWidth()).
		Render(content)
}

func (m model) bodyHeight() int {
	h := m.height - 4
	if m.viewBordered() {
		h -= 2 // DD2-84: App-Außenrahmen reserviert oben/unten je 1 Zeile
	}
	if h < 6 {
		return 18
	}
	return h
}

// scrollView fenstert content auf height Zeilen ab offset (geklemmt) und füllt mit
// Leerzeilen auf height auf, damit der Footer unten klebt. Liefert zusätzlich einen
// Scroll-Indikator (leer, wenn alles passt). DD2-25/30 Chrome.
func scrollView(content string, height, offset int) (string, string) {
	if height < 1 {
		height = 1
	}
	lines := strings.Split(content, "\n")
	total := len(lines)
	maxOff := total - height
	if maxOff < 0 {
		maxOff = 0
	}
	if offset > maxOff {
		offset = maxOff
	}
	if offset < 0 {
		offset = 0
	}
	end := offset + height
	if end > total {
		end = total
	}
	win := append([]string{}, lines[offset:end]...)
	for len(win) < height {
		win = append(win, "")
	}
	ind := ""
	if total > height {
		ind = fmt.Sprintf("Z %d–%d/%d", offset+1, end, total)
		switch {
		case offset == 0:
			ind += " ↓"
		case end >= total:
			ind = "↑ " + ind
		default:
			ind = "↑ " + ind + " ↓"
		}
	}
	return strings.Join(win, "\n"), ind
}

// framed umrahmt einen Screen mit globalem Header, höhenfüllendem Scroll-Body und
// globalem Footer (DD2-25 „100% Höhe, globaler Header/Footer"). crumb = Screen-Titel,
// hint = Screen-Tasten. Lange Zeilen werden auf die
// Terminalbreite umgebrochen (sauberes Scroll-Zeilenzählen).
// hslot ist ein Header-Infofeld (Label/Wert) für das gemeinsame Screen-Grid.
type hslot struct{ label, value string }

// screenTitle stellt jedem View-Titel das Projekt-Präfix voran (DD2-48):
// konsistente Orientierung über alle Screens, z.B. "dd2 — Issue DD2-99".
func (m model) screenTitle(name string) string {
	p := "dd"
	if m.project != nil && m.project.Prefix != "" {
		p = strings.ToLower(m.project.Prefix)
	}
	return p + " — " + name
}

// metaGrid rendert die Header-Slots in FESTER Reihenfolge als eine umbrechende
// Zeile — gleiche Info an gleicher Stelle über alle Detail-Views (DD2-23, „welche
// Information an welcher Stelle"). Leere Werte fallen raus. Rein informativ:
// Mutation läuft nie über den Header (Meilenstein nicht mutierbar).
func metaGrid(slots []hslot, width int) string {
	cells := make([]string, 0, len(slots))
	for _, s := range slots {
		if strings.TrimSpace(ansi.Strip(s.value)) == "" {
			continue
		}
		cells = append(cells, theme.Dim.Render(s.label+": ")+s.value)
	}
	if len(cells) == 0 {
		return ""
	}
	return lipgloss.NewStyle().Width(width).Render(strings.Join(cells, "   "))
}

// metaPair ist ein Meta-Strip-Paar (DD2-63): value = echte Info (volle Farbe),
// sub = beschreibendes Sub-Label (muted/Hint). Zwei-Klassen-Text-Regel D01.
type metaPair struct{ value, sub string }

// detailTitle baut die Detail-Kopfzeile (Wireframe „> Key Title"): Chevron Peach,
// Key Sapphire (optional, z.B. Meilenstein hat keinen), Titel Mauve bold. ANSI-
// sicher auf w truncatet (kein Auto-Wrap, Golden Rule #2).
func detailTitle(key, title string, w int) string {
	s := theme.Chevron.Render("> ")
	if key != "" {
		s += theme.Key.Render(key) + " "
	}
	s += theme.Header.Render(title)
	return truncate(s, w)
}

// metaStrip rendert die Meta-Paare horizontal (value + muted Sub-Label, mit
// mutedem Mittelpunkt getrennt) und setzt status rechtsbündig auf w Spalten
// (Wireframe Detail-Header, DD2-63). Leere Werte fallen raus. Bei Engpass wird
// links gekürzt, der (gefärbte) Status bleibt erhalten — gleiche Logik wie
// breadcrumb()/statusBar(), damit der Strip nie überläuft.
func metaStrip(pairs []metaPair, status string, w int) string {
	cells := make([]string, 0, len(pairs))
	for _, p := range pairs {
		if strings.TrimSpace(ansi.Strip(p.value)) == "" {
			continue
		}
		cell := p.value
		if p.sub != "" {
			cell += " " + theme.Muted.Render(p.sub)
		}
		cells = append(cells, cell)
	}
	left := strings.Join(cells, theme.Muted.Render("  ∙  "))
	if status == "" {
		return truncate(left, w)
	}
	if lipgloss.Width(left)+lipgloss.Width(status)+1 > w {
		max := w - lipgloss.Width(status) - 1
		if max < 0 {
			return truncate(status, w)
		}
		left = truncate(left, max)
	}
	gap := w - lipgloss.Width(left) - lipgloss.Width(status)
	if gap < 1 {
		gap = 1
	}
	return left + strings.Repeat(" ", gap) + status
}

// chrome ist die gemeinsame Screen-Passage (DD2-48): globaler Header (Projekt+Nav),
// Titel mit Präfix, optionales Info-Grid, höhenfüllender Scroll-Body, Footer.
func (m model) chrome(title string, slots []hslot, body, hint string) string {
	head := m.breadcrumb(title) // Zone 1: `> slug: Title` + globale Shortcuts
	if g := metaGrid(slots, m.termWidth()); g != "" {
		head += "\n" + g
	}
	// Body auf Innenbreite umbrechen (inkl. langer Tokens) + 1 Spalte Rand links/rechts.
	wrapped := lipgloss.NewStyle().Padding(0, 1).Render(wrapText(body, m.termWidth()-2))
	// Zone 3: lokale Shortcuts — auf schmalen Screens umbrechen statt überlaufen.
	localKeys := theme.Muted.Render(wrapText(hint, m.termWidth()))
	// DD2-68 Rework: TopBar (Zone 1/2) und Footer (Zone 3/4) je per Trennlinie vom
	// Body abgesetzt (Wireframe-Zonen) — Innenbreite = termWidth().
	div := theme.Dim.Render(strings.Repeat("─", m.termWidth()))
	footH := lipgloss.Height(localKeys) + 2                 // + 1 Status-Zeile + 1 Divider über dem Footer
	avail := m.frameH() - lipgloss.Height(head) - footH - 1 // DD2-68: Innenhöhe, - 1 Divider unter der TopBar
	if avail < 4 {
		avail = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}
	win, ind := scrollView(wrapped, avail, m.scroll)
	status := m.statusBar(ind) // Zone 4: Split-Status (Info blau | Fehler rot), 1 Zeile
	// DD2-68: Screen mit Zonen-Trennlinien in den App-Außenrahmen wrappen (no-op wenn !viewBordered).
	return m.outerBorder(head + "\n" + div + "\n" + win + "\n" + div + "\n" + localKeys + "\n" + status)
}

// framed = chrome ohne Info-Grid (Backlog/Reviews/Picker).
func (m model) framed(title, body, hint string) string {
	return m.chrome(title, nil, body, hint)
}

// --- Picker ---

func (m model) ctxTitle(base string, ok bool, ctx string) string {
	if ok && ctx != "" {
		return base + " ∙ " + ctx
	}
	return base
}

// sprintMilestoneName liefert den Meilenstein-Namen eines Sprints — bevorzugt das
// vom Endpoint gelieferte milestone_name, fällt sonst auf den im Kontext gewählten
// Eltern-Meilenstein zurück (GetSprint joint den Namen nicht mit, DD2-23).
func sprintMilestoneName(s *api.Sprint, parent *api.Milestone) string {
	if s != nil && s.MilestoneName != nil && *s.MilestoneName != "" {
		return *s.MilestoneName
	}
	if parent != nil {
		return parent.Name
	}
	return ""
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

// statusDot codiert den Status über EINEN gemeinsamen Glyph; die Bedeutung trägt
// allein die Farbe (DD2-176, PO-Wunsch „gleiches Icon, verschiedene Farben"). Der
// frühere Form-Switch (hohl/✗/gefüllt) ist raus — Single Source ist theme.StatusIcon.
func statusDot(status string) string {
	return theme.StatusIcon(status)
}

func statusText(status string) string {
	return theme.StatusStyle(status).Render(status)
}

// truncate kürzt ANSI-sicher auf w Zellen (schneidet nie Escape-Sequenzen) —
// kritisch, da Zeilen gefärbt sind; Rune-Slicing würde Sequenzen zerstören.
func truncate(s string, w int) string {
	if w < 1 {
		return ""
	}
	return ansi.Truncate(s, w, "…")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
