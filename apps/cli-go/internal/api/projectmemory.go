package api

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
)

// ProjectMemory spiegelt eine project_memories-Zeile. content ist nur im Detail
// gefüllt (GET /:id bzw. ?fields=full) — die Compact-Liste lässt es weg (DD-622).
// Risiko-Felder mit unbestätigtem Shape (importance/tags/pinned) bewusst
// ausgelassen, bis verifiziert (siehe types.go-Hinweis).
type ProjectMemory struct {
	ID        int     `json:"id"`
	Category  string  `json:"category"`
	Summary   string  `json:"summary"`
	Content   *string `json:"content"`
	Anchor    *string `json:"anchor"`
	Stability *string `json:"stability"`
	CreatedAt *string `json:"created_at"`
	UpdatedAt *string `json:"updated_at"`
}

// ProjectMemoryCreateBody ist der POST-Body für CreateProjectMemory.
type ProjectMemoryCreateBody struct {
	Category string  `json:"category"`
	Summary  string  `json:"summary"`
	Content  *string `json:"content,omitempty"`
	Anchor   *string `json:"anchor,omitempty"`
}

// ListProjectMemories liefert die Compact-Liste (ohne content), optional
// kategorie-gefiltert.
func (c *Client) ListProjectMemories(category string) ([]ProjectMemory, error) {
	path := "/api/project-memories"
	if category != "" {
		path += "?category=" + url.QueryEscape(category)
	}
	data, err := c.Do("GET", path, nil)
	if err != nil {
		return nil, err
	}
	var list []ProjectMemory
	return list, json.Unmarshal(data, &list)
}

// SearchProjectMemories durchsucht die Memories (Volltext q + optional Kategorie).
func (c *Client) SearchProjectMemories(q, category string, limit int) ([]ProjectMemory, error) {
	params := url.Values{}
	params.Set("q", q)
	if category != "" {
		params.Set("category", category)
	}
	if limit > 0 {
		params.Set("limit", strconv.Itoa(limit))
	}
	data, err := c.Do("GET", "/api/project-memories/search?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	var list []ProjectMemory
	return list, json.Unmarshal(data, &list)
}

// GetProjectMemory liefert ein Memory-Detail inkl. content (GET /:id).
func (c *Client) GetProjectMemory(id int) (*ProjectMemory, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/project-memories/%d", id), nil)
	if err != nil {
		return nil, err
	}
	var mem ProjectMemory
	return &mem, json.Unmarshal(data, &mem)
}

// CreateProjectMemory legt ein Memory an (POST). category + summary Pflicht.
func (c *Client) CreateProjectMemory(body ProjectMemoryCreateBody) (*ProjectMemory, error) {
	data, err := c.Do("POST", "/api/project-memories", body)
	if err != nil {
		return nil, err
	}
	var mem ProjectMemory
	return &mem, json.Unmarshal(data, &mem)
}
