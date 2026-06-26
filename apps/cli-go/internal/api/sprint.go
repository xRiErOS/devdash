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
