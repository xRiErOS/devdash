package api

import (
	"encoding/json"
	"fmt"
)

// SubmitReview legt eine Review-Runde mit Verdikt an (atomar). verdict =
// 'passed' | 'not_passed' (leer = pending). Comment Pflicht bei not_passed
// (Aufrufer erzwingt). Backend auto-transitioniert das Issue. Liefert die rohe
// Antwort (Review-Row).
func (c *Client) SubmitReview(id int, verdict, comment, notes string) ([]byte, error) {
	body := map[string]any{}
	if verdict != "" {
		body["review_status"] = verdict
	}
	if comment != "" {
		body["comment"] = comment
	}
	if notes != "" {
		body["notes"] = notes
	}
	return c.Do("POST", fmt.Sprintf("/api/backlog/%d/reviews", id), body)
}

// ReopenReview öffnet eine entschiedene Review-Runde erneut.
func (c *Client) ReopenReview(id int) ([]byte, error) {
	return c.Do("POST", fmt.Sprintf("/api/backlog/%d/review/reopen", id), nil)
}

// SprintTo setzt den Sprint-Status (in_progress|to_review|completed). completed ist
// PO-exklusiv (DD-186) — der Aufrufer guardet via Confirm/--yes.
func (c *Client) SprintTo(id int, to string) (*Sprint, error) {
	data, err := c.Do("PATCH", fmt.Sprintf("/api/sprints/%d/status", id), map[string]any{"to": to})
	if err != nil {
		return nil, err
	}
	var s Sprint
	return &s, json.Unmarshal(data, &s)
}

// SprintComplete schließt einen Sprint ab (to_review→completed). Eigener Endpoint
// statt PATCH /status — das Backend prüft passed-Reviews. PO-exklusiv (DD-186).
func (c *Client) SprintComplete(id int) (*Sprint, error) {
	data, err := c.Do("POST", fmt.Sprintf("/api/sprints/%d/complete", id), nil)
	if err != nil {
		return nil, err
	}
	var s Sprint
	return &s, json.Unmarshal(data, &s)
}

// SprintReviewSubmit reicht einen Sprint zur Review ein.
func (c *Client) SprintReviewSubmit(id int) ([]byte, error) {
	return c.Do("POST", fmt.Sprintf("/api/sprints/%d/review-submit", id), nil)
}

// SprintRevResults liefert die Review-Ergebnisse eines Sprints (roh).
func (c *Client) SprintRevResults(id int) ([]byte, error) {
	return c.Do("GET", fmt.Sprintf("/api/sprints/%d/rev-results", id), nil)
}

// SprintCompleteness liefert die Readiness-Auswertung eines Sprints (roh).
func (c *Client) SprintCompleteness(id int) ([]byte, error) {
	return c.Do("GET", fmt.Sprintf("/api/sprints/%d/completeness", id), nil)
}
