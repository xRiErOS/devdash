package tui

// picker_assign_doc.go — Dokument→Meilenstein/Sprint-Zuweisung (DD2-243). a in der
// Docs-View (view_docs.go) öffnet einen Single-Select-Picker über offene Meilensteine
// (new/in_progress) + deren nicht-finale Sprints; enter weist zu (PUT .../move).
// Muster gespiegelt von picker_assign_sprint.go (T03/DD2-136) — global dispatcht
// (keys.go), gerendert als Overlay (view.go).

import (
	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
)

// docAssignOpt ist eine Picker-Zeile: Ziel-Owner (Meilenstein ODER Sprint) + Label.
type docAssignOpt struct {
	ownerType string // "milestone" | "sprint"
	ownerID   int
	label     string
}

// docAssignOpts sammelt Zuweisungsziele: offene Meilensteine + deren nicht-finale
// Sprints (gespiegelt von openMilestones/assignableSprints, T03/DD2-136) — ein
// Sprint gilt nur als Ziel, solange sein Meilenstein selbst offen ist.
func docAssignOpts(milestones []api.Milestone) []docAssignOpt {
	var out []docAssignOpt
	for _, ms := range openMilestones(milestones) {
		out = append(out, docAssignOpt{"milestone", ms.ID, "[Milestone] " + ms.Name})
		for _, sp := range assignableSprints(ms.Sprints) {
			out = append(out, docAssignOpt{"sprint", sp.ID, "  [Sprint] " + sp.Key + " - " + sp.Name})
		}
	}
	return out
}

// docMovedMsg trägt das Zuweisungs-Ergebnis (Erfolg/Fehler).
type docMovedMsg struct {
	docID int
	err   string
}

// doMoveDocument weist ein Dokument von (srcType, srcID) auf (targetType, targetID) um.
func doMoveDocument(c *api.Client, srcType string, srcID, docID int, targetType string, targetID int) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.MoveDocument(srcType, srcID, docID, targetType, targetID); err != nil {
			return docMovedMsg{docID: docID, err: cleanAPIErr(err)}
		}
		return docMovedMsg{docID: docID}
	}
}

// openDocAssign öffnet den Picker für das selektierte Dokument. Der Quell-Owner wird
// beim Öffnen fixiert (auch im All-Modus via docOwnerOf) — der Picker selbst ändert
// weder m.docOwnerType/-ID noch den All-Modus.
func (m model) openDocAssign() (tea.Model, tea.Cmd) {
	cur := m.selDoc()
	if cur == nil {
		return m, nil
	}
	srcType, srcID := m.docOwnerType, m.docOwnerID
	if m.docAllMode {
		srcType, srcID = docOwnerOf(cur)
	}
	m.docAsPick = true
	m.docAsDocID = cur.ID
	m.docAsSrcType = srcType
	m.docAsSrcID = srcID
	m.docAsOpts = docAssignOpts(m.milestones)
	m.docAsMenu = listState{}
	m.docAsMenu.setLen(len(m.docAsOpts))
	m.status = ""
	return m, nil
}

// keyDocAssign steuert den Picker: i/k navigiert, enter weist zu, esc/a/q schließt.
func (m model) keyDocAssign(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.docAsMenu.move(-1)
		return m, nil
	case "down":
		m.docAsMenu.move(1)
		return m, nil
	}
	switch {
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Assign), msg.String() == "q":
		m.docAsPick = false
		m.status = ""
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		m.docAsPick = false
		if m.docAsMenu.cursor < 0 || m.docAsMenu.cursor >= len(m.docAsOpts) {
			return m, nil
		}
		opt := m.docAsOpts[m.docAsMenu.cursor]
		m.status = "Document → " + opt.label + " …"
		return m, doMoveDocument(m.client, m.docAsSrcType, m.docAsSrcID, m.docAsDocID, opt.ownerType, opt.ownerID)
	}
	return m, nil
}

// docAssignMenu rendert den Picker als Single-Select-Liste (Muster sprintMilestoneMenu).
func (m model) docAssignMenu() string {
	body := theme.Dim.Render("i/k: select   enter: assign   esc: cancel") + "\n\n"
	if len(m.docAsOpts) == 0 {
		body += theme.Dim.Render("(no open milestones/sprints)")
		return modalPanel("Assign document", body, "", clampModalWidth(50, m.width), theme.Mauve)
	}
	body += menuList(len(m.docAsOpts), m.docAsMenu.cursor, func(i int, sel bool) string {
		label := m.docAsOpts[i].label
		if sel {
			label = theme.Header.Render(label)
		}
		return label
	})
	return modalPanel("Assign document", body, "", clampModalWidth(50, m.width), theme.Mauve)
}
