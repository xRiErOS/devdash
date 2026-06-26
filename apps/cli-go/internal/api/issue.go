package api

import (
	"encoding/json"
	"fmt"
	"net/url"
)

// IssueListOpts sind die Query-Filter für ListIssues.
type IssueListOpts struct {
	Status   string
	SprintID string
	Search   string
	Type     string
	Fields   string
}

// ListIssues liefert das Backlog des aktiven Projekts (gefiltert).
func (c *Client) ListIssues(opts IssueListOpts) ([]Issue, error) {
	params := url.Values{}
	if opts.Status != "" {
		params.Set("status", opts.Status)
	}
	if opts.SprintID != "" {
		params.Set("sprint_id", opts.SprintID)
	}
	if opts.Search != "" {
		params.Set("search", opts.Search)
	}
	if opts.Type != "" {
		params.Set("type", opts.Type)
	}
	if opts.Fields != "" {
		params.Set("fields", opts.Fields)
	}
	path := "/api/backlog"
	if len(params) > 0 {
		path += "?" + params.Encode()
	}
	data, err := c.Do("GET", path, nil)
	if err != nil {
		return nil, err
	}
	var list []Issue
	return list, json.Unmarshal(data, &list)
}

// GetIssue liefert ein Issue-Detail (reich: result, deps, … via ignorierter Felder).
func (c *Client) GetIssue(id int) (*Issue, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/backlog/%d", id), nil)
	if err != nil {
		return nil, err
	}
	var it Issue
	return &it, json.Unmarshal(data, &it)
}

// CreateIssue legt ein neues Issue an.
func (c *Client) CreateIssue(body IssueCreateBody) (*Issue, error) {
	data, err := c.Do("POST", "/api/backlog", body)
	if err != nil {
		return nil, err
	}
	var it Issue
	return &it, json.Unmarshal(data, &it)
}

// SetIssueStatus setzt den lifecycle-validierten Status.
func (c *Client) SetIssueStatus(id int, status string) (*Issue, error) {
	body := map[string]any{"status": status}
	data, err := c.Do("PATCH", fmt.Sprintf("/api/backlog/%d/status", id), body)
	if err != nil {
		return nil, err
	}
	var it Issue
	return &it, json.Unmarshal(data, &it)
}

// AssignSprint promotet/verschiebt ein Issue in einen Sprint (sprintID=nil → unassign).
// Backend setzt new/refined automatisch auf planned; 409 wenn Issue in_progress.
func (c *Client) AssignSprint(id int, sprintID *int) (*Issue, error) {
	body := map[string]any{"sprint_id": sprintID}
	data, err := c.Do("PATCH", fmt.Sprintf("/api/backlog/%d/sprint", id), body)
	if err != nil {
		return nil, err
	}
	var it Issue
	return &it, json.Unmarshal(data, &it)
}

// UpdateIssue editiert Felder (goal/background/type/priority/result/...).
func (c *Client) UpdateIssue(id int, fields map[string]any) (*Issue, error) {
	data, err := c.Do("PUT", fmt.Sprintf("/api/backlog/%d", id), fields)
	if err != nil {
		return nil, err
	}
	var it Issue
	return &it, json.Unmarshal(data, &it)
}
