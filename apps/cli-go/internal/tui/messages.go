package tui

import (
	"strconv"
	"strings"
	"time"

	"devd-cli/internal/api"
	"devd-cli/internal/clip"
	tea "github.com/charmbracelet/bubbletea"
)

// clearStatusMsg löscht den transienten Status (DD2-35 Auto-Clear-Toast), aber nur
// wenn seq noch der aktuellen Status-Generation entspricht (sonst hat eine neuere
// Meldung den Status bereits ersetzt und der alte Tick darf nichts überschreiben).
type clearStatusMsg struct{ seq int }

// statusTimeout feuert nach 2s eine clearStatusMsg für die übergebene Generation.
func statusTimeout(seq int) tea.Cmd {
	return tea.Tick(2*time.Second, func(time.Time) tea.Msg {
		return clearStatusMsg{seq}
	})
}

// tea.Msg-Typen: async geladene Daten oder Aktions-Ergebnisse.
type errMsg struct{ err error }      // fatal (Lade-Fehler) → Fehlerschirm
type noticeMsg struct{ text string } // transient (Aktions-Fehler/Hinweis) → Sapphire-Zeile
type projectsMsg struct{ items []api.Project }
type milestonesMsg struct{ items []api.Milestone }
type sprintMsg struct{ sprint *api.Sprint }
type backlogMsg struct{ items []api.Issue }
type allIssuesMsg struct{ items []api.Issue }        // DD2-62: projektweite Issues für den Tree-Filter
type reviewSprintsMsg struct{ items []api.Sprint }   // T17: offene Review-Sprints
type memoriesMsg struct{ items []api.ProjectMemory } // T18: Memory-Liste
type memDetailMsg struct{ mem *api.ProjectMemory }   // T18: Memory-Detail (content)
type statusMsg struct{ text string }
type userStoriesMsg struct {
	issueID int
	items   []api.UserStory
}

func loadProjects(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		ps, err := c.ListProjects()
		if err != nil {
			return errMsg{err}
		}
		return projectsMsg{ps}
	}
}

func loadMilestones(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// loadAllIssues holt ALLE Issues des Projekts (DD2-62 Tree-Filter, projektweit) —
// /api/backlog ohne Filter liefert sämtliche Issues inkl. sprint-zugewiesener.
func loadAllIssues(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		items, err := c.ListIssues(api.IssueListOpts{Fields: "full"}) // DD2-147: po_notes/goal nur mit fields=full (compact lässt sie weg)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return allIssuesMsg{items}
	}
}

func loadSprint(c *api.Client, id int) tea.Cmd {
	return func() tea.Msg {
		s, err := c.GetSprint(id)
		if err != nil {
			return errMsg{err}
		}
		return sprintMsg{s}
	}
}

