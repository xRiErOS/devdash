package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// DD2-163: Foundation-Client-Tests (documents/user_notes/sstd/todos) gegen einen
// httptest-Server. Verifiziert Pfad, Methode, Body-Mapping und Response-Unmarshal.

func newTestClient(t *testing.T, handler http.HandlerFunc) *Client {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	t.Setenv("DEVD_API_URL", srv.URL)
	t.Setenv("DEVD_PROJECT_ID", "10")
	t.Setenv("DEVD_API_TOKEN", "")
	return NewClient("")
}

func TestDocumentsClient(t *testing.T) {
	var gotMethod, gotPath string
	var gotBody map[string]any
	c := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		gotMethod, gotPath = r.Method, r.URL.Path
		if r.Body != nil {
			b, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(b, &gotBody)
		}
		switch {
		case gotMethod == "GET" && gotPath == "/api/milestones/45/documents":
			w.Write([]byte(`[{"id":1,"milestone_id":45,"sprint_id":null,"title":"Plan","body":"x","file_path":null,"created_at":"t","updated_at":"t"}]`))
		case gotMethod == "POST" && gotPath == "/api/sprints/293/documents":
			w.WriteHeader(201)
			w.Write([]byte(`{"id":2,"sprint_id":293,"title":"New","body":"b"}`))
		case gotMethod == "DELETE":
			w.WriteHeader(204)
		default:
			w.Write([]byte(`{}`))
		}
	})

	docs, err := c.ListDocuments("milestone", 45)
	if err != nil || len(docs) != 1 || docs[0].MilestoneID == nil || *docs[0].MilestoneID != 45 {
		t.Fatalf("ListDocuments: %v %+v", err, docs)
	}
	if gotPath != "/api/milestones/45/documents" {
		t.Fatalf("path = %s", gotPath)
	}

	body := "b"
	created, err := c.CreateDocument("sprint", 293, DocumentBody{Title: "New", Body: &body})
	if err != nil || created.ID != 2 {
		t.Fatalf("CreateDocument: %v %+v", err, created)
	}
	if gotMethod != "POST" || gotBody["title"] != "New" || gotBody["body"] != "b" {
		t.Fatalf("create body wrong: %v %v", gotMethod, gotBody)
	}

	if err := c.DeleteDocument("sprint", 293, 2); err != nil {
		t.Fatalf("DeleteDocument: %v", err)
	}
}

func TestUserNotesClient(t *testing.T) {
	var gotPath, gotRawQuery string
	c := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotRawQuery = r.URL.Path, r.URL.RawQuery
		if r.Method == "DELETE" {
			w.WriteHeader(204)
			return
		}
		w.Write([]byte(`[{"id":7,"project_id":10,"title":"N","details":"d","pr_url":null,"sprints":["DD2#1"],"issues":[]}]`))
	})

	notes, err := c.ListUserNotes("foo bar")
	if err != nil || len(notes) != 1 || notes[0].ID != 7 || len(notes[0].Sprints) != 1 {
		t.Fatalf("ListUserNotes: %v %+v", err, notes)
	}
	if gotPath != "/api/user-notes" || gotRawQuery != "search=foo+bar" {
		t.Fatalf("path/query = %s ? %s", gotPath, gotRawQuery)
	}
	if err := c.DeleteUserNote(7); err != nil {
		t.Fatalf("DeleteUserNote: %v", err)
	}
}

func TestSstdClient(t *testing.T) {
	var gotPath, gotMethod string
	var gotBody map[string]any
	c := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotMethod = r.URL.Path, r.Method
		if r.Body != nil {
			b, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(b, &gotBody)
		}
		switch gotPath {
		case "/api/projects/10/sstd/slots":
			w.Write([]byte(`[{"slot_key":"architecture","content":"a","updated_at":"t"}]`))
		case "/api/projects/10/sstd/projections":
			w.Write([]byte(`{"next_steps":"## Next","journal":"## Log"}`))
		case "/api/projects/10/sstd/slots/architecture":
			w.Write([]byte(`{"slot_key":"architecture","content":"new","updated_at":"t2"}`))
		default:
			w.Write([]byte(`{}`))
		}
	})

	slots, err := c.GetSstdSlots()
	if err != nil || len(slots) != 1 || slots[0].SlotKey != "architecture" {
		t.Fatalf("GetSstdSlots: %v %+v", err, slots)
	}
	proj, err := c.GetSstdProjections()
	if err != nil || proj.NextSteps != "## Next" || proj.Journal != "## Log" {
		t.Fatalf("GetSstdProjections: %v %+v", err, proj)
	}
	slot, err := c.SetSstdSlot("architecture", "new")
	if err != nil || slot.Content != "new" {
		t.Fatalf("SetSstdSlot: %v %+v", err, slot)
	}
	if gotMethod != "PUT" || gotBody["content"] != "new" {
		t.Fatalf("set slot body: %s %v", gotMethod, gotBody)
	}
	if len(SstdSlotKeys) != 6 {
		t.Fatalf("expected 6 slot keys, got %d", len(SstdSlotKeys))
	}
}

func TestTodosClient(t *testing.T) {
	var gotPath, gotMethod, gotQuery string
	var gotBody map[string]any
	c := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotMethod, gotQuery = r.URL.Path, r.Method, r.URL.RawQuery
		if r.Body != nil {
			b, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(b, &gotBody)
		}
		if gotMethod == "DELETE" {
			w.WriteHeader(204)
			return
		}
		if gotMethod == "PATCH" || gotMethod == "POST" {
			w.Write([]byte(`{"id":3,"project_id":10,"label":"Do X","details":null,"status":"done","position":1}`))
			return
		}
		w.Write([]byte(`[{"id":3,"project_id":10,"label":"Do X","details":null,"status":"open","position":1}]`))
	})

	todos, err := c.ListTodos("open")
	if err != nil || len(todos) != 1 || todos[0].Label != "Do X" {
		t.Fatalf("ListTodos: %v %+v", err, todos)
	}
	if gotPath != "/api/projects/10/todos" || gotQuery != "status=open" {
		t.Fatalf("path/query = %s ? %s", gotPath, gotQuery)
	}
	if _, err := c.ToggleTodo(3, true); err != nil {
		t.Fatalf("ToggleTodo: %v", err)
	}
	if gotMethod != "PATCH" || gotBody["status"] != "done" {
		t.Fatalf("toggle body: %s %v", gotMethod, gotBody)
	}
	if err := c.DeleteTodo(3); err != nil {
		t.Fatalf("DeleteTodo: %v", err)
	}
}
