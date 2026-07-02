package api

import (
	"encoding/json"
	"fmt"
)

// DeletePreview trägt die Counts eines Cascade-Deletes (T02a/T02b).
type DeletePreview struct {
	MilestoneName string `json:"milestone_name"`
	SprintName    string `json:"sprint_name"`
	Sprints       int    `json:"sprints"`
	Issues        int    `json:"issues"`
	Documents     int    `json:"documents"`
}

// MilestoneDeletePreview liefert die Counts, die ein Cascade-Delete mitnähme.
func (c *Client) MilestoneDeletePreview(id int) (*DeletePreview, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/milestones/%d/delete-preview", id), nil)
	if err != nil {
		return nil, err
	}
	var p DeletePreview
	return &p, json.Unmarshal(data, &p)
}

// SprintDeletePreview liefert die Issue-Counts eines Sprint-Cascade-Deletes.
func (c *Client) SprintDeletePreview(id int) (*DeletePreview, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/sprints/%d/delete-preview", id), nil)
	if err != nil {
		return nil, err
	}
	var p DeletePreview
	return &p, json.Unmarshal(data, &p)
}

// DeleteMilestoneCascade löscht Meilenstein + Sprints + Issues (eine Transaktion).
func (c *Client) DeleteMilestoneCascade(id int) error {
	_, err := c.Do("DELETE", fmt.Sprintf("/api/milestones/%d?cascade=1", id), nil)
	return err
}

// DeleteSprintCascade löscht den Sprint inkl. seiner Issues.
func (c *Client) DeleteSprintCascade(id int) error {
	_, err := c.Do("DELETE", fmt.Sprintf("/api/sprints/%d?cascade=1", id), nil)
	return err
}

// ProjectDeletePreview trägt die Counts eines Projekt-Cascade-Deletes (für den
// TUI-/CLI-Confirm). Spiegelt projectDeletePreview im Backend.
type ProjectDeletePreview struct {
	ProjectID       int    `json:"project_id"`
	ProjectName     string `json:"project_name"`
	Sprints         int    `json:"sprints"`
	Backlog         int    `json:"backlog"`
	Milestones      int    `json:"milestones"`
	Tags            int    `json:"tags"`
	ProjectMemories int    `json:"project_memories"`
	UserNotes       int    `json:"user_notes"`
	Todos           int    `json:"todos"`
}

// ProjectDeletePreview liefert die Counts, die ein Projekt-Cascade-Delete mitnähme.
func (c *Client) ProjectDeletePreview(id int) (*ProjectDeletePreview, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/projects/%d/delete-preview", id), nil)
	if err != nil {
		return nil, err
	}
	var p ProjectDeletePreview
	return &p, json.Unmarshal(data, &p)
}

// DeleteProjectCascade reißt das Projekt inkl. Sprints/Issues/Milestones/Tags/…
// ab (eine Transaktion serverseitig). id=1 lehnt das Backend hart ab.
func (c *Client) DeleteProjectCascade(id int) error {
	_, err := c.Do("DELETE", fmt.Sprintf("/api/projects/%d?cascade=1", id), nil)
	return err
}
