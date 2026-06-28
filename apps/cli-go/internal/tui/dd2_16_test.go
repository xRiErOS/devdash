package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

func strptr(s string) *string { return &s }

// DD2-44: P im Cockpit markiert den Review-Durchgang (review-submit) → dispatcht.
func TestReviewSubmitDispatch(t *testing.T) {
	m := reviewModel()
	mi, cmd := m.Update(keyMsg("P"))
	m = mi.(model)
	if cmd == nil {
		t.Error("'P' (Review-Pass) sollte eine Submit-Cmd liefern")
	}
	if m.status == "" {
		t.Error("'P' sollte einen Status-Hinweis setzen")
	}
}

// DD2-7: reopen ist direkt aus to_review/passed/rejected erlaubt (spiegelt das
// Backend-Set REOPENABLE_STATUSES) — löst den passed+not_passed-Deadlock.
func TestReviewReopenable(t *testing.T) {
	for _, s := range []string{"to_review", "passed", "rejected"} {
		if !reviewReopenable(s) {
			t.Errorf("reviewReopenable(%q) = false, want true", s)
		}
	}
	for _, s := range []string{"new", "refined", "planned", "in_progress", "done", "cancelled", ""} {
		if reviewReopenable(s) {
			t.Errorf("reviewReopenable(%q) = true, want false", s)
		}
	}
}

// DD2-7: 'o' (Reopen) dispatcht jetzt direkt aus passed (vorher nur to_review).
func TestReopenDispatchFromPassed(t *testing.T) {
	m := reviewModel()
	m.curSprint.Items[0].Status = "passed" // Deadlock-Status
	_, cmd := m.Update(keyMsg("o"))
	if cmd == nil {
		t.Error("'o' sollte aus passed eine Reopen-Cmd liefern (DD2-7)")
	}
	// aus in_progress bleibt 'o' gesperrt → keine Cmd
	m2 := reviewModel()
	m2.curSprint.Items[0].Status = "in_progress"
	_, cmd2 := m2.Update(keyMsg("o"))
	if cmd2 != nil {
		t.Error("'o' darf aus in_progress nicht dispatchen")
	}
}

// DD2-70: Abschluss-Bereitschaft verlangt Verdikt UND result je nicht-storniertem Issue.
func TestSprintReviewReady(t *testing.T) {
	// leerer/nil Sprint → nicht bereit
	if sprintReviewReady(nil) {
		t.Error("nil-Sprint darf nicht abschlussbereit sein")
	}
	// passed aber ohne result → nicht bereit
	s := &api.Sprint{Items: []api.Issue{
		{Status: "to_review", ReviewStatus: strptr("passed")},
	}}
	if sprintReviewReady(s) {
		t.Error("passed ohne result darf nicht abschlussbereit sein")
	}
	// passed + result → bereit
	s.Items[0].Result = strptr("done & shipped")
	if !sprintReviewReady(s) {
		t.Error("passed + result sollte abschlussbereit sein")
	}
	// ein not_passed kippt die Bereitschaft
	s.Items = append(s.Items, api.Issue{Status: "to_review", ReviewStatus: strptr("not_passed"), Result: strptr("x")})
	if sprintReviewReady(s) {
		t.Error("not_passed darf nicht abschlussbereit sein")
	}
	// stornierte Issues werden ignoriert
	s2 := &api.Sprint{Items: []api.Issue{
		{Status: "passed", ReviewStatus: strptr("passed"), Result: strptr("ok")},
		{Status: "cancelled"},
	}}
	if !sprintReviewReady(s2) {
		t.Error("cancelled-Issue darf die Bereitschaft nicht blockieren")
	}
	// gar keine zählbaren Issues → nicht bereit
	s3 := &api.Sprint{Items: []api.Issue{{Status: "cancelled"}}}
	if sprintReviewReady(s3) {
		t.Error("ohne zählbare Issues darf nicht abschlussbereit sein")
	}
}

// DD2-67: issueFields rendert die vollen Felder untruncated (Master-Detail-Quelle).
func TestIssueFieldsRendersFull(t *testing.T) {
	long := strings.Repeat("Lorem ipsum dolor ", 12) // > jede Spaltenbreite
	it := &api.Issue{
		Goal:       strptr("Das Goal"),
		Background: strptr(long),
		PoNotes:    strptr("PO-Hinweis"),
		Result:     strptr("Ergebnis-Text"),
		UserStories: []api.UserStory{
			{Title: "US Eins", Verdict: "accepted", QA: strptr("Aktion X → Y")},
		},
	}
	out := issueFields(it)
	for _, want := range []string{"Goal", "Das Goal", "Background", "PO Notes", "PO-Hinweis", "Result", "Ergebnis-Text", "US Eins", "Aktion X → Y"} {
		if !strings.Contains(out, want) {
			t.Errorf("issueFields fehlt %q\n%s", want, out)
		}
	}
	// Background ungekürzt (kein … und voller Text enthalten)
	if !strings.Contains(out, long) {
		t.Error("Background sollte untruncated sein")
	}
	// leere Felder erzeugen keine Sektion
	if strings.Contains(issueFields(&api.Issue{}), "Goal") {
		t.Error("leeres Issue darf keine Goal-Sektion rendern")
	}
}

// DD2-67: viewReview rendert ein echtes Master-Detail — Issue-Liste links, volle
// Felder des selektierten Issues rechts, horizontal NEBENEINANDER (nicht linear
// untereinander gestapelt). Strukturanker: mind. eine Body-Zeile trägt zwei
// bordered Panes nebeneinander (≥3 vertikale Border-Glyphen). Das alte lineare
// Layout (chrome ohne Border) erfüllt das nicht.
func TestReviewMasterDetailLayout(t *testing.T) {
	m := reviewModel()
	m.width, m.height = 120, 40
	m.curSprint.Items[0].Title = "LISTENMARKER"
	m.curSprint.Items[0].Goal = strptr("ZIELMARKER")
	m.rlist.setLen(len(m.curSprint.Items))

	out := m.viewReview()

	if !strings.Contains(out, "LISTENMARKER") {
		t.Error("Master-Liste (links) sollte den Issue-Titel zeigen")
	}
	if !strings.Contains(out, "ZIELMARKER") {
		t.Error("Detail-Pane (rechts) sollte das Goal des selektierten Issues zeigen")
	}
	twoPane := false
	for _, ln := range strings.Split(out, "\n") {
		if strings.Count(ln, "│") >= 3 {
			twoPane = true
			break
		}
	}
	if !twoPane {
		t.Error("viewReview sollte horizontales Master-Detail rendern (zwei Panes nebeneinander), nicht linear gestapelt")
	}
}

// DD2-67: das Detail-Pane ist scrollbar (ctrl+d), und ein Selektionswechsel setzt
// den Detail-Scroll zurück (frisch gewähltes Issue startet oben).
func TestReviewDetailScroll(t *testing.T) {
	m := reviewModel()
	m.width, m.height = 100, 24
	m.curSprint.Items = append(m.curSprint.Items, api.Issue{Key: "SPF-2", Title: "B", Status: "to_review"})
	m.rlist.setLen(len(m.curSprint.Items))

	mi, _ := m.Update(keyMsg("ctrl+d"))
	m = mi.(model)
	if m.scroll == 0 {
		t.Error("ctrl+d sollte das Detail-Pane scrollen (m.scroll > 0)")
	}

	mi2, _ := m.Update(keyMsg("k")) // Selektion runter
	m = mi2.(model)
	if m.scroll != 0 {
		t.Error("Selektionswechsel sollte den Detail-Scroll zurücksetzen")
	}
}
