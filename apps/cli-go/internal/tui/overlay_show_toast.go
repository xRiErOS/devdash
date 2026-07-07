package tui

// overlay_show_toast.go — DD2-272: farbcodiertes Eck-Toast-Overlay. Löst den
// alten Footer-Status-Toast (model.status/statusSeq/statusSticky, DD2-35/93) ab.
// EIN Slot (kein Stack, kein Stapeln): ein neuer Toast ersetzt den alten sofort.
// Auto-Dismiss nach kind-spezifischer Dauer (toastTimeout, messages.go) — außer
// sticky=true, das übersteht Reload-Zyklen UND hat KEINEN Auto-Dismiss-Timer,
// bis ein neuerer Toast ihn ersetzt oder ein Klick ihn schließt (AC2).
//
// Rendering: kein neues Compositing-Primitiv — canvasLines()/spliceLine() (die
// placeOverlay() selbst nutzt) legen die Box in die obere rechte Ecke, statt
// placeOverlay()s Zentrierung. modalBox() bleibt die Box-Chrome-Quelle.
//
// Eingabe: NICHT modal — blockiert keine Tastatur. Nur ein Linksklick auf die
// Toast-Hit-Area wird VOR dem regulären handleMouse-Dispatch abgefangen
// (update.go: handleMouse) — Dismiss, oder bei gesetztem target: View-Wechsel +
// Fokus auf die adressierte Entität, dann Dismiss.

