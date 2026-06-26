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

// SetUserStoryVerdict setzt das Verdikt einer User-Story (open|accepted|rejected).
func (c *Client) SetUserStoryVerdict(usID int, verdict string) (*UserStory, error) {
	data, err := c.Do("PATCH", fmt.Sprintf("/api/user-stories/%d/verdict", usID), map[string]any{"us_verdict": verdict})
	if err != nil {
		return nil, err
	}
	var us UserStory
	return &us, json.Unmarshal(data, &us)
}
