package api

import (
	"encoding/json"
	"fmt"
)

// SstdSlot spiegelt einen der 6 editierbaren SSTD-Prosa-Slots (MEM-16).
// slot_key ist stabil (architecture|conventions|sprint_state|roadmap|cross_refs|misc).
type SstdSlot struct {
	SlotKey   string  `json:"slot_key"`
	Content   string  `json:"content"`
	UpdatedAt *string `json:"updated_at"`
}

// SstdProjections sind die beiden READ-ONLY-Sektionen (D02-rev3): Nächste Schritte
// (← offene project_todos) und Session-Log (← session_log-Memories). Fertiges Markdown.
type SstdProjections struct {
	NextSteps string `json:"next_steps"`
	Journal   string `json:"journal"`
}

// SstdSlotKeys = die 6 Slot-Keys in fixer Reihenfolge (Spiegel SLOT_KEYS im
// Backend-Contract). Das Backend liefert listSlots bereits in dieser Reihenfolge;
// hier eingefroren für deterministische UI-Reihenfolge.
var SstdSlotKeys = []string{"architecture", "conventions", "sprint_state", "roadmap", "cross_refs", "misc"}

func sstdBase(projectID string) string {
	return fmt.Sprintf("/api/projects/%s/sstd", projectID)
}

// GetSstdSlots liefert immer alle 6 Slots (ungefüllte als leer) in fixer Reihenfolge.
func (c *Client) GetSstdSlots() ([]SstdSlot, error) {
	data, err := c.Do("GET", sstdBase(c.projectID)+"/slots", nil)
	if err != nil {
		return nil, err
	}
	var list []SstdSlot
	return list, json.Unmarshal(data, &list)
}

// GetSstdSlot liefert einen einzelnen Slot.
func (c *Client) GetSstdSlot(key string) (*SstdSlot, error) {
	data, err := c.Do("GET", sstdBase(c.projectID)+"/slots/"+key, nil)
	if err != nil {
		return nil, err
	}
	var s SstdSlot
	return &s, json.Unmarshal(data, &s)
}

// SetSstdSlot schreibt einen Slot komplett neu (last-write-wins, PUT).
func (c *Client) SetSstdSlot(key, content string) (*SstdSlot, error) {
	body := map[string]string{"content": content}
	data, err := c.Do("PUT", sstdBase(c.projectID)+"/slots/"+key, body)
	if err != nil {
		return nil, err
	}
	var s SstdSlot
	return &s, json.Unmarshal(data, &s)
}

// GetSstdProjections liefert die beiden read-only Projektionen.
func (c *Client) GetSstdProjections() (*SstdProjections, error) {
	data, err := c.Do("GET", sstdBase(c.projectID)+"/projections", nil)
	if err != nil {
		return nil, err
	}
	var p SstdProjections
	return &p, json.Unmarshal(data, &p)
}
