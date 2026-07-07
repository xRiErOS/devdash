package tui

// version.go — DD2-273: lokaler Versionswechsel-Erkenner + Release-Notes-Quelle.
// KEIN Netzwerk-Update-Check (cli-go hat keinen Auto-Update-Mechanismus) — appVersion
// wird manuell bei jedem funktionalen Release hochgezählt, Release-Notes werden als
// Markdown eingebettet (kein Netz-I/O). "Zuletzt gesehene Version" lebt im leichten
// Runtime-State-Layer (config.State/state.json), NICHT in der validierten
// Settings-Datei (config.yaml) — das eine ist Konfiguration, das andere Verlauf.

import (
	"embed"

	"devd-cli/internal/config"
	tea "github.com/charmbracelet/bubbletea"
)

// appVersion ist die lokale Versionskennung der Binary — manuell pflegen bei jedem
// funktionalen Release. Kein -ldflags-Build-Stamp (kein bestehendes Äquivalent im
// Repo, würde die Build-Pipeline anfassen — out of scope für DD2-273).
const appVersion = "0.1.0"

//go:embed release-notes/*.md
var releaseNotesFS embed.FS

// releaseNotesFor liefert den rohen Markdown-Inhalt der Release-Notes für version.
// ok=false, wenn die Datei fehlt (AC4: Overlay wird dann übersprungen, kein Crash).
func releaseNotesFor(version string) (body string, ok bool) {
	data, err := releaseNotesFS.ReadFile("release-notes/" + version + ".md")
	if err != nil {
		return "", false
	}
	return string(data), true
}

// versionChangedMsg signalisiert einen erkannten Versionswechsel (Init()-Cmd,
// checkVersionChange). body ist bereits synchron aus der eingebetteten Quelle
// gelesen — kein separater Error-/Retry-Pfad wie bei Netzwerk-Cmds nötig.
type versionChangedMsg struct {
	version string
	body    string
}

// checkVersionChange ist der tea.Cmd, den Init() feuert (DD2-273 AC1-4). Dünner
// Wrapper um checkVersionChangeWith mit den echten Seiten-Effekt-Funktionen —
// die eigentliche Entscheidungslogik ist FS-frei testbar (s. checkVersionChangeWith).
func checkVersionChange() tea.Msg {
	return checkVersionChangeWith(appVersion, config.Load, config.SetLastSeenVersion, releaseNotesFor)
}

// checkVersionChangeWith ist die reine Entscheidungslogik hinter checkVersionChange,
// mit injizierten load/save/lookup-Funktionen (testbar ohne echtes HOME/FS/embed):
//
//   - kein persistierter Wert (Erstinstallation, AC2): LastSeenVersion SOFORT auf
//     current setzen, KEIN Overlay (kein Changelog-Spam bei Erstinstallation).
//   - persistierter Wert == current: nichts geändert, kein Overlay.
//   - persistierter Wert != current: Notes nachschlagen — vorhanden → versionChangedMsg
//     (Overlay öffnet sich); fehlend (AC4) → current trotzdem als gesehen
//     persistieren, Overlay übersprungen (kein Crash, kein leeres Panel).
func checkVersionChangeWith(current string, load func() (config.State, error), save func(string) error, lookup func(string) (string, bool)) tea.Msg {
	st, _ := load()
	if st.LastSeenVersion == "" {
		_ = save(current)
		return nil
	}
	if st.LastSeenVersion == current {
		return nil
	}
	body, ok := lookup(current)
	if !ok {
		_ = save(current)
		return nil
	}
	return versionChangedMsg{version: current, body: body}
}

// persistLastSeenVersion ist der tea.Cmd, der beim Schließen des Release-Notes-
// Overlays feuert (AC3) — schreibt version in den Runtime-State zurück, damit ein
// Neustart derselben Binary-Version das Overlay nicht erneut zeigt.
func persistLastSeenVersion(version string) tea.Cmd {
	return func() tea.Msg {
		_ = config.SetLastSeenVersion(version)
		return nil
	}
}