// doVerdict reicht ein Review-Verdikt ein und lädt den Sprint neu (optimistic refresh).
// Aktions-Fehler werden als noticeMsg (inline, Sapphire) gemeldet, nicht fatal.
func doVerdict(c *api.Client, issueID int, verdict, comment string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SubmitReview(issueID, verdict, comment, ""); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// doSprintTo wechselt den Sprint-Status. completed läuft über den dedizierten
// /complete-Endpoint (prüft passed-Reviews), sonst PATCH /status.
func doSprintTo(c *api.Client, sprintID int, to string) tea.Cmd {
	return func() tea.Msg {
		var err error
		if to == "completed" {
			_, err = c.SprintComplete(sprintID)
		} else {
			_, err = c.SprintTo(sprintID, to)
		}
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// reviewSubmittedMsg signalisiert einen markierten Review-Durchgang (DD2-44).
type reviewSubmittedMsg struct{ sprint *api.Sprint }

// doReviewSubmit markiert den Sprint-Review-Durchgang als abgeschlossen
// (POST /review-submit setzt review_submitted_at, idempotent) — DD2-44 P-Taste.
// Signalisiert dem PO-Workflow „Review-Pass fertig", entsperrt KEINEN Auto-Close.
// Lädt den Sprint neu und meldet Erfolg.
func doReviewSubmit(c *api.Client, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SprintReviewSubmit(sprintID); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		s, err := c.GetSprint(sprintID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return reviewSubmittedMsg{s}
	}
}

// completeDoneMsg trägt das Ergebnis von doSprintComplete: frischer Sprint +
// Handover-Markdown (rev-results), das in die Zwischenablage geyankt wurde (DD2-45).
type completeDoneMsg struct {
	sprint *api.Sprint
	yanked bool
}

// doSprintComplete schließt den Sprint ab (review→completed, PO-gated) UND stellt
// danach automatisch den Ergebnis-Handover her (DD2-45): rev-results laden und in
// die Zwischenablage yanken, damit der PO den Sprint-Review sauber übergeben kann
// — ohne manuellen Wechsel zur rev-results-Seite.
func doSprintComplete(c *api.Client, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SprintComplete(sprintID); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		s, err := c.GetSprint(sprintID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		yanked := false
		if raw, err := c.SprintRevResults(sprintID); err == nil && len(raw) > 0 {
			if clip.Copy(string(raw)) == nil {
				yanked = true
			}
		}
		return completeDoneMsg{sprint: s, yanked: yanked}
	}
}

// doMilestoneStatus mutiert den Meilenstein-Status (T01) und lädt die Columns neu.
func doMilestoneStatus(c *api.Client, id int, status string) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetMilestoneStatus(id, status); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// doMilestoneCascadeComplete schließt einen Meilenstein kaskadierend ab (DD2-28):
// offene Sprints → completed, ihre offenen Issues → done. Lädt danach die Columns neu.
func doMilestoneCascadeComplete(c *api.Client, id int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.CompleteMilestoneCascade(id); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// doSetSprintMilestone weist einen Sprint einem Meilenstein zu (nil → lösen, T03)
// und lädt die Columns neu.
func doSetSprintMilestone(c *api.Client, sprintID int, milestoneID *int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetSprintMilestone(sprintID, milestoneID); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// doAssignSprintsToMilestone hängt mehrere Sprints an einen Meilenstein (Flow B, T03).
func doAssignSprintsToMilestone(c *api.Client, sprintIDs []int, milestoneID int) tea.Cmd {
	return func() tea.Msg {
		for _, sid := range sprintIDs {
			mid := milestoneID
			if _, err := c.SetSprintMilestone(sid, &mid); err != nil {
				return noticeMsg{cleanAPIErr(err)}
			}
		}
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		return milestonesMsg{ms}
	}
}

// deletePreviewMsg trägt die Cascade-Counts für den Confirm-Dialog (T02b).
type deletePreviewMsg struct {
	kind    string // milestone | sprint
	id      int
	name    string
	sprints int
	issues  int
	docs    int
}

// deleteDoneMsg signalisiert einen erfolgreichen Delete (T02b / DD2-65). id trägt
// die gelöschte Entität (für die in-place-Cache-Entfernung beim Issue-Delete).
type deleteDoneMsg struct {
	kind string
	id   int
	name string
}

// loadDeletePreview holt die Cascade-Counts (T02b).
func loadDeletePreview(c *api.Client, kind string, id int) tea.Cmd {
	return func() tea.Msg {
		var p *api.DeletePreview
		var err error
		if kind == "milestone" {
			p, err = c.MilestoneDeletePreview(id)
		} else {
			p, err = c.SprintDeletePreview(id)
		}
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		name := p.MilestoneName
		if kind == "sprint" {
			name = p.SprintName
		}
		return deletePreviewMsg{kind, id, name, p.Sprints, p.Issues, p.Documents}
	}
}

// doCascadeDelete führt den Cascade-Delete aus und lädt die Columns neu (T02b).
func doCascadeDelete(c *api.Client, kind string, id int, name string) tea.Cmd {
	return func() tea.Msg {
		var err error
		if kind == "milestone" {
			err = c.DeleteMilestoneCascade(id)
		} else {
			err = c.DeleteSprintCascade(id)
		}
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return deleteDoneMsg{kind, id, name}
	}
}

// doDeleteIssue löscht ein einzelnes Issue (DD2-65, kein Cascade).
func doDeleteIssue(c *api.Client, id int, name string) tea.Cmd {
	return func() tea.Msg {
		if err := c.DeleteIssue(id); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return deleteDoneMsg{"issue", id, name}
	}
}

// unassignedSprintsMsg trägt die Sprints ohne Meilenstein (Flow B, T03).
type unassignedSprintsMsg struct{ items []api.Sprint }

// loadUnassignedSprints holt alle Sprints und filtert die ohne Meilenstein.
func loadUnassignedSprints(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		all, err := c.ListSprints("")
		if err != nil {
			return errMsg{err}
		}
		var out []api.Sprint
		for _, s := range all {
			if s.MilestoneID == nil {
				out = append(out, s)
			}
		}
		return unassignedSprintsMsg{out}
	}
}

// doRework fährt ein Issue über die Lifecycle-Kette nach to_review (z.B.
// passed→planned→in_progress→to_review). Beim Erreichen von to_review öffnet das
// Backend (maybeAutoOpenReworkRound) bei letztem not_passed-Verdikt eine frische
// pending-Runde UND resettet den Sprint-Review-Marker → entsperrt a:pass.
func doRework(c *api.Client, issueID int, path []string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		for _, st := range path {
			if _, err := c.SetIssueStatus(issueID, st); err != nil {
				return noticeMsg{"Rework bei →" + st + ": " + cleanAPIErr(err)}
			}
		}
		s, err := c.GetSprint(sprintID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return reworkDoneMsg{s}
	}
}

// reworkDoneMsg signalisiert erfolgreiches Rework (Sprint neu + Hinweis).
type reworkDoneMsg struct{ sprint *api.Sprint }

// doReopen öffnet eine entschiedene Review-Runde erneut und lädt neu.
func doReopen(c *api.Client, issueID, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.ReopenReview(issueID); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// doStatus mutiert den Lifecycle-Status eines Issues (auch to_review-Override).
func doStatus(c *api.Client, issueID int, status string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetIssueStatus(issueID, status); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// doSetResult schreibt das Ergebnisfeld (I02) und lädt den Sprint neu, damit der
// Ergebnis-Dot im Cockpit sofort grün wird.
func doSetResult(c *api.Client, issueID int, result string, sprintID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.UpdateIssue(issueID, map[string]any{"result": result}); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return refreshSprint(c, sprintID)
	}
}

// issueUpdatedMsg trägt die Antwort eines Feld-Edits (DD2-77). issue gesetzt =
// Erfolg (Cache-Merge); err gesetzt = Aktions-Fehler (→ errNote rot, D05).
type issueUpdatedMsg struct {
	issue *api.Issue
	err   string
}

// doUpdateIssueField schreibt EIN editiertes Feld via UpdateIssue (D04/D05). Bei
// Erfolg trägt die Response (rohe Backlog-Zeile) die neuen Kern-Spalten zurück;
// der Update-Handler merged sie in-place (kein Refetch). priority wird als Zahl
// gesendet (Select liefert Zahl-String).
func doUpdateIssueField(c *api.Client, id int, field, value string) tea.Cmd {
	return func() tea.Msg {
		fields := map[string]any{}
		if field == "priority" {
			if p, err := strconv.Atoi(value); err == nil {
				fields[field] = p
			} else {
				fields[field] = value
			}
		} else {
			fields[field] = value
		}
		it, err := c.UpdateIssue(id, fields)
		if err != nil {
			return issueUpdatedMsg{err: cleanAPIErr(err)}
		}
		return issueUpdatedMsg{issue: it}
	}
}

// milestoneUpdatedMsg / sprintUpdatedMsg tragen die Antwort eines Feld-Edits auf
// Meilenstein/Sprint (DD2-79). Gefülltes Objekt = Erfolg (Cache-Merge); err =
// Aktions-Fehler (→ errNote rot, D05). Spiegel von issueUpdatedMsg.
type milestoneUpdatedMsg struct {
	ms  *api.Milestone
	err string
}
type sprintUpdatedMsg struct {
	sp  *api.Sprint
	err string
}

// doUpdateMilestoneField schreibt EIN editiertes Meilenstein-Feld via UpdateMilestone
// (D04/D05). Die Response trägt die neuen Kern-Spalten zurück; der Update-Handler
// merged sie in-place (kein Refetch).
func doUpdateMilestoneField(c *api.Client, id int, field, value string) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.UpdateMilestone(id, map[string]any{field: value})
		if err != nil {
			return milestoneUpdatedMsg{err: cleanAPIErr(err)}
		}
		return milestoneUpdatedMsg{ms: ms}
	}
}

// doUpdateSprintField schreibt EIN editiertes Sprint-Feld via UpdateSprint (D04/D05).
func doUpdateSprintField(c *api.Client, id int, field, value string) tea.Cmd {
	return func() tea.Msg {
		sp, err := c.UpdateSprint(id, map[string]any{field: value})
		if err != nil {
			return sprintUpdatedMsg{err: cleanAPIErr(err)}
		}
		return sprintUpdatedMsg{sp: sp}
	}
}

// loadUserStories holt die User-Stories eines Issues (für das Abnahme-Modal).
func loadUserStories(c *api.Client, issueID int) tea.Cmd {
	return func() tea.Msg {
		us, err := c.ListUserStories(issueID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return userStoriesMsg{issueID, us}
	}
}

// doUSVerdict setzt ein User-Story-Verdikt und lädt die Liste neu.
func doUSVerdict(c *api.Client, usID int, verdict string, issueID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetUserStoryVerdict(usID, verdict); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		us, err := c.ListUserStories(issueID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return userStoriesMsg{issueID, us}
	}
}

// usMutatedMsg signalisiert eine erfolgreiche User-Story-Anlage/-Änderung aus dem
// Detail-Fokus (DD2-144): die frische Story-Liste wird in alle Issue-Caches
// gespiegelt + ein Toast gezeigt.
type usMutatedMsg struct {
	issueID int
	items   []api.UserStory
	status  string
}

// doAddUserStory legt eine User-Story am Issue an und lädt die Liste neu (DD2-144).
func doAddUserStory(c *api.Client, issueID int, title, qa string) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.AddUserStory(issueID, title, qa); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		us, err := c.ListUserStories(issueID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return usMutatedMsg{issueID, us, "User story added"}
	}
}

// doEditUserStory ändert Titel/QA einer User-Story und lädt die Liste neu (DD2-144).
func doEditUserStory(c *api.Client, usID, issueID int, title, qa string) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.EditUserStory(usID, title, qa); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		us, err := c.ListUserStories(issueID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return usMutatedMsg{issueID, us, "User story updated"}
	}
}

// createdMsg signalisiert eine erfolgreiche Anlage (Command-Center, T16).
// kind ∈ {issue, milestone, sprint} steuert den Folge-Reload.
type createdMsg struct {
	kind  string
	label string
}

// doCreateIssue legt ein Issue an (Command-Center). stories (optional, eine pro
// Zeile) werden nach der Anlage sequenziell als User-Stories angehängt (DD2-66) —
// so kann der Nutzer Akzeptanzkriterien direkt beim Erstellen definieren, ohne in
// die Detail-Ansicht zu wechseln. Fehler → Sapphire-Hinweis.
func doCreateIssue(c *api.Client, body api.IssueCreateBody, stories []string) tea.Cmd {
	return func() tea.Msg {
		it, err := c.CreateIssue(body)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		for _, s := range stories {
			if _, err := c.AddUserStory(it.ID, s, ""); err != nil {
				return noticeMsg{it.Key + " created, user story failed: " + cleanAPIErr(err)}
			}
		}
		return createdMsg{"issue", it.Key + " " + it.Title}
	}
}

// doCreateMilestone legt einen Meilenstein an (Command-Center). tagIDs (optional):
// Meilenstein-Create kennt kein tag_ids → nach dem Anlegen per SetMilestoneTags
// zuweisen (DD2-33, kein Create-dann-manuell-Zuweisen).
func doCreateMilestone(c *api.Client, body api.MilestoneCreateBody, tagIDs []int) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.CreateMilestone(body)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		if len(tagIDs) > 0 {
			if _, err := c.SetMilestoneTags(ms.ID, tagIDs); err != nil {
				return noticeMsg{"Milestone created, tags failed: " + cleanAPIErr(err)}
			}
		}
		return createdMsg{"milestone", ms.Name}
	}
}

