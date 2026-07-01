package tui

import keybind "github.com/charmbracelet/bubbles/key"

// keyMap ist die zentrale, typisierte Single-Source aller TUI-Keybindings (DD2-47).
// Vorher lagen die Tasten als Roh-String-Literale über app.go/view_browse_project.go/view_detail_issue.go/…
// verstreut, dazu eine separate navKey()-Normalisierung. Jetzt gilt:
//
//   - navKey() leitet die Richtungs-Normalisierung aus Up/Down/Left/Right ab,
//   - die In-App-Hilfe (DD2-31) und die externe Doku (DD2-5) generieren aus Help(),
//   - die jkli-Umstellung (DD2-34) ändert nur noch die Keys() hier an einer Stelle.
//
// Help.Key dient als Anzeige-Label (z.B. "i/k/j/l"), Help.Desc als Beschreibung.
type keyMap struct {
	// Richtungskreuz (von navKey ausgewertet — hier liegt die hjkl-/jkli-Wahrheit).
	Up    keybind.Binding
	Down  keybind.Binding
	Left  keybind.Binding
	Right keybind.Binding

	// Aktivierung / Rückkehr / global.
	Enter   keybind.Binding
	Back    keybind.Binding // esc
	Quit    keybind.Binding // q / ctrl+c
	Help    keybind.Binding // ? (DD2-31)
	Palette keybind.Binding // ctrl+k / K
	Picker  keybind.Binding // p
	Reviews keybind.Binding // R
	Backlog keybind.Binding // b
	Search  keybind.Binding // /
	Filter  keybind.Binding // f
	Yank    keybind.Binding // y
	Refresh keybind.Binding // ctrl+r (DD2-72: manueller Daten-Reload)
	Editor  keybind.Binding // ctrl+e (DD2-224: Langtext-editField im $EDITOR bearbeiten)
	Section keybind.Binding // 1…9 (Accordion-Section)

	// Kontext-Aktionen (DD2-173). s ist global (alle Node-Typen), S=Sort,
	// a=global Assign (m entfällt), c=global Create, X=Filter-Clear.
	// MileStatus/AssignMile sind in Status/Assign aufgegangen.
	Status      keybind.Binding // s (Status — alle Node-Typen)
	Sort        keybind.Binding // S (Sortierung)
	Assign      keybind.Binding // a (Assign — global)
	Create      keybind.Binding // c (Create — global)
	Delete      keybind.Binding // d (Cascade-Delete)
	Toggle      keybind.Binding // space / x (Facette an/aus)
	FilterClear keybind.Binding // X (Filter zurücksetzen)
	Tags        keybind.Binding // T (Tag-Manager, DD2-75)
	TagAssign   keybind.Binding // t (Tags zuweisen)
	Rename      keybind.Binding // r (DD2-252: Dokument-Dateiname umbenennen, nur Docs-View)

	// Review-Cockpit (DD2-173). Vorher rohe String-Literale in keys_review.go —
	// jetzt Teil der Single-Source.
	ReviewPass     keybind.Binding // a — pass verdict
	ReviewReject   keybind.Binding // x — reject + comment
	ReviewReopen   keybind.Binding // o — reopen issue
	ReviewRework   keybind.Binding // w — rework issue
	ReviewPass2    keybind.Binding // P — mark review pass
	SprintComplete keybind.Binding // C — complete sprint

	// User-Story (DD2-173). Reject auf x (aligned mit ReviewReject, statt r).
	StoryAccept keybind.Binding // a — accept story
	StoryReject keybind.Binding // x — reject story
	StoryReset  keybind.Binding // o — reset story
}

