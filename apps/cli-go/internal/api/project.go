package api

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// ListProjects liefert alle Projekte (globaler Endpoint, kein Projekt-Scope nötig).
func (c *Client) ListProjects() ([]Project, error) {
	data, err := c.Do("GET", "/api/projects", nil)
	if err != nil {
		return nil, err
	}
	var list []Project
	return list, json.Unmarshal(data, &list)
}

// UpdateProject schreibt editierbare Projekt-Felder via PUT /api/projects/{id}
// und liefert das frische Projekt zurück (DD2-221). Das Backend akzeptiert nur
// eine Allowlist writable Felder (u.a. name) — slug/prefix sind NICHT writable
// (Identitäts-/Key-Integrität: prefix treibt die Issue-Keys). fields enthält die
// zu setzenden Spalten (z.B. {"name": "..."}); unbekannte Keys ignoriert das Backend.
func (c *Client) UpdateProject(id int, fields map[string]any) (*Project, error) {
	data, err := c.Do("PUT", fmt.Sprintf("/api/projects/%d", id), fields)
	if err != nil {
		return nil, err
	}
	var p Project
	if err := json.Unmarshal(data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

// ResolveProject matcht ein Token gegen slug, prefix (case-insensitiv) oder
// numerische id. Ermöglicht `dd spf` (Prefix) wie `dd devd2` (Slug).
func (c *Client) ResolveProject(token string) (*Project, error) {
	t := strings.TrimSpace(token)
	if t == "" {
		return nil, fmt.Errorf("no project given")
	}
	list, err := c.ListProjects()
	if err != nil {
		return nil, err
	}
	lt := strings.ToLower(t)
	idVal, numErr := strconv.Atoi(t)
	for i := range list {
		p := &list[i]
		if strings.ToLower(p.Slug) == lt || strings.ToLower(p.Prefix) == lt {
			return p, nil
		}
		if numErr == nil && p.ID == idVal {
			return p, nil
		}
	}
	return nil, fmt.Errorf("project %q not found (slug, prefix or id)", token)
}
