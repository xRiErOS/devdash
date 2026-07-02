// manual.go — Hand-codierte Client-Funcs für MCP-Tools, die der Single-Call-Generator
// (codegen/gen-client.mjs) nicht emittieren kann: echte Multi-Call-Tools, Handler-Formen
// jenseits des DD2-203-Parsers, und ein Tool (IssueCreateFull) das zwar EINEN apiRequest-
// Call hat, aber Mehr-Identifier-Guards enthält, die der Parser bewusst-konservativ nicht
// erfasst (Generator-Fix-Versuch DD2-207 scheiterte an tag_ids/status — siehe context_notes
// DD2-207). Faithful Port von apps/cli/mcp/devd-mcp.js — Quelle der Wahrheit bei Divergenz.
// Signaturen folgen D06 (Go-Name = pascalCase(MCP-Name minus devd_-Prefix)), Result-Typ
// json.RawMessage wie generated.go, damit DD2-210 Call-Sites einheitlich migrieren kann.
package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"devd-cli/internal/api/generated"
)

// ---------------------------------------------------------------------------
// Tag-Helper (geteilt von Issue/Sprint/Milestone-Tag-Set/Remove) — DD2-208.
// Namen kommen als tags any (Zod-Union string|[]string) rein, wie devd-mcp.js.
// ---------------------------------------------------------------------------

// tagNamesFromAny normalisiert tags any (string, []string, []any oder nil) zu einer
// getrimmten, leerstring-freien Namensliste (spiegelt Array.isArray(tags) ? tags :
// String(tags).split(',')).
func tagNamesFromAny(v any) []string {
	var raw []string
	switch t := v.(type) {
	case nil:
		return nil
	case []string:
		raw = t
	case []any:
		for _, x := range t {
			raw = append(raw, fmt.Sprintf("%v", x))
		}
	case string:
		raw = strings.Split(t, ",")
	default:
		raw = strings.Split(fmt.Sprintf("%v", t), ",")
	}
	out := make([]string, 0, len(raw))
	for _, n := range raw {
		n = strings.TrimSpace(n)
		if n != "" {
			out = append(out, n)
		}
	}
	return out
}

// resolveTagIDs löst Tag-Namen (case-insensitiv) gegen die Projekt-Tags auf. Unbekannte
// Namen werden NICHT auto-angelegt — Fehler mit den fehlenden Namen (spiegelt resolveTagIds
// in devd-mcp.js, dort als {error} zurückgereicht — hier als Go-error, idiomatischer für
// diese Package).
func (c *Client) resolveTagIDs(names []string) ([]int, error) {
	if len(names) == 0 {
		return nil, nil
	}
	data, err := c.Do("GET", "/api/tags", nil)
	if err != nil {
		return nil, err
	}
	var all []Tag
	if err := json.Unmarshal(data, &all); err != nil {
		return nil, err
	}
	byName := make(map[string]int, len(all))
	for _, t := range all {
		byName[strings.ToLower(t.Name)] = t.ID
	}
	var ids []int
	var missing []string
	for _, n := range names {
		if id, ok := byName[strings.ToLower(n)]; ok {
			ids = append(ids, id)
		} else {
			missing = append(missing, n)
		}
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("unknown tags (create first with CreateTag): %s", strings.Join(missing, ", "))
	}
	return ids, nil
}

// setEntityTags ersetzt ALLE Tags einer Entität (issue/sprint/milestone) durch die
// gegebenen Namen (leer → clear). Shared-Logik hinter IssueTagSet/SprintTagSet/MilestoneTagSet.
func (c *Client) setEntityTags(basePath string, id int, tagsRaw any) (json.RawMessage, error) {
	names := tagNamesFromAny(tagsRaw)
	ids, err := c.resolveTagIDs(names)
	if err != nil {
		return nil, err
	}
	if ids == nil {
		ids = []int{}
	}
	return c.Do("PUT", fmt.Sprintf("%s/%d/tags", basePath, id), map[string]any{"tag_ids": ids})
}