// doCreateSprint legt einen Sprint an (Command-Center). tagIDs analog Meilenstein:
// Sprint-Create kennt kein tag_ids → nach dem Anlegen per SetSprintTags (DD2-33).
func doCreateSprint(c *api.Client, body api.SprintCreateBody, tagIDs []int) tea.Cmd {
	return func() tea.Msg {
		s, err := c.CreateSprint(body)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		if len(tagIDs) > 0 {
			if _, err := c.SetSprintTags(s.ID, tagIDs); err != nil {
				return noticeMsg{"Sprint created, tags failed: " + cleanAPIErr(err)}
			}
		}
		return createdMsg{"sprint", s.Name}
	}
}

// doCreateMemory legt ein Project-Memory an (Command-Center, T18).
func doCreateMemory(c *api.Client, body api.ProjectMemoryCreateBody) tea.Cmd {
	return func() tea.Msg {
		mem, err := c.CreateProjectMemory(body)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return createdMsg{"memory", mem.Summary}
	}
}

// loadMemories liefert die Compact-Memory-Liste (T18), optional kategorie-gefiltert.
func loadMemories(c *api.Client, category string) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.ListProjectMemories(category)
		if err != nil {
			return errMsg{err}
		}
		return memoriesMsg{ms}
	}
}

// searchMemoriesCmd durchsucht die Memories (Volltext + Kategorie, T18).
func searchMemoriesCmd(c *api.Client, q, category string) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.SearchProjectMemories(q, category, 50)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return memoriesMsg{ms}
	}
}

