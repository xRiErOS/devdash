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
	Milestone      *string `json:"milestone"`
	ReviewStatus   *string `json:"review_status"`
	ReviewComment  *string `json:"review_comment"`
	Goal           *string `json:"goal"`
	Background     *string `json:"background"`
	Description    *string `json:"description"`
	ContextNotes   *string `json:"context_notes"`
	PoNotes        *string `json:"po_notes"`
	RelevantFiles  *string `json:"relevant_files"`
	Result         *string `json:"result"`
	CreatedAt      *string `json:"created_at"`
	RefinedAt      *string     `json:"refined_at"`
	Tags           []Tag       `json:"tags,omitempty"`
	UserStories    []UserStory `json:"user_stories,omitempty"`
}

type Tag struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Color      string `json:"color"`
	UsageCount int    `json:"usage_count,omitempty"` // nur in GET /api/tags gesetzt
}

// TagColors ist die im TUI anwählbare Farb-Palette — Spiegel von TAG_COLORS in
// packages/api-types/tag.contracts.js (Backend-validierte Enum). Reihenfolge
// load-bearing für die Picker-Auswahl; bei Contract-Änderung hier nachziehen.
var TagColors = []string{"blue", "green", "peach", "mauve", "teal", "overlay0"}

// UserStory: PO hakt sie vor pass/rejected ab (us_verdict open|accepted|rejected).
type UserStory struct {
	ID      int     `json:"id"`
	Key     string  `json:"key"`
	Title   string  `json:"title"`
	Details *string `json:"details"`
	QA      *string `json:"qa"`
	Verdict string  `json:"us_verdict"`
	Pos     int     `json:"position"`
}

// IssueCreateBody ist der POST-Body für CreateIssue.
type IssueCreateBody struct {
	Title       string  `json:"title"`
	Type        string  `json:"type"`
	Priority    int     `json:"priority"`
	PoNotes     *string `json:"po_notes,omitempty"` // DD2-129: PO-Freitext (ersetzt description)
	TagIDs      []int   `json:"tag_ids,omitempty"`  // optionale Tag-Zuweisung beim Anlegen
}

// MilestoneCreateBody ist der POST-Body für CreateMilestone (name Pflicht;
// target_date wird serverseitig auto-defaulted, wenn leer).
type MilestoneCreateBody struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	TargetDate  *string `json:"target_date,omitempty"`
}

// SprintCreateBody ist der POST-Body für CreateSprint (name Pflicht; Sprint
// startet serverseitig immer im Status new).
type SprintCreateBody struct {
	Name        string  `json:"name"`
	Goal        *string `json:"goal,omitempty"`
	MilestoneID *int    `json:"milestone_id,omitempty"`
}

type Milestone struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Status      string   `json:"status"`
	Description *string  `json:"description"`
	TargetDate  *string  `json:"target_date"`
	Position    int      `json:"position"`
	Deferred    int      `json:"deferred"`
	Total       int      `json:"total"`
	Done        int      `json:"done"`
	Sprints     []Sprint `json:"sprints"`
}
