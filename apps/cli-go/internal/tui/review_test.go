package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func reviewModel() model {
	m := columnsModel()
	m.curSprint = &api.Sprint{ID: 10, Key: "SPF#1", Status: "review", Items: []api.Issue{
		{ID: 100, Key: "SPF-1", Title: "A", Status: "to_review"},
	}}
	// T17: R öffnet jetzt erst die Reviews-Liste; Cockpit wird wie nach
	// Listen-Auswahl direkt betreten (Cockpit-Logik selbst unverändert).
	m.view = viewReview
	m.reviewReturn = viewReviewsList
	m.rlist.setLen(len(m.curSprint.Items))
	return m
}

func TestReviewEnter(t *testing.T) {
	m := reviewModel()
	if m.view != viewReview {
		t.Fatalf("view=%d, want viewReview", m.view)
	}
	if m.rlist.length != 1 {
		t.Errorf("rlist.length=%d, want 1", m.rlist.length)
	}
}

func TestReviewPassDispatch(t *testing.T) {
	m := reviewModel()
	_, cmd := m.Update(keyMsg("a"))
	if cmd == nil {
		t.Error("'a' (pass) sollte eine Verdikt-Cmd liefern")
	}
}

func TestReviewRejectOpensMultilineForm(t *testing.T) {
	// DD2-119/US-50: x öffnet das mehrzeilige Reject-Kommentar-Modal (huh-Form)
	// statt der alten einzeiligen Footer-Eingabe.
	m := reviewModel()
	mi, _ := m.Update(keyMsg("x"))
	m = mi.(model)
	if m.form == nil || m.formKind != "reject" {
		t.Fatalf("'x' sollte das reject-Formular öffnen (form=%v kind=%q)", m.form != nil, m.formKind)
	}
	if m.rejectIssueID != 100 || m.rejectSprintID != 10 {
		t.Errorf("Reject-Kontext falsch: issue=%d sprint=%d, want 100/10", m.rejectIssueID, m.rejectSprintID)
	}
	if m.inputting {
		t.Error("inputting darf im neuen Form-Flow nicht mehr gesetzt werden")
	}
}

func TestRejectFormCreateCmdDispatches(t *testing.T) {
	// formCreateCmd("reject") baut bei vorhandenem Kommentar ein not_passed-Verdikt.
	m := reviewModel()
	m.formKind = "reject"
	m.rejectIssueID = 100
	m.rejectSprintID = 10
	m.form = buildRejectForm()
	_ = m.form.Init()
	// leeres Kommentarfeld → kein Dispatch
	if cmd := m.formCreateCmd(); cmd != nil {
		t.Error("leerer Reject-Kommentar darf nicht dispatchen")
	}
}

func TestReviewStandClipRendersMarkdown(t *testing.T) {
	// DD2-121: y rendert den Review-Stand als Markdown-Tabelle (Key/Verdict/Result).
	m := reviewModel()
	m.curSprint.Items = []api.Issue{
		{Key: "SPF-1", Title: "A", Status: "passed", ReviewStatus: strptr("passed"), Result: strptr("done")},
		{Key: "SPF-2", Title: "B", Status: "to_review"},
	}
	out := m.reviewStandClip()
	for _, want := range []string{"# Review SPF#1", "1 passed", "1 open", "| SPF-1 |", "| SPF-2 |", "| Key | Title |"} {
		if !strings.Contains(out, want) {
			t.Errorf("reviewStandClip fehlt %q\n%s", want, out)
		}
	}
}

func TestStatusMenuOpensAndDispatches(t *testing.T) {
	m := reviewModel()
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	if !m.statusPick {
		t.Fatal("'s' sollte Status-Menü öffnen")
	}
	if len(m.sopts) == 0 {
		t.Fatal("keine Status-Optionen")
	}
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.statusPick {
		t.Error("nach enter sollte Menü zu sein")
	}
	if cmd == nil {
		t.Error("enter sollte Status-Mutation dispatchen")
	}
}