// removeEntityTags entfernt die gegebenen Namen aus den aktuellen Tags einer Entität
// (Rest bleibt). Liest über GET {basePath}/:id/tags ({tags:[]}-Envelope) — Shared-Logik
// hinter SprintTagRemove/MilestoneTagRemove (Issue hat abweichende Read-Quelle, s. IssueTagRemove).
func (c *Client) removeEntityTags(basePath string, id int, tagsRaw any) (json.RawMessage, error) {
	remove := make(map[string]bool)
	for _, n := range tagNamesFromAny(tagsRaw) {
		remove[strings.ToLower(n)] = true
	}
	data, err := c.Do("GET", fmt.Sprintf("%s/%d/tags", basePath, id), nil)
	if err != nil {
		return nil, err
	}
	var env struct {
		Tags []Tag `json:"tags"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, err
	}
	keep := make([]int, 0, len(env.Tags))
	for _, t := range env.Tags {
		if !remove[strings.ToLower(t.Name)] {
			keep = append(keep, t.ID)
		}
	}
	return c.Do("PUT", fmt.Sprintf("%s/%d/tags", basePath, id), map[string]any{"tag_ids": keep})
}

// IssueTagSet entspricht MCP-Tool devd_issue_tag_set.
func (c *Client) IssueTagSet(args generated.IssueTagSetArgs) (json.RawMessage, error) {
	issueID, err := c.ResolveIssueID(args.IdOrKey)
	if err != nil {
		return nil, err
	}
	return c.setEntityTags("/api/backlog", issueID, args.Tags)
}

// IssueTagRemove entspricht MCP-Tool devd_issue_tag_remove. Liest (anders als
// Sprint/Milestone) über GetIssue — die Tags hängen embedded am Issue-Detail, es gibt
// keinen dedizierten GET /api/backlog/:id/tags-Endpoint.
func (c *Client) IssueTagRemove(args generated.IssueTagRemoveArgs) (json.RawMessage, error) {
	issueID, err := c.ResolveIssueID(args.IdOrKey)
	if err != nil {
		return nil, err
	}
	remove := make(map[string]bool)
	for _, n := range tagNamesFromAny(args.Tags) {
		remove[strings.ToLower(n)] = true
	}
	issue, err := c.GetIssue(issueID)
	if err != nil {
		return nil, err
	}
	keep := make([]int, 0, len(issue.Tags))
	for _, t := range issue.Tags {
		if !remove[strings.ToLower(t.Name)] {
			keep = append(keep, t.ID)
		}
	}
	return c.Do("PUT", fmt.Sprintf("/api/backlog/%d/tags", issueID), map[string]any{"tag_ids": keep})
}

// SprintTagSet entspricht MCP-Tool devd_sprint_tag_set.
func (c *Client) SprintTagSet(args generated.SprintTagSetArgs) (json.RawMessage, error) {
	id, err := c.ResolveSprintID(args.SprintKey)
	if err != nil {
		return nil, err
	}
	return c.setEntityTags("/api/sprints", id, args.Tags)
}

// SprintTagRemove entspricht MCP-Tool devd_sprint_tag_remove.
func (c *Client) SprintTagRemove(args generated.SprintTagRemoveArgs) (json.RawMessage, error) {
	id, err := c.ResolveSprintID(args.SprintKey)
	if err != nil {
		return nil, err
	}
	return c.removeEntityTags("/api/sprints", id, args.Tags)
}

// MilestoneTagSet entspricht MCP-Tool devd_milestone_tag_set.
func (c *Client) MilestoneTagSet(args generated.MilestoneTagSetArgs) (json.RawMessage, error) {
	return c.setEntityTags("/api/milestones", args.MilestoneId, args.Tags)
}

// MilestoneTagRemove entspricht MCP-Tool devd_milestone_tag_remove.
func (c *Client) MilestoneTagRemove(args generated.MilestoneTagRemoveArgs) (json.RawMessage, error) {
	return c.removeEntityTags("/api/milestones", args.MilestoneId, args.Tags)
}

// ---------------------------------------------------------------------------
// Document-CRUD — DD2-21/DD2-261. Parser lehnt ab (docOwnerBase ist ein async Helper,
// "unhandled expr type CallExpression"); document.go hat bereits Hand-Funcs, aber unter
// alten (Nicht-D06) Namen mit anderer Signatur (ownerType/ownerID statt milestone_id ODER
// sprint_key) — diese hier sind die MCP-exakten Pendants, DD2-210 migriert Call-Sites +
// löscht die alten.
// ---------------------------------------------------------------------------

var errDocOwnerRequired = errors.New("Owner erforderlich: milestone_id ODER sprint_key")

// docOwnerBase baut den Owner-Pfad aus milestone_id (Vorrang) oder sprint_key. Leerer
// String ohne Fehler = kein Owner angegeben (spiegelt docOwnerBase → null in devd-mcp.js).
func (c *Client) docOwnerBase(milestoneID *int, sprintKey *string) (string, error) {
	if milestoneID != nil {
		return fmt.Sprintf("/api/milestones/%d", *milestoneID), nil
	}
	if sprintKey != nil {
		sid, err := c.ResolveSprintID(*sprintKey)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("/api/sprints/%d", sid), nil
	}
	return "", nil
}

// DocumentList entspricht MCP-Tool devd_document_list.
func (c *Client) DocumentList(args generated.DocumentListArgs) (json.RawMessage, error) {
	base, err := c.docOwnerBase(args.MilestoneId, args.SprintKey)
	if err != nil {
		return nil, err
	}
	if base == "" {
		return nil, errDocOwnerRequired
	}
	return c.Do("GET", base+"/documents", nil)
}

// DocumentGet entspricht MCP-Tool devd_document_get.
func (c *Client) DocumentGet(args generated.DocumentGetArgs) (json.RawMessage, error) {
	base, err := c.docOwnerBase(args.MilestoneId, args.SprintKey)
	if err != nil {
		return nil, err
	}
	if base == "" {
		return nil, errDocOwnerRequired
	}
	return c.Do("GET", fmt.Sprintf("%s/documents/%d", base, args.DocId), nil)
}

// DocumentCreate entspricht MCP-Tool devd_document_create.
func (c *Client) DocumentCreate(args generated.DocumentCreateArgs) (json.RawMessage, error) {
	base, err := c.docOwnerBase(args.MilestoneId, args.SprintKey)
	if err != nil {
		return nil, err
	}
	if base == "" {
		return nil, errDocOwnerRequired
	}
	body := map[string]any{"title": args.Title}
	if args.Body != nil {
		body["body"] = *args.Body
	}
	if args.FilePath != nil {
		body["file_path"] = *args.FilePath
	}
	return c.Do("POST", base+"/documents", body)
}

// DocumentUpdate entspricht MCP-Tool devd_document_update. DD2-261: Owner optional —
// ohne milestone_id/sprint_key wird er über die projektweite Dokument-Liste aus doc_id
// abgeleitet (doc_id identifiziert das Dokument bereits eindeutig).
func (c *Client) DocumentUpdate(args generated.DocumentUpdateArgs) (json.RawMessage, error) {
	base, err := c.docOwnerBase(args.MilestoneId, args.SprintKey)
	if err != nil {
		return nil, err
	}
	if base == "" {
		all, err := c.Do("GET", fmt.Sprintf("/api/projects/%s/documents", url.PathEscape(c.ProjectID())), nil)
		if err != nil {
			return nil, err
		}
		var docs []Document
		if err := json.Unmarshal(all, &docs); err != nil {
			return nil, err
		}
		var found *Document
		for i := range docs {
			if docs[i].ID == args.DocId {
				found = &docs[i]
				break
			}
		}
		if found == nil {
			return nil, fmt.Errorf("Dokument %d nicht gefunden — Owner weder angegeben noch auflösbar", args.DocId)
		}
		if found.MilestoneID != nil {
			base = fmt.Sprintf("/api/milestones/%d", *found.MilestoneID)
		} else {
			base = fmt.Sprintf("/api/sprints/%d", *found.SprintID)
		}
	}
	patch := map[string]any{}
	if args.Title != nil {
		patch["title"] = *args.Title
	}
	if args.Body != nil {
		patch["body"] = *args.Body
	}
	if args.FilePath != nil {
		patch["file_path"] = *args.FilePath
	}
	return c.Do("PUT", fmt.Sprintf("%s/documents/%d", base, args.DocId), patch)
}

// DocumentDelete entspricht MCP-Tool devd_document_delete.
func (c *Client) DocumentDelete(args generated.DocumentDeleteArgs) (json.RawMessage, error) {
	base, err := c.docOwnerBase(args.MilestoneId, args.SprintKey)
	if err != nil {
		return nil, err
	}
	if base == "" {
		return nil, errDocOwnerRequired
	}
	return c.Do("DELETE", fmt.Sprintf("%s/documents/%d", base, args.DocId), nil)
}

// ---------------------------------------------------------------------------
// Echte Multi-Call-Tools (apiRequest call count = 2) — DD2-207.
// ---------------------------------------------------------------------------

// BacklogList entspricht MCP-Tool devd_backlog_list. Backlog-Semantik = status=new
// ∪ (status=planned ∧ sprint=null); Backend kombiniert status+sprint_id mit AND →
// zwei GET-Calls + Merge/Dedup nach key (Fallback id).
func (c *Client) BacklogList(args generated.BacklogListArgs) (json.RawMessage, error) {
	base := url.Values{}
	if args.Type != nil {
		base.Set("type", string(*args.Type))
	}
	if args.Search != nil {
		base.Set("search", *args.Search)
	}
	if args.Fields != nil {
		base.Set("fields", string(*args.Fields))
	}
	qNew := url.Values{}
	qPlanned := url.Values{}
	for k, v := range base {
		qNew[k] = v
		qPlanned[k] = v
	}
	qNew.Set("status", "new")
	qPlanned.Set("status", "planned")
	qPlanned.Set("sprint_id", "null")

	newData, err := c.Do("GET", "/api/backlog?"+qNew.Encode(), nil)
	if err != nil {
		return nil, err
	}
	plannedData, err := c.Do("GET", "/api/backlog?"+qPlanned.Encode(), nil)
	if err != nil {
		return nil, err
	}
	var newItems, plannedItems []map[string]any
	if err := json.Unmarshal(newData, &newItems); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(plannedData, &plannedItems); err != nil {
		return nil, err
	}

	seen := map[string]bool{}
	merged := make([]map[string]any, 0, len(newItems)+len(plannedItems))
	for _, it := range append(newItems, plannedItems...) {
		key := it["key"]
		if key == nil {
			key = it["id"]
		}
		k := fmt.Sprintf("%v", key)
		if seen[k] {
			continue
		}
		seen[k] = true
		merged = append(merged, it)
	}
	if args.Limit != nil && *args.Limit < len(merged) {
		merged = merged[:*args.Limit]
	}
	return json.Marshal(merged)
}

// IssueMove entspricht MCP-Tool devd_issue_move. Ziel-Projekt wird per ResolveProject
// (Slug/Prefix/id) auf die numerische id aufgelöst, wie es der move-Endpoint verlangt.
func (c *Client) IssueMove(args generated.IssueMoveArgs) (json.RawMessage, error) {
	target, err := c.ResolveProject(fmt.Sprintf("%v", args.TargetProject))
	if err != nil {
		return nil, err
	}
	issueID, err := c.ResolveIssueID(args.IdOrKey)
	if err != nil {
		return nil, err
	}
	return c.Do("POST", fmt.Sprintf("/api/backlog/%d/move", issueID), map[string]any{"target_project_id": target.ID})
}

// IssueDepRemove entspricht MCP-Tool devd_issue_dep_remove. Löst die Dependency-Edge-id
// intern auf (GET deps, blockers-Eintrag mit passender id, dann DELETE per dep_id).
func (c *Client) IssueDepRemove(args generated.IssueDepRemoveArgs) (json.RawMessage, error) {
	issueID, err := c.ResolveIssueID(args.IdOrKey)
	if err != nil {
		return nil, err
	}
	onID, err := c.ResolveIssueID(args.DependsOn)
	if err != nil {
		return nil, err
	}
	data, err := c.Do("GET", fmt.Sprintf("/api/backlog/%d/dependencies", issueID), nil)
	if err != nil {
		return nil, err
	}
	var deps struct {
		Blockers []struct {
			ID    int `json:"id"`
			DepID int `json:"dep_id"`
		} `json:"blockers"`
	}
	if err := json.Unmarshal(data, &deps); err != nil {
		return nil, err
	}
	depID, found := 0, false
	for _, b := range deps.Blockers {
		if b.ID == onID {
			depID, found = b.DepID, true
			break
		}
	}
	if !found {
		return nil, fmt.Errorf("Keine Dependency %s → %s", args.IdOrKey, args.DependsOn)
	}
	if _, err := c.Do("DELETE", fmt.Sprintf("/api/dependencies/%d", depID), nil); err != nil {
		return nil, err
	}
	return json.Marshal(map[string]any{"removed": true, "id_or_key": args.IdOrKey, "depends_on": args.DependsOn, "dep_id": depID})
}

// DocumentUpdate ist ebenfalls ein Multi-Call-Fall (owner-Fallback via projektweiter
// Dokument-Liste) — s. oben im Document-CRUD-Block.

// ---------------------------------------------------------------------------
// Parser-Limitationen (if/else-Branching, ArrayExpression-Body, untracked body-Identifier)
// — DD2-207.
// ---------------------------------------------------------------------------

// IssueList entspricht MCP-Tool devd_issue_list. sprint_key kennt einen Sonderwert
// "null"/"none" (unassigned-Filter) neben Key/id-Resolution — das if/else lehnt der
// Parser bewusst-konservativ ab (Sonderfall-Branching).
func (c *Client) IssueList(args generated.IssueListArgs) (json.RawMessage, error) {
	q := url.Values{}
	if args.SprintKey != nil {
		sk := *args.SprintKey
		if sk == "null" || sk == "none" {
			q.Set("sprint_id", "null")
		} else {
			id, err := c.ResolveSprintID(sk)
			if err != nil {
				return nil, err
			}
			q.Set("sprint_id", fmt.Sprintf("%d", id))
		}
	}
	if args.Status != nil {
		q.Set("status", *args.Status)
	}
	if args.Type != nil {
		q.Set("type", string(*args.Type))
	}
	if args.Search != nil {
		q.Set("search", *args.Search)
	}
	if args.Fields != nil {
		q.Set("fields", string(*args.Fields))
	}
	if args.Limit != nil {
		q.Set("limit", fmt.Sprintf("%d", *args.Limit))
	}
	if args.Offset != nil {
		q.Set("offset", fmt.Sprintf("%d", *args.Offset))
	}
	path := "/api/backlog"
	if len(q) > 0 {
		path += "?" + q.Encode()
	}
	return c.Do("GET", path, nil)
}

// IssueBulk entspricht MCP-Tool devd_issue_bulk. ids (Keys oder numerische ids) werden
// serverseitig resolved; payload wird je nach gesetzten Feldern generisch gebaut (Backend
// interpretiert nur die zur action passenden Felder).
func (c *Client) IssueBulk(args generated.IssueBulkArgs) (json.RawMessage, error) {
	numericIDs := make([]int, 0, len(args.Ids))
	for _, ref := range args.Ids {
		id, err := c.ResolveIssueID(fmt.Sprintf("%v", ref))
		if err != nil {
			return nil, err
		}
		numericIDs = append(numericIDs, id)
	}
	payload := map[string]any{}
	if args.Status != nil {
		payload["status"] = *args.Status
	}
	if args.Notes != nil {
		payload["notes"] = *args.Notes
	}
	if args.SprintKey != nil {
		if *args.SprintKey == "null" || *args.SprintKey == "none" {
			payload["sprint_id"] = nil
		} else {
			id, err := c.ResolveSprintID(*args.SprintKey)
			if err != nil {
				return nil, err
			}
			payload["sprint_id"] = id
		}
	}
	if args.Tags != nil {
		ids, err := c.resolveTagIDs(tagNamesFromAny(args.Tags))
		if err != nil {
			return nil, err
		}
		payload["tag_ids"] = ids
	}
	body := map[string]any{"ids": numericIDs, "action": string(args.Action), "payload": payload}
	return c.Do("PATCH", "/api/backlog/bulk", body)
}

// issueCreateFullResult formt die {id,key,status,assigned_sprint,item}-Antwort, geteilt
// zwischen IssueCreateFull und IssueBulkCreate (dessen Items dieselbe Erstell-Semantik haben).
func issueCreateFullResult(data []byte) (map[string]any, error) {
	var created struct {
		ID             int    `json:"id"`
		ProjectPrefix  string `json:"project_prefix"`
		ProjectNumber  int    `json:"project_number"`
		Status         string `json:"status"`
		AssignedSprint *int   `json:"assigned_sprint"`
	}
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return map[string]any{
		"id":              created.ID,
		"key":             fmt.Sprintf("%s-%d", created.ProjectPrefix, created.ProjectNumber),
		"status":          created.Status,
		"assigned_sprint": created.AssignedSprint,
	}, nil
}

// IssueCreateFull entspricht MCP-Tool devd_issue_create_full. Hat genau EINEN apiRequest-
// Call, aber zwei Mehr-Identifier-Guards (tag_ids: Array.isArray+length; status:
// target_status+sprintId), die der Single-Call-Generator bewusst-konservativ nicht
// erfasst und sonst UNCONDITIONAL emittieren würde (s. DD2-207-context_notes) — deshalb
// hier von Hand, Guards 1:1 aus devd-mcp.js portiert.
func (c *Client) IssueCreateFull(args generated.IssueCreateFullArgs) (json.RawMessage, error) {
	targetRefined := args.TargetStatus != nil && *args.TargetStatus == generated.IssueCreateFullArgsTargetStatusRefined
	if targetRefined && (args.Goal == nil || *args.Goal == "" || args.Background == nil || *args.Background == "") {
		return nil, fmt.Errorf("target_status=refined requires goal AND background")
	}
	var sprintID *int
	if args.SprintKey != nil {
		id, err := c.ResolveSprintID(*args.SprintKey)
		if err != nil {
			return nil, err
		}
		sprintID = &id
	}
	body := map[string]any{"title": args.Title, "type": string(args.Type)}
	if args.Priority != nil {
		body["priority"] = *args.Priority
	}
	if args.Goal != nil && *args.Goal != "" {
		body["goal"] = *args.Goal
	}
	if args.Background != nil && *args.Background != "" {
		body["background"] = *args.Background
	}
	if args.ContextNotes != nil && *args.ContextNotes != "" {
		body["context_notes"] = *args.ContextNotes
	}
	if args.RelevantFiles != nil && *args.RelevantFiles != "" {
		body["relevant_files"] = *args.RelevantFiles
	}
	if args.PoNotes != nil && *args.PoNotes != "" {
		body["po_notes"] = *args.PoNotes
	}
	if len(args.TagIds) > 0 {
		body["tag_ids"] = args.TagIds
	}
	if sprintID != nil {
		body["sprint_id"] = *sprintID
	}
	if targetRefined && sprintID == nil {
		body["status"] = "refined"
	}
	data, err := c.Do("POST", "/api/backlog", body)
	if err != nil {
		return nil, err
	}
	result, err := issueCreateFullResult(data)
	if err != nil {
		return nil, err
	}
	result["item"] = json.RawMessage(data)
	return json.Marshal(result)
}

// IssueBulkCreate entspricht MCP-Tool devd_issue_bulk_create. Jedes Item ist ein
// eigener atomarer POST (IssueCreateFull-Semantik); Item-Fehler sind non-fatal (Loop
// läuft weiter, Fehler landet als {index,error,title} im Result). ACHTUNG: die
// Feld-Inklusion je Item nutzt (anders als IssueCreateFull) `!== undefined`-Semantik
// statt Truthy — 1:1 aus devd-mcp.js portiert, kein Angleichen (bewusste Divergenz im
// Original).
func (c *Client) IssueBulkCreate(args generated.IssueBulkCreateArgs) (json.RawMessage, error) {
	type itemResult struct {
		Index          int    `json:"index"`
		ID             int    `json:"id,omitempty"`
		Key            string `json:"key,omitempty"`
		Status         string `json:"status,omitempty"`
		AssignedSprint *int   `json:"assigned_sprint,omitempty"`
		Error          string `json:"error,omitempty"`
		Title          string `json:"title,omitempty"`
	}
	results := make([]itemResult, 0, len(args.Issues))
	for i, it := range args.Issues {
		refined := it.TargetStatus != nil && *it.TargetStatus == generated.IssueBulkCreateArgsIssuesItemTargetStatusRefined
		if refined && (it.Goal == nil || *it.Goal == "" || it.Background == nil || *it.Background == "") {
			results = append(results, itemResult{Index: i, Error: "refined requires goal+background", Title: it.Title})
			continue
		}
		var sprintID *int
		if it.SprintKey != nil {
			id, err := c.ResolveSprintID(*it.SprintKey)
			if err != nil {
				results = append(results, itemResult{Index: i, Error: fmt.Sprintf("unresolved sprint_key=%s", *it.SprintKey), Title: it.Title})
				continue
			}
			sprintID = &id
		}
		body := map[string]any{"title": it.Title, "type": string(it.Type)}
		if it.Priority != nil {
			body["priority"] = *it.Priority
		}
		if it.Goal != nil {
			body["goal"] = *it.Goal
		}
		if it.Background != nil {
			body["background"] = *it.Background
		}
		if it.ContextNotes != nil {
			body["context_notes"] = *it.ContextNotes
		}
		if it.RelevantFiles != nil {
			body["relevant_files"] = *it.RelevantFiles
		}
		if it.PoNotes != nil {
			body["po_notes"] = *it.PoNotes
		}
		if len(it.TagIds) > 0 {
			body["tag_ids"] = it.TagIds
		}
		if sprintID != nil {
			body["sprint_id"] = *sprintID
		}
		if refined && sprintID == nil {
			body["status"] = "refined"
		}
		data, err := c.Do("POST", "/api/backlog", body)
		if err != nil {
			results = append(results, itemResult{Index: i, Error: err.Error(), Title: it.Title})
			continue
		}
		created, err := issueCreateFullResult(data)
		if err != nil {
			results = append(results, itemResult{Index: i, Error: err.Error(), Title: it.Title})
			continue
		}
		var assignedSprint *int
		if v, ok := created["assigned_sprint"].(*int); ok {
			assignedSprint = v
		}
		results = append(results, itemResult{
			Index:          i,
			ID:             created["id"].(int),
			Key:            created["key"].(string),
			Status:         created["status"].(string),
			AssignedSprint: assignedSprint,
		})
	}
	ok, failed := 0, 0
	for _, r := range results {
		if r.Error == "" {
			ok++
		} else {
			failed++
		}
	}
	out := map[string]any{
		"summary": map[string]any{"total": len(args.Issues), "ok": ok, "partial": 0, "failed": failed},
		"results": results,
	}
	return json.Marshal(out)
}

// ---------------------------------------------------------------------------
// Optional-Pointer-Pfad-Fall — DD2-207.
// ---------------------------------------------------------------------------

// ProjectMemoryAnchorPatch entspricht MCP-Tool devd_project_memory_anchor_patch. anchor
// steht im generierten Args-Typ als Pointer (Typmapping-Eigenheit trotz Pflichtfeld in
// Zod) — der Generator lehnt Pfad-Args, die optional/Pointer sind, aus Sicherheitsgründen
// ab (kein unsafe Deref). Hier explizit nil-geprüft statt dereferenziert.
func (c *Client) ProjectMemoryAnchorPatch(args generated.ProjectMemoryAnchorPatchArgs) (json.RawMessage, error) {
	if args.Anchor == nil || *args.Anchor == "" {
		return nil, fmt.Errorf("anchor is required")
	}
	body := map[string]any{}
	if args.Category != nil {
		body["category"] = *args.Category
	}
	if args.Summary != nil {
		body["summary"] = *args.Summary
	}
	if args.Content != nil {
		body["content"] = *args.Content
	}
	if args.Tags != nil {
		body["tags"] = args.Tags
	}
	if args.Importance != nil {
		body["importance"] = *args.Importance
	}
	if args.Pinned != nil {
		body["pinned"] = *args.Pinned
	}
	if args.Stability != nil {
		body["stability"] = *args.Stability
	}
	if args.SourceType != nil {
		body["source_type"] = *args.SourceType
	}
	if args.SourceRef != nil {
		body["source_ref"] = *args.SourceRef
	}
	return c.Do("PATCH", "/api/project-memories/anchor/"+url.PathEscape(*args.Anchor), body)
}
