package tui

import (
	"devd-cli/internal/api"
	"devd-cli/internal/config"
	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/huh"
)

type viewID int

const (
	viewPicker viewID = iota
	viewColumns
	viewDetail
	viewBacklog
	viewReview
	viewMilestone
	viewSprint
	viewReviewsList
	viewMemory
	viewTree // DD2-57: Tree+Detail-Layout-Prototyp
	viewTags // DD2-75: Tag-Manager (projektweite Tag-CRUD)
)

// filterState hält pro Spalte, welche Werte ausgeblendet sind.
type filterState struct {
	hidden map[string]bool
}

func (f filterState) shown(val string) bool { return !f.hidden[val] }
func (f *filterState) toggle(val string)    { f.hidden[val] = !f.hidden[val] }

const deferredKey = "__deferred__" // Pseudo-Wert: zurückgestellte Meilensteine zeigen

type filterOpt struct {
	value string
	label string
}

type model struct {
	client  *api.Client // projekt-gescopt (nil bis Picker-Wahl)
	global  *api.Client // projekt-los (ListProjects)
	project *api.Project

	cfg config.Settings // DD2-40: TUI-Settings (YAML), in Run() geladen/angewendet

	view          viewID
	width, height int
	err           error
	status        string // Info/Meldungen (Footer-Zone 4 links, Blue)
	statusSeq     int    // DD2-35: Generation des aktuellen Status — Auto-Clear-Tick feuert nur, wenn die Generation noch stimmt
	errNote       string // transienter, nicht-fataler Fehler (Footer-Zone 4 rechts, Red) — DD2-60
	scroll        int    // Scroll-Offset für statische Detail-Views (DD2-25/30 Chrome)

	// Picker
	projects []api.Project
	plist    listState

	// Columns (Meilenstein → Sprint → Issue)
	milestones []api.Milestone
	mlist      listState
	slist      listState
	ilist      listState
	curSprint  *api.Sprint // geladene items des selektierten Sprints
	depth      int         // Fokus-Ebene 0=Meilenstein 1=Sprint 2=Issue

	// Filter (Default-Hide + f-Modal)
	fMile, fSprint, fIssue filterState
	filtering              bool
	fcur                   listState
	fopts                  []filterOpt
	ftarget                int // depth, dessen Filter editiert wird

	// Backlog
	backlog []api.Issue
	blist   listState

	// Review-Cockpit (über curSprint.Items)
	rlist           listState
	inputting       bool   // Reject-Kommentar-Eingabe aktiv
	input           string // Kommentar-Puffer
	confirmComplete bool   // Doppel-C-Bestätigung für Sprint-Abschluss
	statusPick      bool   // s: Issue-Status-Menü aktiv (Cockpit + Columns/Detail, DD2-29)
	stIssueID       int    // Ziel-Issue des Status-Menüs
	stIssueStatus   string // aktueller Status des Ziel-Issues (Menü-Kopf)
	stSprintID      int    // Sprint-Kontext für Refresh (0 = keiner)
	smenu           listState
	sopts           []string
	sprintPick      bool // Sprint-Status-Menü aktiv (Cockpit S / Columns s, T05)
	spmenu          listState
	spopts          []string
	spTargetID      int    // Ziel-Sprint des Status-Menüs (Cockpit oder Columns)
	spCurStatus     string // aktueller Status des Ziel-Sprints (Menü-Kopf)

	// User-Story-Abnahme-Modal (T14): enter im Review öffnet goal/background/US.
	usOpen    bool
	usList    []api.UserStory
	uslist    listState
	usIssueID int

	// Reviews-Page (T17): R öffnet zuerst die Liste offener Review-Sprints.
	reviewSprints []api.Sprint
	rvlist        listState
	reviewReturn  viewID // wohin Cockpit-q/esc zurückkehrt (Liste vs. Columns)
	// topReturn = Heimat-View für Backlog/Reviews-Liste-q/esc. Da Tree jetzt Primat
	// ist (DD2-61), merkt sich der Einstieg, ob aus Tree oder Columns gekommen — sonst
	// landet man immer in den Columns. Wird beim Öffnen auf die Quell-View gesetzt.
	topReturn viewID

	// Meilenstein-Status-Menü (T01): S auf fokussiertem Meilenstein. Ziel-Daten
	// werden beim Öffnen kopiert (nicht aus selMilestone re-gelesen), damit das Menü
	// auch aus dem Tree-View funktioniert, wo der Columns-Cursor woanders steht.
	msPick             bool
	msmenu             listState
	msopts             []string
	msTargetID         int
	msTargetName       string
	msTargetStatus     string
	msTargetOpenSprint int

	// Sprint→Meilenstein-Picker (T03 Flow A): m in Sprint-Details (single-select).
	smPick     bool
	smSprintID int
	smMenu     listState
	smOpts     []smOpt

	// Meilenstein→Sprints-Zuweisung (T03 Flow B): a in Meilenstein-Detail (Checkliste).
	maPick        bool
	maMilestoneID int
	maSprints     []api.Sprint
	maChecked     map[int]bool
	maMenu        listState

	// Quit-Bestätigung (DD2-49): q/ctrl+c auf einem Top-Level-View.
	confirmQuit bool

	// In-App-Hilfe (DD2-31): ? öffnet die Shortcut-Übersicht (Overlay).
	helpOpen bool

	// Cascade-Delete-Confirm (T02b): d auf Meilenstein/Sprint.
	delConfirm bool
	delKind    string // milestone | sprint
	delID      int
	delName    string
	delLoading bool // wartet auf Preview-Counts
	delSprints int
	delIssues  int
	delDocs    int

	// Meilenstein-Cascade-Complete-Confirm (DD2-28): completed mit offenen Sprints.
	mcConfirm bool
	mcID      int
	mcName    string
	mcSprints int

	// Memory-Browser (T18): Master-Detail über project_memories.
	memList      []api.ProjectMemory
	memlist      listState
	memDetail    *api.ProjectMemory // full (content) des selektierten Memorys
	memDetailID  int
	memSearching bool
	memQuery     string
	memCat       string // aktiver Kategorie-Filter ("" = alle)

	// Command-Center (T16): globales Action-Palette-Modal (ctrl+k / shift+k).
	paletteOpen bool
	palQuery    string
	palList     listState

	// Eingebettetes huh-Create-Formular (T16). nil = inaktiv.
	form     *huh.Form
	formKind string // issue | milestone | sprint | memory | result

	// Multi-Tab-Forms (DD2-36): Tab-Strip für mehrblättrige Create-Formulare.
	// formGroupTitles != nil → Tab-Strip sichtbar. formGroupIdx = aktiver Tab (0-basiert).
	// formPartials speichert Werte der abgeschlossenen Tabs bis zum letzten Submit.
	formGroupIdx    int
	formGroupTitles []string
	formPartials    map[string]string

	// Ziel des result-Formulars (I02): r im Cockpit füllt das Ergebnisfeld.
	resultIssueID  int
	resultIssueKey string
	resultSprintID int

	// Tree+Detail-Layout-Prototyp (DD2-57): t aus den Columns. Expansions-Sets +
	// Lazy-Issue-Cache pro Sprint; treeCursor läuft über die geflachte Knotenliste.
	treeExpMile   map[int]bool
	treeExpSprint map[int]bool
	treeIssues    map[int][]api.Issue
	treeCursor    int
	// accOpen = aktuell offene Accordion-Section im Issue-Detail (DD2-50), 1-basiert,
	// 0 = keine offen. Exklusiv (max. eine offen); Ziffer toggelt. Default 1.
	accOpen int

	// Detail-Fokus-Maschine (DD2-76): enter/l auf einem Issue-Knoten verlagert den
	// Fokus aus dem Tree in die Detail-Pane (detailFocus). Dort wird zwei-stufig
	// navigiert: detailLevel 0 = Section-Ebene (secCursor wählt die Accordion-
	// Section), 1 = Feld-Ebene (fieldCursor wählt das editierbare Feld der offenen
	// Section). Read-only — der Schreibpfad folgt in DD2-77. Klemmen wie treeCursor.
	detailFocus bool
	detailLevel int // 0 = Section, 1 = Feld
	secCursor   int // index in focusSections (0 = Übersicht/Kopf, 1.. = Accordion)
	fieldCursor int // index in der aktiven Section.fields

	// Issue-Feld-Edit (DD2-77): enter auf einem fokussierten Feld öffnet die
	// editField-huh-Form; Submit schreibt EIN Feld via UpdateIssue, die Response
	// merged die Kern-Spalten in-place in den Cache (D04/D05). Meilenstein/Sprint
	// folgen in DD2#13.
	editEntity string // "issue"
	editID     int
	editField  string // Contract-Feldname (issueUpdateContract)
	editLabel  string
	editEditor string // input | text | select
	editValue  string // aktueller Wert (Form-Preset)

	// Tree-Suche (DD2-62): `/` öffnet das Suchfeld im Tree-Kopf, tippen filtert live.
	// treeSearching = Eingabe fokussiert; treeQuery = aktiver Filter (auch nach enter).
	treeSearch    textinput.Model
	treeSearching bool
	treeQuery     string

	// Project-Switch-Picker (DD2-41): p öffnet eine suchbare Projektliste aus jedem View.
	// projectSearch ist immer fokussiert, solange viewPicker aktiv ist.
	projectSearch textinput.Model
	projectQuery  string

	// Tree-Filter (DD2-62 Rework): `f` öffnet ein Facetten-Menü (Art/Issue-Type/
	// Status), kombinierbar mit der Textsuche. Bei aktivem Filter wird projektweit
	// gefiltert → alle Issues werden einmal nach treeFilterIssues geladen.
	treeFilterOpen   bool
	fArt             map[treeKind]bool
	fType            map[string]bool
	fStatus          map[string]bool
	ffMenu           listState
	ffItems          []ffItem
	treeFilterIssues []api.Issue
	treeIssuesLoaded bool

	// Tag-Manager (DD2-75): T öffnet viewTags — projektweite Tag-CRUD-Liste.
	// n=neu, e=edit, d=löschen (Confirm), esc/q zurück zur Quell-View (tagReturn).
	tags         []api.Tag
	taglist      listState
	tagReturn    viewID // Heimat-View für viewTags-esc/q
	tagEditID    int    // Ziel-Tag des edit-Formulars (0 = create)
	tagDelID     int    // Ziel-Tag des Lösch-Confirms
	tagDelName   string
	tagDelUsage  int
	tagDelConfNo bool // Lösch-Confirm offen

	// Tag-Picker (DD2-33): g öffnet ein Checkbox-Overlay über die Projekt-Tags für
	// das fokussierte Issue/Sprint/Meilenstein. Vorbelegung = aktuelle Tags der
	// Entität; enter ruft Set{Issue,Sprint,Milestone}Tags (vollständiger Replace).
	tagPick        bool
	tagPickKind    string // issue | sprint | milestone
	tagPickID      int
	tagPickLabel   string
	tagPickAll     []api.Tag
	tagPickChecked map[int]bool
	tagPickMenu    listState
	tagPickLoaded  bool // alle Tags geladen (sonst „lädt …")
}

