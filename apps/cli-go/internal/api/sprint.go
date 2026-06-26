package api

import (
	"encoding/json"
	"fmt"
	"net/url"
)

// ListSprints liefert die Sprints des aktiven Projekts, optional status-gefiltert.
func (c *Client) ListSprints(status string) ([]Sprint, error) {
	path := "/api/sprints"
	if status != "" {
		path += "?status=" + url.QueryEscape(status)
	}
	data, err := c.Do("GET", path, nil)
	if err != nil {
		return nil, err
	}
	var list []Sprint
	return list, json.Unmarshal(data, &list)
}

// CreateSprint legt einen neuen Sprint an (POST /api/sprints, Status planning).
func (c *Client) CreateSprint(body SprintCreateBody) (*Sprint, error) {
	data, err := c.Do("POST", "/api/sprints", body)
	if err != nil {
		return nil, err
	}
	var s Sprint
	return &s, json.Unmarshal(data, &s)
}

// SetSprintMilestone weist den Sprint einem Meilenstein zu (milestoneID=nil →
// lösen). PUT /api/sprints/:id {milestone_id}. Backend prüft Projekt-Match +
// lehnt abgeschlossene Meilensteine ab (422).
func (c *Client) SetSprintMilestone(id int, milestoneID *int) (*Sprint, error) {
	data, err := c.Do("PUT", fmt.Sprintf("/api/sprints/%d", id), map[string]any{"milestone_id": milestoneID})
	if err != nil {
		return nil, err
	}
	var s Sprint
	return &s, json.Unmarshal(data, &s)
}

// GetSprint liefert einen Sprint inkl. eingebetteter items (Issues).
func (c *Client) GetSprint(id int) (*Sprint, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/sprints/%d", id), nil)
	if err != nil {
		return nil, err
	}
	var s Sprint
	return &s, json.Unmarshal(data, &s)
}

// GetSprintContext liefert den rohen Sprint-Kontext (format=markdown → text/plain).
func (c *Client) GetSprintContext(id int, format string) ([]byte, error) {
	path := fmt.Sprintf("/api/sprints/%d/context", id)
	if format != "" {
		path += "?format=" + url.QueryEscape(format)
	}
	return c.Do("GET", path, nil)
}
