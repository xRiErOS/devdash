package api

import (
	"encoding/json"
	"fmt"
)

// DepEntry ist ein Vorgänger/Nachfolger-Eintrag (Milestone bzw. Sprint).
// Shape vom Backend: {id, name, dependency_id} (vgl. milestoneDependencies.js /
// sprintDependencies.js). Kein flaches Array — immer in {predecessors,successors}.
type DepEntry struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	DependencyID int    `json:"dependency_id"`
}

// Dependencies bündelt Vorgänger (predecessors) und Nachfolger (successors) einer
// Entität — die Antwortform von GET /api/{milestones,sprints}/:id/dependencies.
type Dependencies struct {
	Predecessors []DepEntry `json:"predecessors"`
	Successors   []DepEntry `json:"successors"`
}

// GetMilestoneDependencies liest Vorgänger/Nachfolger eines Meilensteins (read-only).
func (c *Client) GetMilestoneDependencies(id int) (*Dependencies, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/milestones/%d/dependencies", id), nil)
	if err != nil {
		return nil, err
	}
	var d Dependencies
	return &d, json.Unmarshal(data, &d)
}

// GetSprintDependencies liest Vorgänger/Nachfolger eines Sprints (read-only).
func (c *Client) GetSprintDependencies(id int) (*Dependencies, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/sprints/%d/dependencies", id), nil)
	if err != nil {
		return nil, err
	}
	var d Dependencies
	return &d, json.Unmarshal(data, &d)
}
