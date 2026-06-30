package api

import (
	"encoding/json"
	"fmt"
	"net/url"
)

// UserNote spiegelt eine user_notes-Zeile (DD2-161). Project-gescopt über den
// X-Project-Id-Header. FTS über title+details. sprints/issues sind Key-Arrays.
type UserNote struct {
	ID        int      `json:"id"`
	ProjectID int      `json:"project_id"`
	Title     string   `json:"title"`
	Details   string   `json:"details"`
	PrURL     *string  `json:"pr_url"`
	Sprints   []string `json:"sprints"`
	Issues    []string `json:"issues"`
	Status    string   `json:"status"` // DD2-168: draft|active|archived
	CreatedAt *string  `json:"created_at"`
	UpdatedAt *string  `json:"updated_at"`
}

// UserNoteBody ist der POST/PUT-Body. Bei PUT (Patch) ändern nur gesetzte Felder
// (omitempty). title ist beim Create Pflicht.
type UserNoteBody struct {
	Title   string   `json:"title,omitempty"`
	Details *string  `json:"details,omitempty"`
	PrURL   *string  `json:"pr_url,omitempty"`
	Sprints []string `json:"sprints,omitempty"`
	Issues  []string `json:"issues,omitempty"`
	Status  string   `json:"status,omitempty"` // DD2-168
}

// ListUserNotes liefert die Notizen des aktuellen Projekts (neueste zuerst).
// search != "" → FTS-Match über title+details.
func (c *Client) ListUserNotes(search string) ([]UserNote, error) {
	path := "/api/user-notes"
	if search != "" {
		path += "?search=" + url.QueryEscape(search)
	}
	data, err := c.Do("GET", path, nil)
	if err != nil {
		return nil, err
	}
	var list []UserNote
	return list, json.Unmarshal(data, &list)
}

// GetUserNote liefert ein Notiz-Detail.
func (c *Client) GetUserNote(id int) (*UserNote, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/user-notes/%d", id), nil)
	if err != nil {
		return nil, err
	}
	var n UserNote
	return &n, json.Unmarshal(data, &n)
}

// CreateUserNote legt eine Notiz an (title Pflicht).
func (c *Client) CreateUserNote(body UserNoteBody) (*UserNote, error) {
	data, err := c.Do("POST", "/api/user-notes", body)
	if err != nil {
		return nil, err
	}
	var n UserNote
	return &n, json.Unmarshal(data, &n)
}

// UpdateUserNote patcht eine Notiz (nur gesetzte Felder).
func (c *Client) UpdateUserNote(id int, body UserNoteBody) (*UserNote, error) {
	data, err := c.Do("PUT", fmt.Sprintf("/api/user-notes/%d", id), body)
	if err != nil {
		return nil, err
	}
	var n UserNote
	return &n, json.Unmarshal(data, &n)
}

// DeleteUserNote löscht eine Notiz (204 No Content bei Erfolg).
func (c *Client) DeleteUserNote(id int) error {
	_, err := c.Do("DELETE", fmt.Sprintf("/api/user-notes/%d", id), nil)
	return err
}
