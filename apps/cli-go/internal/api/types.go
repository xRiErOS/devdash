package api

// Datentypen spiegeln die DevDash-API (B1–B5 live verifiziert). Nicht deklarierte
// JSON-Felder (z.B. tags) ignoriert encoding/json bewusst, bis ihr Shape bestätigt
// ist — verhindert Unmarshal-Bruch.

type Project struct {
	ID           int    `json:"id"`
	Slug         string `json:"slug"`
	Name         string `json:"name"`
	Prefix       string `json:"prefix"`
	Color        string `json:"color"`
	Archived     int    `json:"archived"`
	SprintCount  int    `json:"sprint_count"`
	BacklogCount int    `json:"backlog_count"`
}

type Sprint struct {
	ID            int     `json:"id"`
	Key           string  `json:"key"`
	Name          string  `json:"name"`
	Status        string  `json:"status"`
	Goal          *string `json:"goal"`
	MilestoneID   *int    `json:"milestone_id"`
	MilestoneName *string `json:"milestone_name"`
	ItemCount     int     `json:"item_count"`
	DoneCount     int     `json:"done_count"`
	Items         []Issue `json:"items,omitempty"`
}

type Issue struct {
	ID             int     `json:"id"`
	Key            string  `json:"key"`
	Title          string  `json:"title"`
	Status         string  `json:"status"`
	Type           string  `json:"type"`
	Priority       int     `json:"priority"`
	AssignedSprint *int    `json:"assigned_sprint"`
	SprintKey      *string `json:"sprint_key"`
	ReviewStatus   *string `json:"review_status"`
	ReviewComment  *string `json:"review_comment"`
	Goal           *string `json:"goal"`
	Background     *string `json:"background"`
	Description    *string `json:"description"`
	Result         *string `json:"result"`
}

type Milestone struct {
	ID         int      `json:"id"`
	Name       string   `json:"name"`
	Status     string   `json:"status"`
	TargetDate *string  `json:"target_date"`
	Position   int      `json:"position"`
	Total      int      `json:"total"`
	Done       int      `json:"done"`
	Sprints    []Sprint `json:"sprints"`
}