// loadMemDetail holt ein Memory-Detail inkl. content (T18).
func loadMemDetail(c *api.Client, id int) tea.Cmd {
	return func() tea.Msg {
		mem, err := c.GetProjectMemory(id)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return memDetailMsg{mem}
	}
}

// sstdMsg trägt die 6 Slots + 2 Projektionen (DD2-166). notice != "" → Toast nach
// einem Save (sonst leer beim initialen Laden/Reload).
type sstdMsg struct {
	slots  []api.SstdSlot
	proj   *api.SstdProjections
	notice string
}

// loadSstd lädt Slots + Projektionen in einem Rutsch (DD2-166).
func loadSstd(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		slots, err := c.GetSstdSlots()
		if err != nil {
			return errMsg{err}
		}
		proj, err := c.GetSstdProjections()
		if err != nil {
			return errMsg{err}
		}
		return sstdMsg{slots: slots, proj: proj}
	}
}

// saveSstdSlotCmd schreibt einen Slot neu und liefert den frischen Stand zurück
// (Save + Reload in einem Cmd, damit das Detail den neuen Inhalt sofort zeigt).
func saveSstdSlotCmd(c *api.Client, key, content string) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.SetSstdSlot(key, content); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		slots, err := c.GetSstdSlots()
		if err != nil {
			return errMsg{err}
		}
		proj, err := c.GetSstdProjections()
		if err != nil {
			return errMsg{err}
		}
		return sstdMsg{slots: slots, proj: proj, notice: "Slot '" + key + "' saved"}
	}
}

