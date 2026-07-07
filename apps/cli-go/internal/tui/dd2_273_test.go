package tui

// dd2_273_test.go — DD2-273: Update-Checker + Release-Notes-Overlay.
// State/Update-Tests (checkVersionChangeWith reine Entscheidungslogik, Dispatch,
// Modal-Guards, Persistenz) + Golden-Snapshot der reinen View() (AC5).

import (
	"strings"
	"testing"

	"devd-cli/internal/config"
	tea "github.com/charmbracelet/bubbletea"
)

// fakeLoadSave baut ein load/save-Funktionspaar über einen In-Memory-State, ohne
// echtes HOME/FS anzufassen — checkVersionChangeWith ist FS-frei testbar.
func fakeLoadSave(initial config.State) (load func() (config.State, error), save func(string) error, get func() config.State) {
	st := initial
	load = func() (config.State, error) { return st, nil }
	save = func(v string) error { st.LastSeenVersion = v; return nil }
	get = func() config.State { return st }
	return
}

// --- AC2: Erstinstallation (kein persistierter Wert) → KEIN Overlay, Version
// wird direkt als gesehen gesetzt (kein Changelog-Spam beim allerersten Start).

func TestCheckVersionChangeFirstInstallSkipsOverlay(t *testing.T) {
	load, save, get := fakeLoadSave(config.State{})
	lookup := func(string) (string, bool) { return "should not be called", true }

	msg := checkVersionChangeWith("1.0.0", load, save, lookup)

	if msg != nil {
		t.Fatalf("Erstinstallation sollte KEIN Overlay auslösen, got %#v", msg)
	}
	if get().LastSeenVersion != "1.0.0" {
		t.Errorf("LastSeenVersion sollte direkt auf 1.0.0 gesetzt werden, got %q", get().LastSeenVersion)
	}
}

// --- AC1: Versionswechsel erkannt → versionChangedMsg mit den Notes ---

func TestCheckVersionChangeDetectsUpgradeAndReturnsNotes(t *testing.T) {
	load, save, get := fakeLoadSave(config.State{LastSeenVersion: "1.0.0"})
	lookup := func(v string) (string, bool) {
		if v == "1.1.0" {
			return "# Notes for 1.1.0", true
		}
		return "", false
	}

	msg := checkVersionChangeWith("1.1.0", load, save, lookup)

	vc, ok := msg.(versionChangedMsg)
	if !ok {
		t.Fatalf("erwarte versionChangedMsg, got %#v", msg)
	}
	if vc.version != "1.1.0" || vc.body != "# Notes for 1.1.0" {
		t.Errorf("falscher Payload: %+v", vc)
	}
	// Persistenz passiert erst beim SCHLIESSEN des Overlays (AC3), nicht schon hier.
	if get().LastSeenVersion != "1.0.0" {
		t.Errorf("LastSeenVersion sollte VOR dem Schließen unverändert bleiben, got %q", get().LastSeenVersion)
	}
}

// --- Gleiche Version → kein Overlay, kein Persist-Aufruf nötig ---

func TestCheckVersionChangeSameVersionNoop(t *testing.T) {
	load, save, get := fakeLoadSave(config.State{LastSeenVersion: "1.1.0"})
	lookup := func(string) (string, bool) { return "should not be called", true }

	msg := checkVersionChangeWith("1.1.0", load, save, lookup)

	if msg != nil {
		t.Fatalf("unveränderte Version sollte kein Overlay auslösen, got %#v", msg)
	}
	if get().LastSeenVersion != "1.1.0" {
		t.Errorf("LastSeenVersion sollte unverändert bleiben, got %q", get().LastSeenVersion)
	}
}

// --- AC4: fehlende Markdown-Quelle → Overlay übersprungen (kein Crash, kein
// leeres Panel), Version TROTZDEM als gesehen persistiert (kein Re-Prompt-Loop).

func TestCheckVersionChangeMissingNotesSkipsButPersists(t *testing.T) {
	load, save, get := fakeLoadSave(config.State{LastSeenVersion: "1.0.0"})
	lookup := func(string) (string, bool) { return "", false } // Datei vergessen zu pflegen

	msg := checkVersionChangeWith("1.2.0", load, save, lookup)

	if msg != nil {
		t.Fatalf("fehlende Notes sollten KEIN Overlay auslösen, got %#v", msg)
	}
	if get().LastSeenVersion != "1.2.0" {
		t.Errorf("Version sollte trotz fehlender Notes als gesehen persistiert werden, got %q", get().LastSeenVersion)
	}
}

// --- releaseNotesFor: reale eingebettete Quelle (embed.FS) ---

func TestReleaseNotesForMissingVersionNotOk(t *testing.T) {
	if _, ok := releaseNotesFor("999.999.999"); ok {
		t.Error("nicht-existente Version sollte ok=false liefern")
	}
}