// issueStatusOptions sind die manuell wählbaren Lifecycle-Ziele. Bewusst OHNE
// passed/rejected/done: passed/rejected MÜSSEN über das Review-Verdikt (a/x)
// laufen, das eine review_feedback-Zeile schreibt — sonst blockiert der
// Sprint-Abschluss (Backend-Gate prüft review_feedback, nicht den Status).
// done ist system-only (nur via Sprint-Complete). Backend validiert zusätzlich.
var issueStatusOptions = []string{"refined", "planned", "in_progress", "to_review"}

// issueTransitions spiegelt lifecycle.js (canTransition) — nur die manuell
// relevanten Vorwärts-/Reopen-Kanten. passed/rejected→via Verdikt, done=system.
var issueTransitions = map[string][]string{
	"new":         {"refined"},
	"refined":     {"new", "planned"},
	"planned":     {"refined", "in_progress"},
	"in_progress": {"to_review", "planned"},
	"to_review":   {"planned"}, // passed/rejected nur über Verdikt
	"rejected":    {"in_progress", "planned"},
	"passed":      {"planned"}, // Reopen für nächsten Sprint
	"done":        {"planned"},
	"cancelled":   {"refined"},
}

// milestoneTransitions spiegelt canMilestoneTransition (lifecycle.js, forward-only).
// cancelled ausgelassen (braucht cancellation_notes) — analog Sprint-Menü.
// active→completed gated das Backend (alle Sprints terminal) → kommt als Hinweis zurück.
var milestoneTransitions = map[string][]string{
	"planning":  {"active"},
	"active":    {"completed"},
	"completed": {"active"}, // sanktionierter Reopen (DD-357)
	"cancelled": {"planning"},
}

// sprintTransitions spiegelt canSprintTransition (lifecycle.js). completed läuft
// über den dedizierten /complete-Endpoint (eigener Menüpunkt mit Gate), cancelled
// braucht Notes → hier ausgelassen.
var sprintTransitions = map[string][]string{
	"planning":  {"active"},
	"active":    {"review", "planning"},
	"review":    {"active", "completed"},
	"completed": {},
	"closed":    {},
	"cancelled": {"planning"},
}

// allowedManualStatuses liefert die vom aktuellen Status erlaubten manuellen
// Ziele (Schnitt aus Lifecycle-Kanten und issueStatusOptions) — verhindert, dass
// das Menü ungültige Übergänge (z.B. passed→to_review) anbietet.
func allowedManualStatuses(from string) []string {
	allowed := map[string]bool{}
	for _, t := range issueTransitions[from] {
		allowed[t] = true
	}
	var out []string
	for _, s := range issueStatusOptions {
		if allowed[s] {
			out = append(out, s)
		}
	}
	return out
}
