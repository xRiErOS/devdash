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
	fmt.Fprintf(&b, "# Meilenstein M%d — %s\n\n", ms.ID, ms.Name)
	fmt.Fprintf(&b, "- Status: %s\n", ms.Status)
	if d := deref(ms.TargetDate); d != "" {
		fmt.Fprintf(&b, "- Ziel-Datum: %s\n", d)
	}
	fmt.Fprintf(&b, "- Fortschritt: %d/%d\n", ms.Done, ms.Total)
	if d := deref(ms.Description); d != "" {
		fmt.Fprintf(&b, "\n%s\n", d)
	}
	b.WriteString("\n| ID | Sprint | Titel | Goal |\n|---|---|---|---|\n")
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
	fmt.Fprintf(&b, "- Fortschritt: %d/%d\n", s.DoneCount, s.ItemCount)
	b.WriteString("\n| ID | Kennung | Titel | Goal | Background | Ergebnisse |\n|---|---|---|---|---|---|\n")
	for _, it := range s.Items {
		fmt.Fprintf(&b, "| %d | %s | %s | %s | %s | %s |\n",
			it.ID, it.Key, oneline(it.Title), oneline(deref(it.Goal)), oneline(deref(it.Background)), resultMark(it))
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
