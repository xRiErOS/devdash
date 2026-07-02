package api

import (
	"encoding/json"
	"fmt"
)

// Document spiegelt eine documents-Zeile (DD2-21). Owner = genau ein Meilenstein
// ODER Sprint (über die Route, nicht den Body). body = DB-Blob (Markdown),
// file_path optionaler Hinweis. Nullable-Felder als Pointer.
type Document struct {
	ID          int     `json:"id"`
	MilestoneID *int    `json:"milestone_id"`
	SprintID    *int    `json:"sprint_id"`
	Title       string  `json:"title"`
	Body        string  `json:"body"`
	FilePath    *string `json:"file_path"`
	Status      string  `json:"status"` // DD2-167: draft|active|archived
	CreatedAt   *string `json:"created_at"`
	UpdatedAt   *string `json:"updated_at"`
	// DD2-163 (Rework): nur vom projektweiten Endpoint (listAllDocuments) gefüllt —
	// owner-gescopte Listen lassen sie leer.
	OwnerType string `json:"owner_type,omitempty"`
	OwnerName string `json:"owner_name,omitempty"`
}

// docBase baut den Owner-Pfad. ownerType ist "milestone" oder "sprint";
// die Route pluralisiert (milestones/sprints).
func docBase(ownerType string, ownerID int) string {
	return fmt.Sprintf("/api/%ss/%d/documents", ownerType, ownerID)
}

// ListAllDocuments liefert ALLE Dokumente des aktuellen Projekts (entitätsüber-
// greifend, id DESC) mit aufgelöstem OwnerType/OwnerName (DD2-163 Rework).
func (c *Client) ListAllDocuments() ([]Document, error) {
	data, err := c.Do("GET", fmt.Sprintf("/api/projects/%s/documents", c.projectID), nil)
	if err != nil {
		return nil, err
	}
	var list []Document
	return list, json.Unmarshal(data, &list)
}

// GetDocument liefert ein Dokument-Detail inkl. body.
func (c *Client) GetDocument(ownerType string, ownerID, docID int) (*Document, error) {
	data, err := c.Do("GET", fmt.Sprintf("%s/%d", docBase(ownerType, ownerID), docID), nil)
	if err != nil {
		return nil, err
	}
	var doc Document
	return &doc, json.Unmarshal(data, &doc)
}

// MoveDocument weist ein Dokument einem anderen Meilenstein/Sprint zu (DD2-243).
// ownerType/ownerID = aktueller (Quell-)Owner, targetType/targetID = Ziel.
func (c *Client) MoveDocument(ownerType string, ownerID, docID int, targetType string, targetID int) (*Document, error) {
	body := map[string]any{"target_type": targetType, "target_id": targetID}
	data, err := c.Do("PUT", fmt.Sprintf("%s/%d/move", docBase(ownerType, ownerID), docID), body)
	if err != nil {
		return nil, err
	}
	var doc Document
	return &doc, json.Unmarshal(data, &doc)
}
