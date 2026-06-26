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
