package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
)

// deref liefert den String hinter einem *string (leer bei nil).
func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// oneline kollabiert Zeilenumbrüche für die Tabellenzelle.
func oneline(s string) string {
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "|", "\\|")
	return strings.TrimSpace(s)
}

// milestoneClip baut den Markdown-Kontext eines Meilensteins: Kopf + Sprint-Tabelle.
func milestoneClip(ms *api.Milestone) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Milestone M%d — %s\n\n", ms.ID, ms.Name)
	fmt.Fprintf(&b, "- Status: %s\n", ms.Status)
	if d := deref(ms.TargetDate); d != "" {
		fmt.Fprintf(&b, "- Target date: %s\n", d)
	}
	fmt.Fprintf(&b, "- Progress: %d/%d\n", ms.Done, ms.Total)
	if d := deref(ms.Description); d != "" {
		fmt.Fprintf(&b, "\n%s\n", d)
	}
	b.WriteString("\n| ID | Sprint | Title | Goal |\n|---|---|---|---|\n")
	for _, s := range ms.Sprints {
		fmt.Fprintf(&b, "| %d | %s | %s | %s |\n", s.ID, s.Key, oneline(s.Name), oneline(deref(s.Goal)))
	}
	return b.String()
}

// sprintClip baut den Markdown-Kontext eines Sprints: Kopf (inkl. numerischer
// ID + Key zur MCP/CLI-Identifikation, DD2-215) + Issue-Tabelle + angehängte
// Dokumente. docs darf nil/leer sein (dann keine Documents-Sektion).
func sprintClip(s *api.Sprint, docs []api.Document) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Sprint %s — %s\n\n", s.Key, s.Name)
	// DD2-215: ID + Key explizit, damit der PO den Sprint direkt via MCP/CLI
	// (`devd_sprint_context <id|key>`) ansprechen kann.
	fmt.Fprintf(&b, "- ID: %d\n", s.ID)
	fmt.Fprintf(&b, "- Key: %s\n", s.Key)
	fmt.Fprintf(&b, "- Status: %s\n", s.Status)
	if g := deref(s.Goal); g != "" {
		fmt.Fprintf(&b, "- Goal: %s\n", g)
	}
	fmt.Fprintf(&b, "- Progress: %d/%d\n", s.DoneCount, s.ItemCount)
	b.WriteString("\n## Issues\n\n")
	b.WriteString("| ID | Key | Title | Goal | Background |\n|---|---|---|---|---|\n")
	for _, it := range s.Items {
		fmt.Fprintf(&b, "| %d | %s | %s | %s | %s |\n",
			it.ID, it.Key, oneline(it.Title), oneline(deref(it.Goal)), oneline(deref(it.Background)))
	}
	b.WriteString(sprintDocsSection(docs))
	return b.String()
}

// sprintDocsSection rendert die an den Sprint angehängten Dokumente als Markdown
// (Titel + Status + voller Body) für den Yank-Kontext (DD2-215). Leere Liste →
// leerer String (keine Sektion).
func sprintDocsSection(docs []api.Document) string {
	if len(docs) == 0 {
		return ""
	}
	var b strings.Builder
	fmt.Fprintf(&b, "\n## Documents (%d)\n", len(docs))
	for _, d := range docs {
		fmt.Fprintf(&b, "\n### %s", d.Title)
		if d.Status != "" {
			fmt.Fprintf(&b, "  _(%s)_", d.Status)
		}
		b.WriteString("\n")
		if strings.TrimSpace(d.Body) != "" {
			fmt.Fprintf(&b, "\n%s\n", d.Body)
		}
	}
	return b.String()
}

// backlogClip baut den Markdown-Export der aktuellen (gefilterten/sortierten)
// Backlog-Sicht (DD2-217): Kopf mit Issue-Zahl + optionaler Filter-Zeile, darunter
// eine Issue-Tabelle. Spalten spiegeln die in der Liste sichtbaren Felder
// (Key/Type/Prio/Status/Title) plus PO-Notes — der PO-Freitext, der beschreibt,
// was das Problem ist (DD2-217-Refinement). Priority als Plain "P<n>" (kein ANSI).
// Schwester von sprintClip/milestoneClip, aber für die flache Liste.
func backlogClip(vis []api.Issue, filterSummary string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Backlog (%d issues)\n\n", len(vis))
	if filterSummary != "" {
		fmt.Fprintf(&b, "- Filter: %s\n\n", filterSummary)
	}
	b.WriteString("| Key | Type | Prio | Status | Title | PO-Notes |\n|---|---|---|---|---|---|\n")
	for _, it := range vis {
		fmt.Fprintf(&b, "| %s | %s | P%d | %s | %s | %s |\n",
			it.Key, it.Type, it.Priority, it.Status, oneline(it.Title), oneline(deref(it.PoNotes)))
	}
	return b.String()
}
