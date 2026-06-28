package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("\n  %s\n\n  q: quit\n", lipgloss.NewStyle().Foreground(theme.Red).Render("Fehler: "+m.err.Error()))
	}
	base := m.viewBase()
	if m.confirmQuit { // DD2-49: Beenden-Confirm liegt top-most über allem
		return placeOverlay(base, m.quitBox(), m.termWidth(), m.height)
	}
	if m.helpOpen { // DD2-31: Shortcut-Übersicht
		return placeOverlay(base, m.helpBox(), m.termWidth(), m.height)
	}
	// Command-Center (T16): Formular bzw. Palette schweben zentriert über dem Frame.
	if m.form != nil {
		return placeOverlay(base, m.formBox(), m.termWidth(), m.height)
	}
	if m.paletteOpen {
		return placeOverlay(base, m.paletteBox(), m.termWidth(), m.height)
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
	if m.smPick { // T03 Flow A: Sprint→Meilenstein-Picker
		return placeOverlay(base, m.sprintMilestoneMenu(), m.termWidth(), m.height)
	}
	if m.maPick { // T03 Flow B: Meilenstein→Sprints-Checkliste
		return placeOverlay(base, m.milestoneAssignMenu(), m.termWidth(), m.height)
	}
	if m.tagPick { // DD2-33: Tag-Zuweisungs-Picker
		return placeOverlay(base, m.tagPickerMenu(), m.termWidth(), m.height)
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
	var b strings.Builder
	b.WriteString(theme.Header.Render("Meilenstein abschließen") + "\n\n")
	b.WriteString(m.mcName + "\n\n")
	b.WriteString(theme.Dim.Render(fmt.Sprintf("%d offene Sprint(s) → completed, ihre offenen Issues → done.", m.mcSprints)) + "\n")
	b.WriteString(theme.Dim.Render("PO-Aktion (DD-186) — nicht umkehrbar.") + "\n\n")
	b.WriteString(lipgloss.NewStyle().Foreground(theme.Red).Render("y") + theme.Dim.Render(": kaskadierend abschließen   ") +
		theme.Accent.Render("n/esc") + theme.Dim.Render(": abbrechen"))
	return lipgloss.NewStyle().
		Width(modalBoxWidth(m.width)).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Red).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}

// milestoneStatusMenu: schwebendes Meilenstein-Status-Menü (Taste S, T01).
func (m model) milestoneStatusMenu() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Meilenstein-Status setzen") + "\n")
	b.WriteString(theme.Dim.Render("aktuell: "+m.msTargetStatus) + "\n\n")
	for i, s := range m.msopts {
		cursor := "  "
		label := statusText(s)
		if s == "completed" {
			label = statusText(s) + theme.Dim.Render(" (alle Sprints müssen terminal sein)")
		}
		if i == m.msmenu.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(s)
			if s == "completed" {
				label = theme.Header.Render(s) + theme.Dim.Render(" (alle Sprints müssen terminal sein)")
			}
		}
		b.WriteString(cursor + label + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("enter: setzen   esc: abbrechen"))
	return lipgloss.NewStyle().
		Width(clampModalWidth(46, m.width)). // DD2-55: auf Terminal clampen
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}

func (m model) viewBase() string {
	switch m.view {
	case viewPicker:
		return m.viewPicker()
	case viewBacklog:
		return m.viewBacklog()
	case viewDetail:
		return m.viewDetail()
	case viewMilestone:
		return m.viewMilestone()
	case viewSprint:
		return m.viewSprint()
	case viewReview:
		return m.viewReview()
	case viewReviewsList:
		return m.viewReviewsList()
	case viewMemory:
		return m.viewMemory()
	case viewTree:
		return m.viewTree() // DD2-57: Tree+Detail-Prototyp
	case viewTags:
		return m.viewTags() // DD2-75: Tag-Manager
	default:
		return m.viewColumns() // rendert Filter-Modal inline, wenn m.filtering
	}
}

// --- Reviews-Page (T17): Liste offener Review-Sprints ---

func (m model) viewReviewsList() string {
	var b strings.Builder
	b.WriteString(theme.Dim.Render("(Sprints im Status review)") + "\n\n")
	if len(m.reviewSprints) == 0 {
		b.WriteString(theme.Dim.Render("(keine Sprints im Review — S im Cockpit setzt active→review)") + "\n")
	}
	for i, s := range m.reviewSprints {
		cursor := "  "
		if i == m.rvlist.cursor {
			cursor = theme.Accent.Render("▸ ")
		}
		ms := ""
		if s.MilestoneName != nil && *s.MilestoneName != "" {
			ms = theme.Dim.Render("  — " + truncate(*s.MilestoneName, 24))
		}
		b.WriteString(cursor + fmt.Sprintf("%-9s %-30s %s%s",
			s.Key, truncate(s.Name, 30), statusText(s.Status),
			theme.Dim.Render(fmt.Sprintf("  %d/%d", s.DoneCount, s.ItemCount))) + ms + "\n")
	}
	return m.framed("Offene Reviews", b.String(), "i/k:↑↓  enter:Cockpit  esc/q:zurück")
}

