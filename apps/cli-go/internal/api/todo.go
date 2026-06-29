package api

import (
	"encoding/json"
	"fmt"
	"net/url"
)

// Todo spiegelt eine project_todos-Zeile (DD-280). Eigener Lifecycle
// (status open|done|cancelled — NICHT Issue-Lifecycle). links bewusst ausgelassen
// (separates Subsystem, für viewToDos nicht benötigt).
type Todo struct {
	ID          int     `json:"id"`
	ProjectID   int     `json:"project_id"`
	Label       string  `json:"label"`
	Details     *string `json:"details"`
	Status      string  `json:"status"`
	Position    int     `json:"position"`
	CreatedAt   *string `json:"created_at"`
	UpdatedAt   *string `json:"updated_at"`
	CompletedAt *string `json:"completed_at"`
}

// TodoBody ist der POST/PATCH-Body. label beim Create Pflicht; status default 'open'.
type TodoBody struct {
	Label   string  `json:"label,omitempty"`
	Details *string `json:"details,omitempty"`
	Status  string  `json:"status,omitempty"`
}

func todoBase(projectID string) string {
	return fmt.Sprintf("/api/projects/%s/todos", projectID)
}

// ListTodos liefert die ToDos des aktuellen Projekts (nach position ASC).
// status != "" filtert (open|done|cancelled).
func (c *Client) ListTodos(status string) ([]Todo, error) {
	path := todoBase(c.projectID)
	if status != "" {
		path += "?status=" + url.QueryEscape(status)
	}
	data, err := c.Do("GET", path, nil)
	if err != nil {
		return nil, err
	}
	var list []Todo
	return list, json.Unmarshal(data, &list)
}

// CreateTodo legt ein ToDo an (label Pflicht).
func (c *Client) CreateTodo(body TodoBody) (*Todo, error) {
	data, err := c.Do("POST", todoBase(c.projectID), body)
	if err != nil {
		return nil, err
	}
	var t Todo
	return &t, json.Unmarshal(data, &t)
}

// UpdateTodo patcht label/details/status (PATCH, nur gesetzte Felder).
func (c *Client) UpdateTodo(id int, body TodoBody) (*Todo, error) {
	data, err := c.Do("PATCH", fmt.Sprintf("%s/%d", todoBase(c.projectID), id), body)
	if err != nil {
		return nil, err
	}
	var t Todo
	return &t, json.Unmarshal(data, &t)
}

// ToggleTodo schaltet ein ToDo zwischen open und done (Convenience über UpdateTodo).
func (c *Client) ToggleTodo(id int, done bool) (*Todo, error) {
	status := "open"
	if done {
		status = "done"
	}
	return c.UpdateTodo(id, TodoBody{Status: status})
}

// DeleteTodo löscht ein ToDo (204 No Content bei Erfolg).
func (c *Client) DeleteTodo(id int) error {
	_, err := c.Do("DELETE", fmt.Sprintf("%s/%d", todoBase(c.projectID), id), nil)
	return err
}
