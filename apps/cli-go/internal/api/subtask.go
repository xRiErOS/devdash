package api

import (
	"encoding/json"
	"fmt"
)

// Subtask = eine Unteraufgabe eines Issues (DD2-197). Quelle:
// GET /api/backlog/:id/subtasks. status ∈ {open, done}; qa_criteria ist Pflicht
// für done (Backend-Guard).
type Subtask struct {
	ID         int     `json:"id"`
	BacklogID  int     `json:"backlog_id"`
	Title      string  `json:"title"`
	QACriteria *string `json:"qa_criteria"`
	Status     string  `json:"status"`
	Position   int     `json:"position"`
}

// ListSubtasks liefert die Unteraufgaben eines Issues (nach position sortiert).
func (c *Client) ListSubtasks(issueID int) ([]Subtask, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/backlog/%d/subtasks", issueID), nil)
	if err != nil {
		return nil, err
	}
	var list []Subtask
	return list, json.Unmarshal(data, &list)
}
