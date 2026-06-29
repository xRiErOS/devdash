package api

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// Ref ist das geparste Ergebnis einer Key-Eingabe.
// Faithful Port von packages/api-types/keys.js (Single Source CLI + MCP).
type Ref struct {
	IsID   bool   // numerische Roh-ID
	ID     int    // gültig wenn IsID
	Prefix string // "" wenn prefix-los (bare "#77")
	Number int    // project_number
}

var (
	reID    = regexp.MustCompile(`^\d+$`)
	reBare  = regexp.MustCompile(`^#(\d+)$`)
	reSep   = regexp.MustCompile(`^([A-Za-z][A-Za-z0-9]{1,5})[-#](\d+)$`)
	reNoSep = regexp.MustCompile(`^([A-Za-z]{2,6})(\d+)$`)
)

// ParseRef akzeptiert "77", "DD2#12", "DD2-42", "dd2-42", "dd2", "#77".
// Reihenfolge wie keys.js: ID → bare → mit-Separator → ohne-Separator.
func ParseRef(input string) (Ref, bool) {
	s := strings.TrimSpace(input)
	if s == "" {
		return Ref{}, false
	}
	if reID.MatchString(s) {
		n, _ := strconv.Atoi(s)
		return Ref{IsID: true, ID: n}, true
	}
	if m := reBare.FindStringSubmatch(s); m != nil {
		n, _ := strconv.Atoi(m[1])
		return Ref{Number: n}, true
	}
	if m := reSep.FindStringSubmatch(s); m != nil {
		n, _ := strconv.Atoi(m[2])
		return Ref{Prefix: strings.ToUpper(m[1]), Number: n}, true
	}
	if m := reNoSep.FindStringSubmatch(s); m != nil {
		n, _ := strconv.Atoi(m[2])
		return Ref{Prefix: strings.ToUpper(m[1]), Number: n}, true
	}
	return Ref{}, false
}

// refMatchesKey prüft, ob die Eingabe-Ref auf ein Backend-`key` passt. Beide
// Seiten via ParseRef normalisiert → Prefix-Schreibweise/Separator egal.
func refMatchesKey(r Ref, key string) bool {
	kr, ok := ParseRef(key)
	if !ok || kr.IsID {
		return false
	}
	if kr.Number != r.Number {
		return false
	}
	if r.Prefix != "" && kr.Prefix != r.Prefix {
		return false
	}
	return true
}

// ResolveSprintID übersetzt Key|ID → numerische Sprint-ID.
func (c *Client) ResolveSprintID(input string) (int, error) {
	r, ok := ParseRef(input)
	if !ok {
		return 0, fmt.Errorf("invalid key %q (expected e.g. DD2#12, DD2-42 or a number)", input)
	}
	if r.IsID {
		return r.ID, nil
	}
	data, err := c.Do("GET", "/api/sprints", nil)
	if err != nil {
		return 0, err
	}
	var list []Sprint
	if err := json.Unmarshal(data, &list); err != nil {
		return 0, err
	}
	for _, s := range list {
		if refMatchesKey(r, s.Key) {
			return s.ID, nil
		}
	}
	return 0, fmt.Errorf("sprint %q not found", input)
}

// ResolveIssueID übersetzt Key|ID → numerische Issue-ID.
func (c *Client) ResolveIssueID(input string) (int, error) {
	r, ok := ParseRef(input)
	if !ok {
		return 0, fmt.Errorf("invalid key %q (expected e.g. DD2-42 or a number)", input)
	}
	if r.IsID {
		return r.ID, nil
	}
	data, err := c.Do("GET", "/api/backlog", nil)
	if err != nil {
		return 0, err
	}
	var list []Issue
	if err := json.Unmarshal(data, &list); err != nil {
		return 0, err
	}
	for _, i := range list {
		if refMatchesKey(r, i.Key) {
			return i.ID, nil
		}
	}
	return 0, fmt.Errorf("issue %q not found", input)
}