func TestPassDispatchesRegardlessOfStatus(t *testing.T) {
	// Backend erlaubt Verdikt unabhängig vom Issue-Status (autoSetPassedOnReviewPass
	// setzt to_review/rejected→passed). TUI darf nicht clientseitig blocken.
	m := reviewModel()
	m.curSprint.Items[0].Status = "rejected"
	_, cmd := m.Update(keyMsg("a"))
	if cmd == nil {
		t.Error("Pass sollte auch bei rejected dispatchen (Backend validiert)")
	}
}

func TestSprintMenuOpensAndDispatches(t *testing.T) {
	m := reviewModel() // Sprint-Status "review" → {active, completed}
	mi, _ := m.Update(keyMsg("S"))
	m = mi.(model)
	if !m.sprintPick {
		t.Fatal("'S' sollte Sprint-Status-Menü öffnen")
	}
	if len(m.spopts) == 0 {
		t.Fatal("keine Sprint-Optionen")
	}
	for _, o := range m.spopts {
		if o == "review" {
			t.Error("review-Sprint darf nicht review als Ziel anbieten")
		}
	}
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.sprintPick {
		t.Error("nach enter sollte Sprint-Menü zu sein")
	}
	if cmd == nil {
		t.Error("enter sollte Sprint-Transition dispatchen")
	}
}

func TestEnterOpensUserStoryModal(t *testing.T) {
	m := reviewModel()
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if !m.usOpen {
		t.Fatal("enter sollte US-Abnahme-Modal öffnen")
	}
	if m.usIssueID != 100 {
		t.Errorf("usIssueID=%d, want 100", m.usIssueID)
	}
	if cmd == nil {
		t.Error("enter sollte User-Stories laden")
	}
}

func TestStatusMenuExcludesPassed(t *testing.T) {
	m := reviewModel()
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	for _, o := range m.sopts {
		if o == "passed" || o == "rejected" || o == "done" {
			t.Errorf("Status-Menü darf %q nicht enthalten (läuft über Review)", o)
		}
	}
}

func TestStatusMenuFiltersInvalidTransitions(t *testing.T) {
	// passed → to_review ist lifecycle-ungültig; Menü darf es nicht anbieten.
	m := reviewModel()
	m.curSprint.Items[0].Status = "passed"
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	if !m.statusPick {
		t.Fatal("Menü sollte öffnen (passed→planned ist gültig)")
	}
	for _, o := range m.sopts {
		if o == "to_review" {
			t.Error("passed-Menü darf to_review nicht anbieten")
		}
	}
}

func TestReworkPath(t *testing.T) {
	cases := map[string]int{"to_review": 0, "in_progress": 1, "planned": 2, "rejected": 2, "passed": 3}
	for from, want := range cases {
		if got := len(reworkPath(from)); got != want {
			t.Errorf("reworkPath(%q) len=%d, want %d", from, got, want)
		}
	}
	p := reworkPath("passed")
	if len(p) == 0 || p[len(p)-1] != "to_review" {
		t.Errorf("reworkPath(passed) muss auf to_review enden: %v", p)
	}
}

func TestReworkDispatchesForLockedPassed(t *testing.T) {
	m := reviewModel()
	m.curSprint.Items[0].Status = "passed" // letztes Verdikt not_passed → Edit-Lock-Fall
	_, cmd := m.Update(keyMsg("w"))
	if cmd == nil {
		t.Error("'w' sollte die Rework-Kette dispatchen")
	}
}

func TestReviewCompleteDoubleConfirm(t *testing.T) {
	m := reviewModel()
	mi, cmd := m.Update(keyMsg("C"))
	m = mi.(model)
	if cmd != nil {
		t.Error("erstes 'C' darf nur bestätigen, nicht dispatchen")
	}
	if !m.confirmComplete {
		t.Error("confirmComplete nicht gesetzt")
	}
	_, cmd = m.Update(keyMsg("C"))
	if cmd == nil {
		t.Error("zweites 'C' sollte den Abschluss dispatchen")
	}
}
