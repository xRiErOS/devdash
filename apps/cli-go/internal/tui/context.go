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

// sprintClip baut den Markdown-Kontext eines Sprints: Kopf + Issue-Tabelle.
func sprintClip(s *api.Sprint) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Sprint %s — %s\n\n", s.Key, s.Name)
	fmt.Fprintf(&b, "- Status: %s\n", s.Status)
	if g := deref(s.Goal); g != "" {
		fmt.Fprintf(&b, "- Goal: %s\n", g)
	}
	fmt.Fprintf(&b, "- Progress: %d/%d\n", s.DoneCount, s.ItemCount)
	b.WriteString("\n| ID | Key | Title | Goal | Background | Results |\n|---|---|---|---|---|---|\n")
	for _, it := range s.Items {
		fmt.Fprintf(&b, "| %d | %s | %s | %s | %s | %s |\n",
			it.ID, it.Key, oneline(it.Title), oneline(deref(it.Goal)), oneline(deref(it.Background)), resultMark(it))
	}
	return b.String()
}

// backlogClip baut den Markdown-Export der aktuellen (gefilterten/sortierten)
// Backlog-Sicht (DD2-217): Kopf mit Issue-Zahl + optionaler Filter-Zeile, darunter
// eine Issue-Tabelle. Spalten spiegeln die in der Liste sichtbaren Felder
// (Key/Type/Prio/Status/Title) — Priority als Plain "P<n>" (kein ANSI). Schwester
// von sprintClip/milestoneClip, aber für die flache Liste.
func backlogClip(vis []api.Issue, filterSummary string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Backlog (%d issues)\n\n", len(vis))
	if filterSummary != "" {
		fmt.Fprintf(&b, "- Filter: %s\n\n", filterSummary)
	}
	b.WriteString("| Key | Type | Prio | Status | Title |\n|---|---|---|---|---|\n")
	for _, it := range vis {
		fmt.Fprintf(&b, "| %s | %s | P%d | %s | %s |\n",
			it.Key, it.Type, it.Priority, it.Status, oneline(it.Title))
	}
	return b.String()
}

// resultMark ist die Text-Variante des Ergebnis-Indikators für Clipboard/Markdown
// (✓ result vorhanden, ✗ fehlt) — spiegelt den Dot aus der TUI (I01).
func resultMark(it api.Issue) string {
	if strings.TrimSpace(deref(it.Result)) != "" {
		return "✓"
	}
	return "✗"
}
