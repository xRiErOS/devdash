package api

import (
	"encoding/json"
	"fmt"
)

// tags.go — Tag-CRUD (DD2-75) + Entity-Tag-Zuweisung (DD2-33).
// Backend: GET/POST /api/tags, PUT/DELETE /api/tags/:id (CRUD),
// PUT /api/{backlog,sprints,milestones}/:id/tags (Replace, liefert {tags:[]}).

// ListTags liefert alle Tags des aktiven Projekts inkl. usage_count (GET /api/tags).
func (c *Client) ListTags() ([]Tag, error) {
	data, err := c.Do("GET", "/api/tags", nil)
	if err != nil {
		return nil, err
	}
	var list []Tag
	return list, json.Unmarshal(data, &list)
}

// CreateTag legt einen Tag an (POST /api/tags). color muss aus TagColors stammen
// (Backend validiert, 409 bei Namens-Duplikat).
func (c *Client) CreateTag(name, color string) (*Tag, error) {
	data, err := c.Do("POST", "/api/tags", map[string]any{"name": name, "color": color})
	if err != nil {
		return nil, err
	}
	var t Tag
	return &t, json.Unmarshal(data, &t)
}

// UpdateTag benennt einen Tag um / färbt ihn neu (PUT /api/tags/:id).
func (c *Client) UpdateTag(id int, name, color string) (*Tag, error) {
	data, err := c.Do("PUT", fmt.Sprintf("/api/tags/%d", id), map[string]any{"name": name, "color": color})
	if err != nil {
		return nil, err
	}
	var t Tag
	return &t, json.Unmarshal(data, &t)
}

// DeleteTag löscht einen Tag (DELETE /api/tags/:id, cascaded backlog/sprint/milestone-tags).
func (c *Client) DeleteTag(id int) error {
	_, err := c.Do("DELETE", fmt.Sprintf("/api/tags/%d", id), nil)
	return err
}

// tagsEnvelope spiegelt {tags:[...]} der Replace-/GET-Endpunkte.
type tagsEnvelope struct {
	Tags []Tag `json:"tags"`
}

func (c *Client) getEntityTags(path string) ([]Tag, error) {
	data, err := c.Do("GET", path, nil)
	if err != nil {
		return nil, err
	}
	var env tagsEnvelope
	return env.Tags, json.Unmarshal(data, &env)
}

// GetSprintTags liest die aktuellen Tags eines Sprints (GET /api/sprints/:id/tags) —
// für die Picker-Vorbelegung (Sprint/Milestone tragen Tags nicht embedded).
func (c *Client) GetSprintTags(id int) ([]Tag, error) {
	return c.getEntityTags(fmt.Sprintf("/api/sprints/%d/tags", id))
}

// GetMilestoneTags liest die aktuellen Tags eines Meilensteins (GET /api/milestones/:id/tags).
func (c *Client) GetMilestoneTags(id int) ([]Tag, error) {
	return c.getEntityTags(fmt.Sprintf("/api/milestones/%d/tags", id))
}
