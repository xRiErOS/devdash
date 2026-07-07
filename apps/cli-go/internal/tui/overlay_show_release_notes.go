package tui

// overlay_show_release_notes.go — DD2-273: modales Release-Notes-Overlay, geöffnet
// vom Init()-Cmd checkVersionChange (version.go) bei erkanntem Versionswechsel
// (versionChangedMsg, s. update.go). Größer als Toast/Menüs — scrollbarer
// Markdown-Body über dieselbe glamour-Pipeline wie editor.go/glowRender.
// MODAL: fängt jede Taste/jeden Klick ab, bis geschlossen (irgendeine Taste außer
// den Scroll-Tasten) — dann persistLastSeenVersion (AC3), kein Re-Prompt bei
// gleicher appVersion.

import (
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
)

// releaseNotesState hält die aktuell offene Overlay-Instanz. version = die NEUE
// Version, die den Wechsel ausgelöst hat; body = roher Markdown-Text (vor
// glamour-Rendering, s. releaseNotesBox). Scroll läuft über die geteilte
// Fokus-Maschine m.scroll/keyScroll (Vorbild statische Detail-Views, DD2-25/30)
// — kein eigenes Scroll-Feld auf diesem Typ nötig.
type releaseNotesState struct {
	version string
	body    string
}

// releaseNotesPanelWidth ist die Wunschbreite — größer als der Standard-Modal
// (defaultModalWidth 64), damit Markdown (Listen/Überschriften) Platz hat.
const releaseNotesPanelWidth = 76

// releaseNotesBox rendert das Release-Notes-Panel: Titel „What's new in v{version}",
// Body = glamour-gerendertes Markdown (glowRender — dieselbe Pipeline wie
// editor.go, inkl. Farbprofil-Fallback), gefenstert über die geteilte
// Scroll-Maschine (m.scroll/scrollView). Rahmenfarbe Mauve (Akzent).
func (m model) releaseNotesBox() string {
	rn := m.releaseNotes
	w := clampModalWidth(releaseNotesPanelWidth, m.width)
	innerW := w - 4 // modalBox: Border(2) + Padding(0,1)*2, wie toastBox/formInnerWidth
	rendered := glowRender(rn.body, innerW)

	h := m.height - 10 // Platz für Kopf/Rahmen/Footer der umgebenden View lassen
	if h < 6 {
		h = 6
	}
	win, _ := scrollView(rendered, h, m.scroll)
	return modalPanel("What's new in v"+rn.version, win, "up/down: scroll   enter/esc/q: close", w, theme.Mauve)
}

// keyReleaseNotes behandelt Tasten, solange das Release-Notes-Overlay offen ist
// (MODAL — fängt JEDE Taste ab, s. handleKey-Guard-Kette). up/down/pgup/pgdown/g/G
// scrollen (keyScroll, geteilte Fokus-Maschine); jede andere Taste schließt UND
// persistiert die gesehene Version (AC3) — kein separates esc-vs-enter-Verhalten
// nötig, da es nichts zu verwerfen gibt (reines Lese-Overlay).
func (m model) keyReleaseNotes(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.keyScroll(msg.String()) {
		return m, nil
	}
	version := m.releaseNotes.version
	m.releaseNotes = nil
	m.scroll = 0
	return m, persistLastSeenVersion(version)
}