// newKeyMap liefert die aktuell aktive Tastenbelegung. Das Richtungskreuz nutzt
// das jkli-Layout (DD2-34): i=hoch, j=links/zurück, k=runter, l=rechts/rein
// (inverted-T um den rechten Zeigefinger). 'h' ist damit frei. Die Pfeiltasten
// bleiben in jeder Variante zweite Bindung (DD2-71) — alle Handler routen über
// navKey, daher genügt diese eine Stelle für die komplette Umstellung.
func newKeyMap() keyMap {
	return keyMap{
		Up:    keybind.NewBinding(keybind.WithKeys("up", "i"), keybind.WithHelp("↑/i", "up")),
		Down:  keybind.NewBinding(keybind.WithKeys("down", "k"), keybind.WithHelp("↓/k", "down")),
		Left:  keybind.NewBinding(keybind.WithKeys("left", "j"), keybind.WithHelp("←/j", "back/out")),
		Right: keybind.NewBinding(keybind.WithKeys("right", "l", "tab"), keybind.WithHelp("→/l", "in/expand")),

		Enter:   keybind.NewBinding(keybind.WithKeys("enter"), keybind.WithHelp("enter", "open/confirm")),
		Back:    keybind.NewBinding(keybind.WithKeys("esc"), keybind.WithHelp("esc", "back")),
		Quit:    keybind.NewBinding(keybind.WithKeys("q", "ctrl+c"), keybind.WithHelp("q", "quit")),
		Help:    keybind.NewBinding(keybind.WithKeys("?"), keybind.WithHelp("?", "help")),
		Palette: keybind.NewBinding(keybind.WithKeys("ctrl+k", "K"), keybind.WithHelp("ctrl+k", "Command-Center")),
		Picker:  keybind.NewBinding(keybind.WithKeys("p"), keybind.WithHelp("p", "Select project")),
		Reviews: keybind.NewBinding(keybind.WithKeys("R"), keybind.WithHelp("R", "Review-Cockpit")),
		Backlog: keybind.NewBinding(keybind.WithKeys("b"), keybind.WithHelp("b", "Backlog")),
		Search:  keybind.NewBinding(keybind.WithKeys("/"), keybind.WithHelp("/", "Search")),
		Filter:  keybind.NewBinding(keybind.WithKeys("f"), keybind.WithHelp("f", "Filter")),
		Yank:    keybind.NewBinding(keybind.WithKeys("y"), keybind.WithHelp("y", "Copy context")),
		Refresh: keybind.NewBinding(keybind.WithKeys("ctrl+r"), keybind.WithHelp("ctrl+r", "Reload data")),
		Editor:  keybind.NewBinding(keybind.WithKeys("ctrl+e"), keybind.WithHelp("ctrl+e", "Edit in $EDITOR")),
		Section: keybind.NewBinding(keybind.WithKeys("1", "2", "3", "4", "5", "6", "7", "8", "9"), keybind.WithHelp("1…9", "Section")),

		Status:      keybind.NewBinding(keybind.WithKeys("s"), keybind.WithHelp("s", "Status (all)")),
		Sort:        keybind.NewBinding(keybind.WithKeys("S"), keybind.WithHelp("S", "Sort")),
		Assign:      keybind.NewBinding(keybind.WithKeys("a"), keybind.WithHelp("a", "Assign")),
		Create:      keybind.NewBinding(keybind.WithKeys("c"), keybind.WithHelp("c", "Create")),
		Delete:      keybind.NewBinding(keybind.WithKeys("d"), keybind.WithHelp("d", "delete (cascade)")),
		Toggle:      keybind.NewBinding(keybind.WithKeys(" ", "x"), keybind.WithHelp("space/x", "Toggle facet")),
		FilterClear: keybind.NewBinding(keybind.WithKeys("X"), keybind.WithHelp("X", "Clear filters")),
		Tags:        keybind.NewBinding(keybind.WithKeys("T"), keybind.WithHelp("T", "Tag-Manager")),
		TagAssign:   keybind.NewBinding(keybind.WithKeys("t"), keybind.WithHelp("t", "Assign tags")),
		Rename:      keybind.NewBinding(keybind.WithKeys("r"), keybind.WithHelp("r", "Rename file (Docs)")),

		// Review-Cockpit (DD2-173).
		ReviewPass:     keybind.NewBinding(keybind.WithKeys("a"), keybind.WithHelp("a", "Pass verdict")),
		ReviewReject:   keybind.NewBinding(keybind.WithKeys("x"), keybind.WithHelp("x", "Reject + comment")),
		ReviewReopen:   keybind.NewBinding(keybind.WithKeys("o"), keybind.WithHelp("o", "Reopen issue")),
		ReviewRework:   keybind.NewBinding(keybind.WithKeys("w"), keybind.WithHelp("w", "Rework issue")),
		ReviewPass2:    keybind.NewBinding(keybind.WithKeys("P"), keybind.WithHelp("P", "Mark review pass")),
		SprintComplete: keybind.NewBinding(keybind.WithKeys("C"), keybind.WithHelp("C", "Complete sprint")),

		// User-Story (DD2-173).
		StoryAccept: keybind.NewBinding(keybind.WithKeys("a"), keybind.WithHelp("a", "Accept story")),
		StoryReject: keybind.NewBinding(keybind.WithKeys("x"), keybind.WithHelp("x", "Reject story")),
		StoryReset:  keybind.NewBinding(keybind.WithKeys("o"), keybind.WithHelp("o", "Reset story")),
	}
}

