package api

import (
	"encoding/json"
	"fmt"
)

// ListUserStories liefert die User-Stories eines Issues (PO-Abnahme).
func (c *Client) ListUserStories(issueID int) ([]UserStory, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/backlog/%d/user-stories", issueID), nil)
	if err != nil {
		return nil, err
	}
	var list []UserStory
	return list, json.Unmarshal(data, &list)
}

// AddUserStory legt eine User-Story (Prüfgrundlage) an einem Issue an (DD2-66).
// title ist Pflicht; qa (per-Story-Akzeptanzkriterium, D09) optional. Spiegelt
// POST /api/backlog/:id/user-stories (createUserStory: title, details, qa).
func (c *Client) AddUserStory(issueID int, title, qa string) (*UserStory, error) {
	body := map[string]any{"title": title}
	if qa != "" {
		body["qa"] = qa
	}
	data, err := c.Do("POST", fmt.Sprintf("/api/backlog/%d/user-stories", issueID), body)
	if err != nil {
		return nil, err
	}
	var us UserStory
	return &us, json.Unmarshal(data, &us)
}

// EditUserStory ändert Titel und/oder QA einer bestehenden User-Story (DD2-144).
// Spiegelt PATCH /api/user-stories/:id (updateUserStory: title, qa, details).
// qa wird immer mitgeschickt (auch leer → leeren), title nur wenn nicht leer.
func (c *Client) EditUserStory(usID int, title, qa string) (*UserStory, error) {
	body := map[string]any{"qa": qa}
	if title != "" {
		body["title"] = title
	}
	data, err := c.Do("PATCH", fmt.Sprintf("/api/user-stories/%d", usID), body)
	if err != nil {
		return nil, err
	}
	var us UserStory
	return &us, json.Unmarshal(data, &us)
}

// SetUserStoryVerdict setzt das Verdikt einer User-Story (open|accepted|rejected).
func (c *Client) SetUserStoryVerdict(usID int, verdict string) (*UserStory, error) {
	data, err := c.Do("PATCH", fmt.Sprintf("/api/user-stories/%d/verdict", usID), map[string]any{"us_verdict": verdict})
	if err != nil {
		return nil, err
	}
	var us UserStory
	return &us, json.Unmarshal(data, &us)
}
