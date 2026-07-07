package tui

// overlay_show_toast_test.go — DD2-272: State/Update-Tests für den Eck-Toast
// (Lebenszyklus, Sticky, Debounce, Klick) + Golden-Snapshot der 3 Farbvarianten
// (TrueColor-Guard, s. cockpit_align_test.go/meta_strip_test.go-Muster).

import (
	"strings"
	"testing"
	"time"

	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// --- AC1: noticeMsg erscheint als Eck-Toast, nicht mehr im Footer-Fließtext ---

func TestNoticeMsgSetsToast(t *testing.T) {
	m := model{width: 90, height: 22}
	mi, cmd := m.Update(noticeMsg{text: "Saved", kind: toastInfo})
	got := mi.(model)
	if got.toast == nil || got.toast.title != "Saved" {
		t.Fatalf("noticeMsg sollte den Toast setzen, got %+v", got.toast)
	}
	if got.toast.kind != toastInfo {
		t.Errorf("kind = %v, want toastInfo", got.toast.kind)
	}
	if cmd == nil {
		t.Error("noticeMsg (nicht sticky) sollte einen Auto-Dismiss-Cmd liefern")
	}
}

// --- AC2: Auto-Dismiss nach kind-spezifischer Dauer, außer sticky ---

func TestToastDurationByKind(t *testing.T) {
	cases := []struct {
		kind toastKind
		want time.Duration
	}{
		{toastInfo, 5 * time.Second},
		{toastWarn, 3 * time.Second},
		{toastError, 8 * time.Second},
	}
	for _, c := range cases {
		if got := toastDuration(c.kind); got != c.want {
			t.Errorf("toastDuration(%v) = %v, want %v", c.kind, got, c.want)
		}
	}
}

// showToast() liefert den Auto-Dismiss-Cmd als tea.Tick — der blockiert beim
// Aufruf real für toastDuration(kind) (3-8s, s. commands.go). NIE in Tests
// invoken (sonst schläft der Testlauf echt so lange) — nur auf non-nil prüfen.
// Die Generation/seq-Korrektheit wird stattdessen direkt über den
// toastExpiredMsg-Update-Handler geprüft (TestToastExpiredMsgClearsOnlyMatchingGeneration),
// ohne den echten Timer abzuwarten.
func TestShowToastNonStickyReturnsTimeoutCmd(t *testing.T) {
	m := model{width: 90, height: 22}
	m, cmd := m.showToast(toastError, "boom", "", nil, false)
	if cmd == nil {
		t.Fatal("nicht-sticky Toast sollte einen Auto-Dismiss-Cmd liefern")
	}
	if m.toast.seq != 1 {
		t.Errorf("erste Generation sollte seq=1 sein, got %d", m.toast.seq)
	}
}

func TestShowToastStickyHasNoAutoDismiss(t *testing.T) {
	m := model{width: 90, height: 22}
	m, cmd := m.showToast(toastInfo, "created", "", nil, true)
	if cmd != nil {
		t.Error("sticky Toast darf KEINEN Auto-Dismiss-Cmd liefern (AC2)")
	}
	if !m.toast.sticky {
		t.Error("toast.sticky sollte true sein")
	}
}

func TestToastExpiredMsgClearsOnlyMatchingGeneration(t *testing.T) {
	m := model{width: 90, height: 22}
	m, _ = m.showToast(toastInfo, "first", "", nil, false)
	staleSeq := m.toast.seq
	// Außerhalb des Debounce-Fensters (AC5 hat einen eigenen Test) — sonst würde
	// der zweite Aufruf die Generation NICHT erhöhen und dieser Test testete
	// versehentlich denselben Toast.
	m.toast.setAt = m.toast.setAt.Add(-2 * toastDebounceWindow)

	// AC3: ein neuerer Toast überschreibt sofort — der alte Auto-Clear-Tick (alte
	// Generation) darf den neuen NICHT wegräumen.
	m, _ = m.showToast(toastWarn, "second", "", nil, false)
	if m.toast.title != "second" || m.toast.seq == staleSeq {
		t.Fatalf("neuerer Toast sollte den alten sofort ersetzen, got %+v", m.toast)
	}
	mi, _ := m.Update(toastExpiredMsg{seq: staleSeq})
	m = mi.(model)
	if m.toast == nil || m.toast.title != "second" {
		t.Errorf("verspäteter Tick der ALTEN Generation räumte den aktuellen Toast weg: %+v", m.toast)
	}

	// Der Tick der AKTUELLEN Generation räumt ihn korrekt.
	mi, _ = m.Update(toastExpiredMsg{seq: m.toast.seq})
	m = mi.(model)
	if m.toast != nil {
		t.Errorf("Tick der aktuellen Generation sollte den Toast räumen, got %+v", m.toast)
	}
}

// --- AC5: Debounce — zwei noticeMsg <300ms ergeben genau einen Toast, ohne
// dass ein zweiter Timer parallel läuft (kein Stapeln, EIN Slot). ---

func TestShowToastDebounceWithinWindowReplacesInPlace(t *testing.T) {
	m := model{width: 90, height: 22}
	m, cmd1 := m.showToast(toastInfo, "first", "", nil, false)
	if cmd1 == nil {
		t.Fatal("erster Toast sollte einen Timer-Cmd liefern")
	}
	firstSeq := m.toast.seq

	// Zweiter Call unmittelbar danach (< 300ms) → Debounce: gleiche Generation,
	// kein neuer Timer-Cmd.
	m, cmd2 := m.showToast(toastError, "second", "ctx", nil, false)
	if cmd2 != nil {
		t.Error("Debounce-Fenster: zweiter Call sollte KEINEN neuen Timer-Cmd liefern")
	}
	if m.toast.seq != firstSeq {
		t.Errorf("Debounce sollte die Generation NICHT erhöhen: %d → %d", firstSeq, m.toast.seq)
	}
	if m.toast.title != "second" || m.toast.kind != toastError || m.toast.context != "ctx" {
		t.Errorf("Debounce sollte Inhalt/Kind auf den letzten Aufruf aktualisieren: %+v", m.toast)
	}
}

func TestShowToastAfterDebounceWindowGetsNewGeneration(t *testing.T) {
	m := model{width: 90, height: 22}
	m, _ = m.showToast(toastInfo, "first", "", nil, false)
	firstSeq := m.toast.seq
	// Zeit künstlich zurückversetzen, um das Debounce-Fenster verstreichen zu lassen.
	m.toast.setAt = m.toast.setAt.Add(-2 * toastDebounceWindow)

	m, cmd := m.showToast(toastInfo, "second", "", nil, false)
	if cmd == nil {
		t.Error("außerhalb des Debounce-Fensters sollte wieder ein Timer-Cmd kommen")
	}
	if m.toast.seq == firstSeq {
		t.Error("außerhalb des Debounce-Fensters sollte die Generation erhöht werden")
	}
}

// --- Sticky-Schutz vor Reload-Clobber (DD2-93/272) ---

func TestClearToastUnlessStickyPreservesSticky(t *testing.T) {
	m := model{width: 90, height: 22}
	m, _ = m.showToast(toastInfo, "created", "", nil, true)
	m = m.clearToastUnlessSticky()
	if m.toast == nil {
		t.Error("sticky Toast darf durch clearToastUnlessSticky nicht verschwinden")
	}
	m.toast.sticky = false
	m = m.clearToastUnlessSticky()
	if m.toast != nil {
		t.Error("nicht-sticky Toast sollte von clearToastUnlessSticky geräumt werden")
	}
}

// --- AC4: Klick auf den Toast — mit target wechselt die View + schließt,
// ohne target schließt nur, außerhalb bleibt er unangetastet. ---

func toastClickAt(m model, x, y int) (tea.Model, tea.Cmd) {
	return m.handleMouse(tea.MouseMsg{X: x, Y: y, Button: tea.MouseButtonLeft, Action: tea.MouseActionPress})
}

func TestToastClickWithoutTargetDismissesOnly(t *testing.T) {
	m := model{width: 90, height: 22, view: viewBrowseBacklog}
	m, _ = m.showToast(toastInfo, "Saved", "", nil, false)
	x, y, _, _ := m.toastGeometry()
	mi, _ := toastClickAt(m, x, y)
	got := mi.(model)
	if got.toast != nil {
		t.Error("Klick auf Toast ohne target sollte ihn schließen")
	}
	if got.view != viewBrowseBacklog {
		t.Errorf("Klick ohne target darf die View nicht wechseln, got %v", got.view)
	}
}

func TestToastClickWithTargetSwitchesViewAndDismisses(t *testing.T) {
	m := model{width: 90, height: 22, view: viewBrowseBacklog}
	m, _ = m.showToast(toastInfo, "Issue moved", "", &toastTarget{view: viewDetailIssue}, false)
	x, y, _, _ := m.toastGeometry()
	mi, _ := toastClickAt(m, x, y)
	got := mi.(model)
	if got.toast != nil {
		t.Error("Klick auf Toast mit target sollte ihn schließen")
	}
	if got.view != viewDetailIssue {
		t.Errorf("Klick mit target sollte die View wechseln, got %v want %v", got.view, viewDetailIssue)
	}
}

func TestToastClickOutsideHitAreaLeavesToastUntouched(t *testing.T) {
	m := model{width: 90, height: 22, view: viewBrowseBacklog}
	m, _ = m.showToast(toastInfo, "Saved", "", nil, false)
	// weit außerhalb der oben-rechten Box (unten links).
	mi, _ := toastClickAt(m, 1, m.height-1)
	got := mi.(model)
	if got.toast == nil {
		t.Error("Klick außerhalb der Hit-Area darf den Toast nicht schließen")
	}
}

// B01-Fix: toastGeometry() muss gegen m.width (die tatsächlich kompositierte
// Frame-Breite, inkl. bereits appliziertem äußerem Rahmen) rechnen, NICHT gegen
// m.termWidth() (Innenbreite, -2 für den Rahmen) — sonst sitzt der Toast 2
// Spalten zu weit links und deckt die rechte Rahmenkante nicht ab. m.view bleibt
// hier bewusst der Default (viewHome, bordered) — termWidth() wäre 98, m.width
// ist 100; der alte (falsche) Test prüfte exakt diesen jetzt-korrigierten Wert
// und hätte den Bug NICHT gefangen.
func TestToastHitGeometryTopRightCorner(t *testing.T) {
	m := model{width: 100, height: 22}
	m, _ = m.showToast(toastInfo, "x", "", nil, false)
	x, y, w, _ := m.toastGeometry()
	if y != 0 {
		t.Errorf("Toast sollte oben sitzen (y=0), got %d", y)
	}
	if x+w != m.width {
		t.Errorf("Toast sollte an der ECHTEN Frame-Kante (m.width) anliegen: x=%d w=%d m.width=%d", x, w, m.width)
	}
	if w < 32 || w > 40 {
		t.Errorf("Toast-Breite %d außerhalb der Zielspanne 32-40", w)
	}
}

// TestToastFlushAgainstCompositedFrameRightEdge ist die vom Review geforderte
// Regression (B01): sie rendert eine GEBORDERTE View (viewDetailSprint, äußerer
// RoundedBorder bereits appliziert, s. outerBorder()/view.go) MIT aktivem Toast
// über die volle View()-Pipeline und prüft für jede vom Toast betroffene Zeile,
// dass deren rechte w Spalten EXAKT dem Toast-Box-Inhalt entsprechen — kein
// Rest-Zeichen der darunterliegenden Basis-View (z.B. ein durchscheinendes
// Rahmen-Eck oder ein Buchstabenfragment) bleibt sichtbar. Eine Regression auf
// m.termWidth() (2 Spalten zu schmal) hätte hier einen Mismatch in der letzten
// Spalte jeder Zeile erzeugt — anders als eine reine Breiten-Prüfung (die auch
// bei falscher x-Position unverändert bei m.width bleibt, weil spliceLine() die
// Zeilenlänge insgesamt erhält).
func TestToastFlushAgainstCompositedFrameRightEdge(t *testing.T) {
	m := goldenModel(viewDetailSprint, 1) // bordered View (viewBordered() == true)
	m, _ = m.showToast(toastInfo, "Sprint saved", "DD2#9", nil, false)

	_, _, w, h := m.toastGeometry()
	toastLines := strings.Split(m.toastBox(), "\n")
	viewLines := strings.Split(m.View(), "\n")

	for i := 0; i < h; i++ {
		if i >= len(viewLines) {
			t.Fatalf("View() hat weniger Zeilen (%d) als der Toast hoch ist (%d)", len(viewLines), h)
		}
		wantRow := ansi.Strip(toastLines[i])
		gotTail := ansi.Strip(ansi.TruncateLeft(viewLines[i], m.width-w, ""))
		if gotTail != wantRow {
			t.Errorf("Zeile %d: rechte %d Spalten = %q, want exakt die Toast-Box-Zeile %q (Rahmen/Chrome-Rest sichtbar → B01-Regression)",
				i, w, gotTail, wantRow)
		}
	}
}

// --- AC6: Golden-Snapshot für alle 3 toastKind-Farbvarianten (TrueColor-Guard) ---

func TestToastKindColorsRenderDistinctly(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := model{width: 90, height: 22}
	renders := map[toastKind]string{}
	for _, k := range []toastKind{toastInfo, toastWarn, toastError} {
		m2, _ := m.showToast(k, "Title", "context line", nil, false)
		renders[k] = m2.toastBox()
	}
	if !strings.Contains(renders[toastError], mustRenderColor(theme.Red, "●")) {
		t.Error("toastError sollte den roten Dot rendern")
	}
	if !strings.Contains(renders[toastWarn], mustRenderColor(theme.Yellow, "●")) {
		t.Error("toastWarn sollte den gelben Dot rendern")
	}
	if !strings.Contains(renders[toastInfo], mustRenderColor(theme.Blue, "●")) {
		t.Error("toastInfo sollte den blauen Dot rendern")
	}
	// Alle 3 Varianten müssen sich farblich unterscheiden (kein Kind rendert gleich).
	if renders[toastInfo] == renders[toastWarn] || renders[toastWarn] == renders[toastError] || renders[toastInfo] == renders[toastError] {
		t.Error("die 3 toastKind-Varianten müssen sich sichtbar unterscheiden")
	}
	// Breite ist deterministisch (feste Zielbreite, DD2-272).
	for k, r := range renders {
		lines := strings.Split(r, "\n")
		w := lipgloss.Width(lines[0])
		if w != toastBoxWidth {
			t.Errorf("kind=%v: Box-Breite %d, want %d", k, w, toastBoxWidth)
		}
	}
}

func mustRenderColor(c lipgloss.Color, s string) string {
	return lipgloss.NewStyle().Foreground(c).Render(s)
}

// TestGoldenToastVariants pinnt die volle View()-Ausgabe (Eck-Overlay über einer
// Basis-View) für alle 3 toastKind-Varianten — Layout-Snapshot analog golden_test.go.
func TestGoldenToastVariants(t *testing.T) {
	for _, tc := range []struct {
		name string
		kind toastKind
	}{
		{"toast_info", toastInfo},
		{"toast_warn", toastWarn},
		{"toast_error", toastError},
	} {
		m := goldenModel(viewDetailSprint, 1)
		m, _ = m.showToast(tc.kind, "Sprint saved", "DD2#9", nil, false)
		assertGolden(t, tc.name, m.View())
	}
}

// ansiSanity stellt sicher, dass truncate/ansi-Helfer benutzt werden (keine
// String-Slicing-Regression, DD2-272 Vorgabe): ein überlanger Titel wird über
// ansi.Truncate gekürzt, nicht per len()/[:n].
func TestToastTitleTruncatesViaAnsi(t *testing.T) {
	m := model{width: 90, height: 22}
	long := strings.Repeat("x", 200)
	m, _ = m.showToast(toastInfo, long, "", nil, false)
	box := m.toastBox()
	if lipgloss.Width(box) > toastBoxWidth {
		t.Errorf("Toast-Box überläuft die Zielbreite: %d > %d", lipgloss.Width(strings.Split(box, "\n")[0]), toastBoxWidth)
	}
	if !strings.Contains(ansi.Strip(box), "…") {
		t.Error("überlanger Titel sollte mit … gekürzt werden (ansi.Truncate)")
	}
}