// keys ist die prozessweit aktive Keymap (Single-Source). Tests können sie nicht
// mutieren — die jkli-Wahl (DD2-34) lebt komplett in newKeyMap.
var keys = newKeyMap()

// helpGroup ist ein benannter Block der Shortcut-Übersicht (DD2-31/DD2-5).
type helpGroup struct {
	title    string
	bindings []keybind.Binding
}

// helpGroups liefert die Keymap gruppiert für die In-App-Hilfe (DD2-31) und die
// externe Doku (DD2-5). Damit sind Anzeige und Doku aus derselben Quelle
// generiert — kein händisches Nachpflegen von Hint-Strings mehr.
func (k keyMap) helpGroups() []helpGroup {
	return []helpGroup{
		{"Navigation", []keybind.Binding{k.Up, k.Down, k.Left, k.Right, k.Enter, k.Back, k.Section}},
		{"Views & Global", []keybind.Binding{k.Backlog, k.Reviews, k.Picker, k.Tags, k.Search, k.Filter, k.FilterClear, k.Refresh, k.Palette, k.Help, k.Quit}},
		{"Actions", []keybind.Binding{k.Status, k.Sort, k.Assign, k.Create, k.TagAssign, k.Delete, k.Yank, k.Toggle, k.Rename}},
		{"Review", []keybind.Binding{k.ReviewPass, k.ReviewReject, k.ReviewReopen, k.ReviewRework, k.ReviewPass2, k.SprintComplete}},
	}
}

// bindHas meldet, ob die Taste k Teil der Bindung b ist (ANSI-/case-genau).
func bindHas(b keybind.Binding, k string) bool {
	for _, v := range b.Keys() {
		if v == k {
			return true
		}
	}
	return false
}

// navKey normalisiert eine Roh-Taste auf eine kanonische Richtung
// ("up"/"down"/"left"/"right") anhand der zentralen Keymap. Tasten ohne
// Richtungsbezug werden unverändert durchgereicht. Damit unterstützt jeder
// Handler, der über navKey routet, automatisch Pfeiltasten UND die vi-Tasten
// gleichermaßen (DD2-71) — und folgt jeder jkli-Umstellung (DD2-34) ohne Edit.
func navKey(k string) string {
	switch {
	case bindHas(keys.Up, k):
		return "up"
	case bindHas(keys.Down, k):
		return "down"
	case bindHas(keys.Left, k):
		return "left"
	case bindHas(keys.Right, k):
		return "right"
	}
	return k
}
