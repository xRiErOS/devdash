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
	CreatedAt   *string `json:"created_at"`
	UpdatedAt   *string `json:"updated_at"`
}

// DocumentBody ist der POST/PUT-Body. Bei PUT (Patch) sind nicht gesetzte Felder
// ausgelassen → nur übergebene Felder ändern sich (omitempty + Pointer).
type DocumentBody struct {
	Title    string  `json:"title,omitempty"`
	Body     *string `json:"body,omitempty"`
	FilePath *string `json:"file_path,omitempty"`
}

// docBase baut den Owner-Pfad. ownerType ist "milestone" oder "sprint";
// die Route pluralisiert (milestones/sprints).
func docBase(ownerType string, ownerID int) string {
	return fmt.Sprintf("/api/%ss/%d/documents", ownerType, ownerID)
}

// ListDocuments liefert alle Dokumente eines Owners (neueste zuerst, id DESC).
func (c *Client) ListDocuments(ownerType string, ownerID int) ([]Document, error) {
	data, err := c.Do("GET", docBase(ownerType, ownerID), nil)
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

// CreateDocument legt ein Dokument an (title Pflicht, body/file_path optional).
func (c *Client) CreateDocument(ownerType string, ownerID int, body DocumentBody) (*Document, error) {
	data, err := c.Do("POST", docBase(ownerType, ownerID), body)
	if err != nil {
		return nil, err
	}
	var doc Document
	return &doc, json.Unmarshal(data, &doc)
}

// UpdateDocument patcht ein Dokument (nur gesetzte Felder).
func (c *Client) UpdateDocument(ownerType string, ownerID, docID int, body DocumentBody) (*Document, error) {
	data, err := c.Do("PUT", fmt.Sprintf("%s/%d", docBase(ownerType, ownerID), docID), body)
	if err != nil {
		return nil, err
	}
	var doc Document
	return &doc, json.Unmarshal(data, &doc)
}

// DeleteDocument löscht ein Dokument (204 No Content bei Erfolg).
func (c *Client) DeleteDocument(ownerType string, ownerID, docID int) error {
	_, err := c.Do("DELETE", fmt.Sprintf("%s/%d", docBase(ownerType, ownerID), docID), nil)
	return err
}