// userNotesMsg trägt die geladene Notiz-Liste (DD2-168). notice != "" → Toast.
type userNotesMsg struct {
	items  []api.UserNote
	notice string
}

// loadUserNotes lädt die Notizen (optional FTS-gefiltert) (DD2-168).
func loadUserNotes(c *api.Client, search string) tea.Cmd {
	return func() tea.Msg {
		notes, err := c.ListUserNotes(search)
		if err != nil {
			return errMsg{err}
		}
		return userNotesMsg{items: notes}
	}
}

// saveUserNoteCmd legt eine Notiz an (editID==0) oder aktualisiert die details
// einer bestehenden (editID>0), dann Reload (DD2-168).
func saveUserNoteCmd(c *api.Client, editID int, title, details, search string) tea.Cmd {
	return func() tea.Msg {
		var notice string
		if editID > 0 {
			d := details
			if _, err := c.UpdateUserNote(editID, api.UserNoteBody{Details: &d}); err != nil {
				return noticeMsg{cleanAPIErr(err)}
			}
			notice = "Note updated"
		} else {
			d := details
			if _, err := c.CreateUserNote(api.UserNoteBody{Title: title, Details: &d}); err != nil {
				return noticeMsg{cleanAPIErr(err)}
			}
			notice = "Note created"
		}
		notes, err := c.ListUserNotes(search)
		if err != nil {
			return errMsg{err}
		}
		return userNotesMsg{items: notes, notice: notice}
	}
}

