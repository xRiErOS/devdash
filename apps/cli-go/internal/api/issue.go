package api

import (
	"encoding/json"
	"fmt"
)

// IssueFromCreateFullResult entpackt das {id,key,status,assigned_sprint,item}-
// Envelope von IssueCreateFull zu einem *Issue (Response-Typing am Ort des
// Bedarfs, DD2-210 — die MCP-exakten Client-Funcs liefern durchgängig
// json.RawMessage, da Zod nur Input-Schemas hat).
func IssueFromCreateFullResult(data json.RawMessage) (*Issue, error) {
	var wrap struct {
		Item json.RawMessage `json:"item"`
	}
	if err := json.Unmarshal(data, &wrap); err != nil {
		return nil, err
	}
	var it Issue
	if err := json.Unmarshal(wrap.Item, &it); err != nil {
		return nil, err
	}
	return &it, nil
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