import (
	"strings"
	"time"

	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

type toastKind int

const (
	toastInfo  toastKind = iota // Blue/Mauve — Hinweis/Erfolg
	toastWarn                   // Yellow — Warnung, nicht blockierend
	toastError                  // Red — Fehler
)

// toastTarget adressiert minimal, wohin ein Klick auf den Toast springt (DD2-272
// AC4). Nur die Felder befüllen, die für target.view zur Fokus-Wiederherstellung
// gebraucht werden — bewusst kein generisches "any", damit der Klick-Handler
// (handleMouse) ohne Type-Switch auskommt.
type toastTarget struct {
	view        viewID
	milestoneID int
	sprintID    int
	issueID     int
}

// toastState ist der EINE Toast-Slot (kein Stack). seq = Generation, analog dem
// abgelösten statusSeq — toastExpiredMsg löscht den Toast nur, wenn seq noch der
// aktuellen Generation entspricht (sonst hat ein neuerer Toast ihn schon ersetzt).
type toastState struct {
	kind    toastKind
	title   string
	context string // zweite, gedämpfte Zeile (optional)
	target  *toastTarget
	seq     int
	sticky  bool
	setAt   time.Time // Debounce-Fenster (AC5)
}

// toastDebounceWindow: ein zweites noticeMsg innerhalb dieser Spanne nach dem
// letzten Toast ersetzt dessen Inhalt in-place statt eine neue Generation +
// einen neuen Auto-Dismiss-Tick zu starten (AC5) — EIN Timer, kein Stapeln.
const toastDebounceWindow = 300 * time.Millisecond

// toastDuration liefert die kind-spezifische Auto-Dismiss-Dauer.
func toastDuration(kind toastKind) time.Duration {
	switch kind {
	case toastError:
		return 8 * time.Second
	case toastWarn:
		return 3 * time.Second
	default:
		return 5 * time.Second
	}
}

// showToast setzt den Toast-Slot. Innerhalb des Debounce-Fensters (AC5) wird
// der bestehende Slot in-place aktualisiert (Inhalt/Kind/Target), OHNE neue
// Generation/Timer — der laufende Auto-Dismiss-Tick bleibt die einzige Quelle
// der Wahrheit. Sticky-Toasts (AC2) bekommen KEINEN Auto-Dismiss-Timer.
func (m model) showToast(kind toastKind, title, context string, target *toastTarget, sticky bool) (model, tea.Cmd) {
	now := time.Now()
	if m.toast != nil && now.Sub(m.toast.setAt) < toastDebounceWindow {
		t := *m.toast
		t.kind, t.title, t.context, t.target, t.sticky, t.setAt = kind, title, context, target, sticky, now
		m.toast = &t
		return m, nil // Debounce: kein neuer Tick, laufender bleibt gültig
	}
	seq := 1
	if m.toast != nil {
		seq = m.toast.seq + 1
	}
	m.toast = &toastState{kind: kind, title: title, context: context, target: target, seq: seq, sticky: sticky, setAt: now}
	if sticky {
		return m, nil // AC2: sticky = kein Auto-Dismiss, bis Replace/Klick
	}
	return m, toastTimeout(seq, kind)
}

// clearToastUnlessSticky löscht den Toast NUR, wenn er nicht sticky ist (D02-93
// Sticky-Schutz, jetzt fürs Eck-Toast: Reload-Handler dürfen einen sticky-Toast
// nicht clobbern — analog dem alten "!m.statusSticky"-Gate in sprintMsg/refreshedMsg).
func (m model) clearToastUnlessSticky() model {
	if m.toast != nil && !m.toast.sticky {
		m.toast = nil
	}
	return m
}

// toastKindColor mappt kind → Rahmen-/Akzentfarbe (Styling-Vorgabe DD2-272).
func toastKindColor(k toastKind) lipgloss.Color {
	switch k {
	case toastError:
		return theme.Red
	case toastWarn:
		return theme.Yellow
	default:
		return theme.Blue
	}
}

const toastBoxWidth = 36 // Zielbreite 32-40 Spalten (DD2-272)

// toastBox rendert die Toast-Box: Zeile 1 = farbiger Dot + Titel (kind-gefärbt),
// Zeile 2 = context gedämpft (ansi.Truncate, NIE String-Slicing/len()). Rahmen
// folgt derselben kind-Farbe.
func (m model) toastBox() string {
	t := m.toast
	col := toastKindColor(t.kind)
	innerW := toastBoxWidth - 4 // modalBox: Border(2) + Padding(0,1)*2 = 4
	dot := lipgloss.NewStyle().Foreground(col).Render("●")
	title := ansi.Truncate(t.title, innerW-2, "…") // -2: Dot + Space
	line1 := dot + " " + lipgloss.NewStyle().Foreground(col).Bold(true).Render(title)
	body := line1
	if t.context != "" {
		ctx := ansi.Truncate(t.context, innerW, "…")
		body += "\n" + theme.Dim.Render(ctx)
	}
	// modalBox setzt lipgloss.Width(width) auf die Style VOR dem Border — der
	// Border legt danach noch +2 (links/rechts je 1) auf die Gesamtbreite drauf.
	// toastBoxWidth-2 kompensiert das, damit die gerenderte Box exakt
	// toastBoxWidth breit ist (Zielbreite 32-40, DD2-272).
	return modalBox(body, toastBoxWidth-2, col)
}

// toastGeometry liefert die Platzierung der Toast-Box (obere rechte Ecke) auf
// der tw×th-Leinwand — geteilte Geometrie zwischen Rendering (renderToast) und
// Klick-Hit-Test (handleMouse), damit sie nie auseinanderdriften.
func (m model) toastGeometry() (x, y, w, h int) {
	box := m.toastBox()
	lines := strings.Split(box, "\n")
	w = 0
	for _, l := range lines {
		if lw := ansi.StringWidth(l); lw > w {
			w = lw
		}
	}
	h = len(lines)
	tw := m.termWidth()
	x = tw - w
	if x < 0 {
		x = 0
	}
	y = 0
	return x, y, w, h
}

// renderToast legt die Toast-Box über die fertige Basis-View (oben rechts).
// Wiederverwendet canvasLines()/spliceLine() (dieselben Primitive, die
// placeOverlay() intern nutzt) statt placeOverlay()s Zentrierung — kein neues
// Compositing-Primitiv, nur andere Koordinaten.
func (m model) renderToast(base string) string {
	if m.toast == nil {
		return base
	}
	x, y, w, _ := m.toastGeometry()
	tw, th := m.termWidth(), m.height
	bgLines := canvasLines(base, tw, th)
	fgLines := strings.Split(m.toastBox(), "\n")
	for i, fl := range fgLines {
		row := y + i
		if row < 0 || row >= len(bgLines) {
			continue
		}
		if pad := w - ansi.StringWidth(fl); pad > 0 {
			fl += overlayPad.Render(strings.Repeat(" ", pad))
		}
		bgLines[row] = spliceLine(bgLines[row], fl, x, w)
	}
	return strings.Join(bgLines, "\n")
}

// toastHit meldet, ob (mx,my) innerhalb der aktuell gerenderten Toast-Box liegt.
func (m model) toastHit(mx, my int) bool {
	if m.toast == nil {
		return false
	}
	x, y, w, h := m.toastGeometry()
	return mx >= x && mx < x+w && my >= y && my < y+h
}

// dismissToast schließt den Toast (Klick, DD2-272 AC4). Mit gesetztem target
// wechselt sie zuerst in dessen View (minimale Adressierung — target trägt nur
// die IDs, die ein künftiger Producer für tiefere Fokus-Wiederherstellung
// braucht; kein Toast-Producer setzt aktuell mehr als die View).
func (m model) dismissToast() (tea.Model, tea.Cmd) {
	if m.toast != nil && m.toast.target != nil {
		m.view = m.toast.target.view
	}
	m.toast = nil
	return m, nil
}