// doDeleteUserNote löscht eine Notiz und lädt die Liste neu (DD2-168).
func doDeleteUserNote(c *api.Client, id int, name, search string) tea.Cmd {
	return func() tea.Msg {
		if err := c.DeleteUserNote(id); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		notes, err := c.ListUserNotes(search)
		if err != nil {
			return errMsg{err}
		}
		return userNotesMsg{items: notes, notice: "Deleted " + name}
	}
}

// todosMsg trägt die geladene ToDo-Liste (DD2-171). notice != "" → Toast.
type todosMsg struct {
	items  []api.Todo
	notice string
}

// loadTodos lädt die ToDos (optional status-gefiltert) (DD2-171).
func loadTodos(c *api.Client, status string) tea.Cmd {
	return func() tea.Msg {
		todos, err := c.ListTodos(status)
		if err != nil {
			return errMsg{err}
		}
		return todosMsg{items: todos}
	}
}

// toggleTodoCmd schaltet open<->done und lädt die Liste neu (DD2-171).
func toggleTodoCmd(c *api.Client, id int, done bool, status string) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.ToggleTodo(id, done); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		todos, err := c.ListTodos(status)
		if err != nil {
			return errMsg{err}
		}
		return todosMsg{items: todos}
	}
}

// saveTodoCmd legt ein ToDo an (editID==0, label aus erster Buffer-Zeile) oder
// aktualisiert die details einer bestehenden (editID>0), dann Reload (DD2-171).
func saveTodoCmd(c *api.Client, editID int, label, details, status string) tea.Cmd {
	return func() tea.Msg {
		var notice string
		if editID > 0 {
			d := details
			if _, err := c.UpdateTodo(editID, api.TodoBody{Details: &d}); err != nil {
				return noticeMsg{cleanAPIErr(err)}
			}
			notice = "ToDo updated"
		} else {
			d := details
			if _, err := c.CreateTodo(api.TodoBody{Label: label, Details: &d}); err != nil {
				return noticeMsg{cleanAPIErr(err)}
			}
			notice = "ToDo created"
		}
		todos, err := c.ListTodos(status)
		if err != nil {
			return errMsg{err}
		}
		return todosMsg{items: todos, notice: notice}
	}
}

// doDeleteTodo löscht ein ToDo und lädt die Liste neu (DD2-171).
func doDeleteTodo(c *api.Client, id int, name, status string) tea.Cmd {
	return func() tea.Msg {
		if err := c.DeleteTodo(id); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		todos, err := c.ListTodos(status)
		if err != nil {
			return errMsg{err}
		}
		return todosMsg{items: todos, notice: "Deleted " + name}
	}
}

// docsMsg trägt die geladene Dokument-Liste eines Owners (DD2-167). notice != "" → Toast.
type docsMsg struct {
	items  []api.Document
	notice string
}

