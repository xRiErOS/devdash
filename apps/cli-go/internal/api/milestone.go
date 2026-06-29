package api

import (
	"encoding/json"
	"fmt"
	"net/url"
)

// ListMilestones liefert die Meilensteine des aktiven Projekts (Sprints embedded).
// status: open (default Backend) | new | in_progress | completed | cancelled | all.
func (c *Client) ListMilestones(status string) ([]Milestone, error) {
	path := "/api/milestones"
	if status != "" {
		path += "?status=" + url.QueryEscape(status)
	}
	data, err := c.Do("GET", path, nil)
	if err != nil {
		return nil, err
	}
	var list []Milestone
	return list, json.Unmarshal(data, &list)
}

// CreateMilestone legt einen neuen Meilenstein an (POST /api/milestones).
func (c *Client) CreateMilestone(body MilestoneCreateBody) (*Milestone, error) {
	data, err := c.Do("POST", "/api/milestones", body)
	if err != nil {
		return nil, err
	}
	var ms Milestone
	return &ms, json.Unmarshal(data, &ms)
}

// SetMilestoneStatus mutiert den Meilenstein-Status (PUT /api/milestones/:id
// {status}). Backend validiert die Transition (lifecycle, forward-only).
func (c *Client) SetMilestoneStatus(id int, status string) (*Milestone, error) {
	data, err := c.Do("PUT", fmt.Sprintf("/api/milestones/%d", id), map[string]any{"status": status})
	if err != nil {
		return nil, err
	}
	var ms Milestone
	return &ms, json.Unmarshal(data, &ms)
}

// CompleteMilestoneCascade schließt einen Meilenstein kaskadierend ab (DD2-28):
// offene Sprints → completed, ihre offenen Issues → done. PUT mit cascade:true.
func (c *Client) CompleteMilestoneCascade(id int) (*Milestone, error) {
	data, err := c.Do("PUT", fmt.Sprintf("/api/milestones/%d", id), map[string]any{"status": "completed", "cascade": true})
	if err != nil {
		return nil, err
	}
	var ms Milestone
	return &ms, json.Unmarshal(data, &ms)
}

// UpdateMilestone editiert Meilenstein-Felder (name/description/target_date) via
// PUT /api/milestones/:id (milestoneUpdateContract). Status läuft NICHT hierüber
// (eigenes Lifecycle-Verb SetMilestoneStatus) — DD2-79.
func (c *Client) UpdateMilestone(id int, fields map[string]any) (*Milestone, error) {
	data, err := c.Do("PUT", fmt.Sprintf("/api/milestones/%d", id), fields)
	if err != nil {
		return nil, err
	}
	var ms Milestone
	return &ms, json.Unmarshal(data, &ms)
}

// GetMilestone liefert einen Meilenstein inkl. Sprints.
func (c *Client) GetMilestone(id int) (*Milestone, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/milestones/%d", id), nil)
	if err != nil {
		return nil, err
	}
	var m Milestone
	return &m, json.Unmarshal(data, &m)
}