// --- Header / Footer ---

// globalKeys = auf JEDEM Screen identische Shortcuts (Wireframe-Zone „Globale
// Shortcuts", rechts im Header). Muted (D01: Hinweis, nicht echte Info).
func globalKeys() string {
	return theme.Muted.Render("ctrl+k:Cmd  p:Projekt  b:Backlog  R:Reviews  ?:Hilfe  q:Quit")
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

// statusBar = Footer-Zone 4 (Wireframe): links Meldungen/Hinweise (Blue), rechts
// Scroll-Indikator (Accent) + kritische Fehler (Red). Leer → leere Zeile.
func (m model) statusBar(ind string) string {
	left := m.status
	if left != "" && ansi.Strip(left) == left { // nur ungefärbte Meldungen einfärben
		left = lipgloss.NewStyle().Foreground(theme.Blue).Render(left)
	}
	var rparts []string
	if ind != "" {
		rparts = append(rparts, theme.Accent.Render(ind))
	}
	if m.errNote != "" {
		rparts = append(rparts, lipgloss.NewStyle().Foreground(theme.Red).Render(m.errNote))
	}
	right := strings.Join(rparts, "  ")
	if left == "" && right == "" {
		return ""
	}
	w := m.termWidth()
	// Schmal: Fehler/Indikator (rechts) haben Vorrang, Meldung (links) wird gekürzt —
	// Footer bleibt 1 Zeile (chrome rechnet mit fixer Status-Höhe).
	if lipgloss.Width(left)+lipgloss.Width(right)+1 > w {
		max := w - lipgloss.Width(right) - 1
		if max < 0 {
			return ansi.Truncate(right, w, "…")
		}
		left = ansi.Truncate(left, max, "…")
	}
	gap := w - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	return left + strings.Repeat(" ", gap) + right
}

func (m model) footer() string {
	if m.status != "" {
		// DD2-35: transienter Toast — wie statusBar() einfärben (ungefärbter Text →
		// Blau, noticeText liefert bereits Sapphire) statt unscheinbar Dim; auf die
		// Terminalbreite umbrechen (analog Hint, DD2-73). Auto-Clear via clearStatusMsg.
		st := m.status
		if ansi.Strip(st) == st {
			st = lipgloss.NewStyle().Foreground(theme.Blue).Render(st)
		}
		return wrapText(st, m.termWidth())
	}
	// DD2-29: Status-Taste depth-abhängig benennen — s wirkt je Ebene auf Sprint
	// (depth 1) bzw. Issue (depth 2), S auf den Meilenstein (depth 0).
	var act string
	switch m.depth {
	case 0:
		act = "S:Meilenstein-Status  d:löschen"
	case 1:
		act = "s:Sprint-Status  d:löschen"
	default:
		act = "s:Issue-Status"
	}
	hint := "i/k:↑↓  l/→:rein  j/←:raus  enter:Detail  " + act + "  f:Filter  y:Yank  b:Backlog  R:Reviews  t:Tree  q:quit"
	// DD2-73: auf schmalen Terminals umbrechen statt in die Pane-Spalten überlaufen
	// (analog chrome()). viewColumns rechnet die Footer-Höhe in die Body-Höhe ein.
	return theme.Dim.Render(wrapText(hint, m.termWidth()))
}

func (m model) termWidth() int {
	if m.width < 30 {
		return 100
	}
	return m.width
}

func (m model) bodyHeight() int {
	h := m.height - 4
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
// hint = Screen-Tasten (von m.status überschrieben). Lange Zeilen werden auf die
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
	footH := lipgloss.Height(localKeys) + 1 // + 1 Status-Zeile
	avail := m.height - lipgloss.Height(head) - footH
	if avail < 4 {
		avail = m.bodyHeight() // Höhe unbekannt (Init/Tests) → großzügiger Fallback
	}
	win, ind := scrollView(wrapped, avail, m.scroll)
	status := m.statusBar(ind) // Zone 4: Split-Status (Info blau | Fehler rot), 1 Zeile
	return head + "\n" + win + "\n" + localKeys + "\n" + status
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

// statusDot codiert Status doppelt über Form + Farbe (D09): hohl ◦ = geplant/
// nicht-gestartet, ✗ = abgebrochen/abgelehnt, sonst gefüllt ◉ = aktive/laufende
// Zustände. Farbe immer aus statusColor. Glyphen East-Asian-neutral (DD2-53).
func statusDot(status string) string {
	var glyph string
	switch status {
	case "planning", "planned", "new":
		glyph = "◦" // U+25E6 noch nicht gestartet (neutral; war ○ U+25CB = ambiguous)
	case "cancelled", "rejected":
		glyph = "✗" // U+2717 abgebrochen (neutral)
	default:
		glyph = "◉" // U+25C9 aktiv/laufend/terminal-done (neutral; war ● U+25CF = ambiguous)
	}
	return theme.StatusStyle(status).Render(glyph)
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