// loadDocs lädt die Dokumente eines Owners (Meilenstein|Sprint) (DD2-167).
func loadDocs(c *api.Client, ownerType string, ownerID int) tea.Cmd {
	return func() tea.Msg {
		docs, err := c.ListDocuments(ownerType, ownerID)
		if err != nil {
			return errMsg{err}
		}
		return docsMsg{items: docs}
	}
}

// loadAllDocs lädt ALLE Dokumente des Projekts (entitätsübergreifend) für den
// globalen Docs-Browser (DD2-163 Rework).
func loadAllDocs(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		docs, err := c.ListAllDocuments()
		if err != nil {
			return errMsg{err}
		}
		return docsMsg{items: docs}
	}
}

// ownerDocsMsg trägt die Dokument-Liste eines Owners für die Inline-Anzeige im
// Tree-Detail (DD2-163 Rework). key = depCacheKey("m"/"s", id).
type ownerDocsMsg struct {
	key  string
	docs []api.Document
}

// loadOwnerDocs holt die Dokumente eines Meilenstein-/Sprint-Knotens read-only und
// füllt den ownerDocs-Cache (lazy beim Fokussieren, analog loadMilestoneDeps).
func loadOwnerDocs(c *api.Client, ownerType string, ownerID int) tea.Cmd {
	return func() tea.Msg {
		docs, err := c.ListDocuments(ownerType, ownerID)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		kind := "m"
		if ownerType == "sprint" {
			kind = "s"
		}
		return ownerDocsMsg{key: depCacheKey(kind, ownerID), docs: docs}
	}
}

// saveDocCmd legt ein Dokument an (editID==0, title aus erster Buffer-Zeile) oder
// aktualisiert den body einer bestehenden (editID>0), dann Reload (DD2-167).
// saveDocCmd legt an/aktualisiert; reloadAll=true lädt danach die projektweite Liste
// neu (All-Docs-Browser), sonst owner-gescopt (DD2-163 Rework).
func saveDocCmd(c *api.Client, ownerType string, ownerID, editID int, title, body string, reloadAll bool) tea.Cmd {
	return func() tea.Msg {
		var notice string
		if editID > 0 {
			b := body
			if _, err := c.UpdateDocument(ownerType, ownerID, editID, api.DocumentBody{Body: &b}); err != nil {
				return noticeMsg{cleanAPIErr(err)}
			}
			notice = "Document updated"
		} else {
			b := body
			if _, err := c.CreateDocument(ownerType, ownerID, api.DocumentBody{Title: title, Body: &b}); err != nil {
				return noticeMsg{cleanAPIErr(err)}
			}
			notice = "Document created"
		}
		docs, err := reloadDocs(c, ownerType, ownerID, reloadAll)
		if err != nil {
			return errMsg{err}
		}
		return docsMsg{items: docs, notice: notice}
	}
}

// doDeleteDocument löscht ein Dokument und lädt die Liste neu (DD2-167); reloadAll
// steuert owner-gescopt vs. projektweit (DD2-163 Rework).
func doDeleteDocument(c *api.Client, ownerType string, ownerID, id int, name string, reloadAll bool) tea.Cmd {
	return func() tea.Msg {
		if err := c.DeleteDocument(ownerType, ownerID, id); err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		docs, err := reloadDocs(c, ownerType, ownerID, reloadAll)
		if err != nil {
			return errMsg{err}
		}
		return docsMsg{items: docs, notice: "Deleted " + name}
	}
}

// reloadDocs liefert die Doc-Liste passend zum Browser-Modus (projektweit vs owner).
func reloadDocs(c *api.Client, ownerType string, ownerID int, all bool) ([]api.Document, error) {
	if all {
		return c.ListAllDocuments()
	}
	return c.ListDocuments(ownerType, ownerID)
}

// depsMsg trägt die geladenen Abhängigkeiten (DD2-89). key = "m:<id>"/"s:<id>"
// (cache-Schlüssel), damit Milestone- und Sprint-Deps denselben Cache teilen.
type depsMsg struct {
	key  string
	deps *api.Dependencies
}

