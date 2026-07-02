package tui

// form_edit_document.go — Dokument-Dateiname umbenennen (DD2-252). r in der
// Docs-View (view_docs.go) öffnet ein Single-Field-huh-Form (formKind
// "docRename"), vorbelegt mit dem aktuellen file_path; enter/StateCompleted
// schreibt über die bereits bestehende UpdateDocument(file_path)-Route
// (internal/api/document.go, seit DD2-167). Muster gespiegelt von
// buildProjectSettingsForm (form_edit_project.go).

import (
	"devd-cli/internal/api"
	"devd-cli/internal/api/generated"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
)

// buildDocRenameForm baut die Rename-Form, vorbelegt mit dem aktuellen file_path.
func buildDocRenameForm(cur string) *huh.Form {
	v := cur
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("file_path").Title("file_path").
			Description("New path/filename for this document").Value(&v),
	))
}

// docRenamedMsg trägt das Rename-Ergebnis (Erfolg/Fehler).
type docRenamedMsg struct {
	docID int
	err   string
}

// doRenameDocument schreibt den neuen file_path via UpdateDocument (PATCH-Semantik
// — nur file_path gesetzt, Title/Body/Status bleiben unangetastet).
func doRenameDocument(c *api.Client, ownerType string, ownerID, docID int, newPath string) tea.Cmd {
	return func() tea.Msg {
		milestoneID, sprintKey := docOwnerArgs(ownerType, ownerID)
		args := generated.DocumentUpdateArgs{MilestoneId: milestoneID, SprintKey: sprintKey, DocId: docID, FilePath: &newPath}
		if _, err := c.DocumentUpdate(args); err != nil {
			return docRenamedMsg{docID: docID, err: cleanAPIErr(err)}
		}
		return docRenamedMsg{docID: docID}
	}
}

// openDocRename öffnet die Rename-Form für das selektierte Dokument. Der Owner
// wird beim Öffnen fixiert (auch im All-Modus via docOwnerOf), analog openDocAssign.
func (m model) openDocRename() (tea.Model, tea.Cmd) {
	cur := m.selDoc()
	if cur == nil {
		return m, nil
	}
	ownerType, ownerID := m.docOwnerType, m.docOwnerID
	if m.docAllMode {
		ownerType, ownerID = docOwnerOf(cur)
	}
	m.docRenameID = cur.ID
	m.docRenameOwnerType = ownerType
	m.docRenameOwnerID = ownerID
	m.docRenameCur = deref(cur.FilePath)
	return m.openForm("docRename")
}