func TestReleaseNotesForExistingVersionOk(t *testing.T) {
	body, ok := releaseNotesFor(appVersion)
	if !ok {
		t.Fatalf("release-notes/%s.md sollte eingebettet sein (appVersion)", appVersion)
	}
	if strings.TrimSpace(body) == "" {
		t.Error("Release-Notes-Body sollte nicht leer sein")
	}
}

// --- Dispatch: versionChangedMsg setzt m.releaseNotes + resettet m.scroll ---

func TestUpdateVersionChangedMsgOpensOverlay(t *testing.T) {
	m := model{width: 90, height: 30, scroll: 7}
	mi, cmd := m.Update(versionChangedMsg{version: "2.0.0", body: "# Hi"})
	got := mi.(model)
	if got.releaseNotes == nil || got.releaseNotes.version != "2.0.0" || got.releaseNotes.body != "# Hi" {
		t.Fatalf("releaseNotes nicht korrekt gesetzt: %+v", got.releaseNotes)
	}
	if got.scroll != 0 {
		t.Errorf("scroll sollte beim Öffnen auf 0 zurückgesetzt werden, got %d", got.scroll)
	}
	if cmd != nil {
		t.Error("das Öffnen selbst sollte keinen weiteren Cmd auslösen")
	}
}

// --- AC3: Schließen persistiert die Version (über den echten config-Layer, mit
// isoliertem HOME) — ein Neustart derselben Version zeigt das Overlay nicht erneut.

func TestKeyReleaseNotesClosesAndPersists(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)

	m := model{width: 90, height: 30, releaseNotes: &releaseNotesState{version: "3.0.0", body: "# X"}}
	mi, cmd := m.keyReleaseNotes(tea.KeyMsg{Type: tea.KeyEnter})
	got := mi.(model)
	if got.releaseNotes != nil {
		t.Fatal("enter sollte das Overlay schließen")
	}
	if cmd == nil {
		t.Fatal("Schließen sollte den Persist-Cmd liefern")
	}
	cmd() // tea.Cmd synchron ausführen (kein echter Programm-Loop nötig)

	st, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load: %v", err)
	}
	if st.LastSeenVersion != "3.0.0" {
		t.Errorf("LastSeenVersion nach Schließen = %q, want 3.0.0", st.LastSeenVersion)
	}
}

// --- Scroll-Tasten werden vom Overlay konsumiert, schließen es NICHT ---

func TestKeyReleaseNotesScrollDoesNotClose(t *testing.T) {
	m := model{width: 90, height: 30, releaseNotes: &releaseNotesState{version: "3.0.0", body: "# X"}}
	mi, cmd := m.keyReleaseNotes(tea.KeyMsg{Type: tea.KeyDown})
	got := mi.(model)
	if got.releaseNotes == nil {
		t.Fatal("Scroll-Taste sollte das Overlay NICHT schließen")
	}
	if got.scroll != 1 {
		t.Errorf("scroll sollte um 1 erhöht werden, got %d", got.scroll)
	}
	if cmd != nil {
		t.Error("Scrollen sollte keinen Cmd auslösen")
	}
}

// --- Modal-Guards: Overlay fängt Tasten/Maus ab, bevor sie den View erreichen ---

func TestHandleKeyRoutesToReleaseNotesWhenOpen(t *testing.T) {
	m := model{width: 90, height: 30, view: viewBrowseProject, releaseNotes: &releaseNotesState{version: "3.0.0", body: "# X"}}
	mi, _ := m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("q")})
	got := mi.(model)
	// "q" ist im Tree normalerweise "goBrowse"; im Overlay muss es stattdessen schließen.
	if got.releaseNotes != nil {
		t.Error("q sollte das Overlay schließen (Guard vor dem View-Dispatch), nicht durchgereicht werden")
	}
}

func TestHandleMouseIgnoredWhenReleaseNotesOpen(t *testing.T) {
	m := model{width: 90, height: 30, view: viewBrowseProject, releaseNotes: &releaseNotesState{version: "3.0.0", body: "# X"}}
	mi, cmd := m.handleMouse(tea.MouseMsg{X: 5, Y: 5, Button: tea.MouseButtonLeft, Action: tea.MouseActionPress})
	got := mi.(model)
	if got.releaseNotes == nil {
		t.Error("ein Klick sollte das Overlay NICHT wegräumen (Maus ist tastaturgesteuerten Modalen egal)")
	}
	if cmd != nil {
		t.Error("Klick im Modal sollte keinen Cmd auslösen")
	}
}

// --- AC5: Golden-Snapshot der reinen View() (Beispiel-Markdown, Ascii-Profil) ---

func TestGoldenReleaseNotesOverlay(t *testing.T) {
	m := model{
		width: 90, height: 30, view: viewBrowseProject,
		releaseNotes: &releaseNotesState{
			version: "1.2.0",
			body:    "# What's new\n\n- Added the update checker\n- Fixed a bug\n",
		},
	}
	assertGolden(t, "release_notes_overlay", m.View())
}