// loadMilestoneDeps / loadSprintDeps holen Vorgänger/Nachfolger read-only und
// füllen den depsCache (Lazy, beim Fokussieren des Knotens — analog loadMemDetail).
func loadMilestoneDeps(c *api.Client, id int) tea.Cmd {
	return func() tea.Msg {
		d, err := c.GetMilestoneDependencies(id)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return depsMsg{key: depCacheKey("m", id), deps: d}
	}
}

func loadSprintDeps(c *api.Client, id int) tea.Cmd {
	return func() tea.Msg {
		d, err := c.GetSprintDependencies(id)
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return depsMsg{key: depCacheKey("s", id), deps: d}
	}
}

// depCacheKey baut den depsCache-Schlüssel (Entitätstyp + ID).
func depCacheKey(kind string, id int) string {
	return kind + ":" + strconv.Itoa(id)
}

// refreshedMsg trägt das Ergebnis des manuellen Daten-Reloads (DD2-72): frische
// Meilensteine + die neu geholten Sprints (key = sprint-ID). Eigener Pfad statt
// loadMilestones/loadSprint zu batchen, weil der sprintMsg-Handler m.status leert
// (DD2-57) und damit den Refresh-Toast sofort wegräumen würde.
type refreshedMsg struct {
	milestones []api.Milestone
	sprints    map[int]*api.Sprint
}

// doRefresh lädt Meilensteine neu und holt für jede übergebene Sprint-ID die Items
// frisch — alles in EINEM Cmd, damit der bestätigende Toast (im refreshedMsg-Handler
// gesetzt) nicht von einem nachlaufenden sprintMsg überschrieben wird (DD2-72 R2).
func doRefresh(c *api.Client, sprintIDs []int) tea.Cmd {
	return func() tea.Msg {
		ms, err := c.ListMilestones("all")
		if err != nil {
			return errMsg{err}
		}
		sprints := map[int]*api.Sprint{}
		for _, sid := range sprintIDs {
			if s, err := c.GetSprint(sid); err == nil {
				sprints[sid] = s
			}
		}
		return refreshedMsg{ms, sprints}
	}
}

// refreshSprint lädt den Sprint neu (gemeinsam von Aktions-Cmds genutzt).
func refreshSprint(c *api.Client, sprintID int) tea.Msg {
	s, err := c.GetSprint(sprintID)
	if err != nil {
		return noticeMsg{cleanAPIErr(err)}
	}
	return sprintMsg{s}
}

// cleanAPIErr kürzt die rohe API-Fehlermeldung auf das error-Feld.
func cleanAPIErr(err error) string {
	msg := err.Error()
	if i := strings.Index(msg, `"error":"`); i >= 0 {
		rest := msg[i+len(`"error":"`):]
		if j := strings.Index(rest, `"`); j >= 0 {
			return rest[:j]
		}
	}
	return msg
}

// loadReviewSprints liefert die offenen Review-Sprints (status=to_review). Mehrere
// Sprints können gleichzeitig im Review-Zyklus stehen (T17: R entkoppelt).
func loadReviewSprints(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		sp, err := c.ListSprints("to_review")
		if err != nil {
			return errMsg{err}
		}
		return reviewSprintsMsg{sp}
	}
}

// loadBacklog liefert das echte Backlog: status=new ODER (status=planned UND
// kein Sprint). Zwei Queries, gemerged + nach id dedupliziert.
func loadBacklog(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		neu, err := c.ListIssues(api.IssueListOpts{Status: "new", Fields: "full"}) // DD2-147: po_notes/goal im Detail
		if err != nil {
			return errMsg{err}
		}
		planned, err := c.ListIssues(api.IssueListOpts{Status: "planned", SprintID: "null", Fields: "full"}) // DD2-147: po_notes/goal im Detail
		if err != nil {
			return errMsg{err}
		}
		seen := map[int]bool{}
		var out []api.Issue
		for _, it := range append(neu, planned...) {
			if seen[it.ID] {
				continue
			}
			seen[it.ID] = true
			out = append(out, it)
		}
		return backlogMsg{out}
	}
}
