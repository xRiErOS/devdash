package api

import (
	"encoding/json"
	"fmt"
)

// DodItem spiegelt eine milestone_dod_items-Zeile (DD2-270). label ist Pflicht,
// done ein 0/1-Bool (SQLite CHECK(done IN (0,1))), position steuert die Reihenfolge.
type DodItem struct {
	ID          int     `json:"id"`
	MilestoneID int     `json:"milestone_id"`
	Label       string  `json:"label"`
	Done        bool    `json:"done"`
	Position    int     `json:"position"`
	Details     *string `json:"details"`
}

// ListDodItems liest die DoD-Items eines Meilensteins (position ASC, DD2-270).
func (c *Client) ListDodItems(milestoneID int) ([]DodItem, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/milestones/%d/dod-items", milestoneID), nil)
	if err != nil {
		return nil, err
	}
	var list []DodItem
	return list, json.Unmarshal(data, &list)
}

// AddDodItem legt ein DoD-Item an einem Meilenstein an (DD2-270).
func (c *Client) AddDodItem(milestoneID int, label string) (*DodItem, error) {
	data, err := c.Do("POST", fmt.Sprintf("/api/milestones/%d/dod-items", milestoneID), map[string]any{"label": label})
	if err != nil {
		return nil, err
	}
	var item DodItem
	return &item, json.Unmarshal(data, &item)
}

// EditDodItem ändert label und/oder done eines bestehenden DoD-Items (DD2-270).
func (c *Client) EditDodItem(itemID int, label string, done bool) (*DodItem, error) {
	body := map[string]any{"done": done}
	if label != "" {
		body["label"] = label
	}
	data, err := c.Do("PATCH", fmt.Sprintf("/api/dod-items/%d", itemID), body)
	if err != nil {
		return nil, err
	}
	var item DodItem
	return &item, json.Unmarshal(data, &item)
}
