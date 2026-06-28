package tui

import keybind "github.com/charmbracelet/bubbles/key"

// keyMap ist die zentrale, typisierte Single-Source aller TUI-Keybindings (DD2-47).
// Vorher lagen die Tasten als Roh-String-Literale über app.go/tree.go/detail.go/…
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
	Section keybind.Binding // 1…9 (Accordion-Section)

	// Kontext-Aktionen (Status/Zuweisung/Löschen/Toggle).
	Status       keybind.Binding // s (Issue-/Sprint-Status)
	MileStatus   keybind.Binding // S (Meilenstein-Status)
	AssignMile   keybind.Binding // m (Sprint → Meilenstein)
	AssignSprint keybind.Binding // a (Sprints → Meilenstein)
	Delete       keybind.Binding // d (Cascade-Delete)
	Toggle       keybind.Binding // space / x (Facette an/aus)
	Tags         keybind.Binding // T (Tag-Manager, DD2-75)
	TagAssign    keybind.Binding // g (Tags zuweisen, DD2-33)
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
		Section: keybind.NewBinding(keybind.WithKeys("1", "2", "3", "4", "5", "6", "7", "8", "9"), keybind.WithHelp("1…9", "Section")),

		Status:       keybind.NewBinding(keybind.WithKeys("s"), keybind.WithHelp("s", "Status (Issue/Sprint)")),
		MileStatus:   keybind.NewBinding(keybind.WithKeys("S"), keybind.WithHelp("S", "Milestone status")),
		AssignMile:   keybind.NewBinding(keybind.WithKeys("m"), keybind.WithHelp("m", "Sprint → milestone")),
		AssignSprint: keybind.NewBinding(keybind.WithKeys("a"), keybind.WithHelp("a", "Assign sprints")),
		Delete:       keybind.NewBinding(keybind.WithKeys("d"), keybind.WithHelp("d", "delete (cascade)")),
		Toggle:       keybind.NewBinding(keybind.WithKeys(" ", "x"), keybind.WithHelp("space/x", "Toggle facet")),
		Tags:         keybind.NewBinding(keybind.WithKeys("T"), keybind.WithHelp("T", "Tag-Manager")),
		TagAssign:    keybind.NewBinding(keybind.WithKeys("t"), keybind.WithHelp("t", "Assign tags")),
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
		{"Views & Global", []keybind.Binding{k.Backlog, k.Reviews, k.Picker, k.Tags, k.Search, k.Filter, k.Refresh, k.Palette, k.Help, k.Quit}},
		{"Actions", []keybind.Binding{k.Status, k.MileStatus, k.AssignMile, k.AssignSprint, k.TagAssign, k.Delete, k.Yank, k.Toggle}},
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
