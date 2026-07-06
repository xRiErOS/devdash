// Package api ist der geteilte API-Kern für beide Layer (One-Shot-CLI + TUI).
// HTTP-Client gegen die DevDash-Express-API.
//
//go:generate npm --prefix ../../../.. run gen:cli-client
package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

const defaultBaseURL = "http://100.71.39.53:3001"

// Client kapselt baseURL, Projekt-Scope und optionalen Auth-Token.
type Client struct {
	baseURL   string
	projectID string
	token     string
}

// NewClient erstellt einen API-Client. projectOverride hat Vorrang vor der Env
// DEVD_PROJECT_ID; es gibt KEINEN hartcodierten Projekt-Default (die id 2 aus
// dem Erstplan existiert nicht). Die vollständige Auflösung (Flag > Env > State
// > Fehler bzw. Picker) liegt in der aufrufenden Schicht (cmd/tui).
func NewClient(projectOverride string) *Client {
	pid := projectOverride
	if pid == "" {
		pid = os.Getenv("DEVD_PROJECT_ID")
	}
	return &Client{
		baseURL:   getenv("DEVD_API_URL", defaultBaseURL),
		projectID: pid,
		token:     os.Getenv("DEVD_API_TOKEN"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ProjectID liefert die aktuell gescopte Projekt-ID (leer = ungesetzt).
func (c *Client) ProjectID() string { return c.projectID }

// Do führt einen API-Request aus und liefert den rohen Response-Body.
// Bei Status >= 400 entsteht ein Fehler mit Statuscode + Body.
func (c *Client) Do(method, path string, body any) ([]byte, error) {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.baseURL+path, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.projectID != "" {
		req.Header.Set("X-Project-Id", c.projectID)
	}
	if c.token != "" {
		req.Header.Set("X-Devd-Token", c.token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API %d: %s", resp.StatusCode, data)
	}
	return data, nil
}
