package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"devd-cli/internal/api/generated"
)

// DD2-163: Foundation-Client-Tests (documents/user_notes/todos) gegen einen
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

	milestoneID := 45
	listData, err := c.DocumentList(generated.DocumentListArgs{MilestoneId: &milestoneID})
	if err != nil {
		t.Fatalf("DocumentList: %v", err)
	}
	var docs []Document
	if err := json.Unmarshal(listData, &docs); err != nil {
		t.Fatalf("DocumentList unmarshal: %v", err)
	}
	if len(docs) != 1 || docs[0].MilestoneID == nil || *docs[0].MilestoneID != 45 {
		t.Fatalf("DocumentList: %+v", docs)
	}
	if gotPath != "/api/milestones/45/documents" {
		t.Fatalf("path = %s", gotPath)
	}

	sprintKey := "293"
	body := "b"
	createData, err := c.DocumentCreate(generated.DocumentCreateArgs{SprintKey: &sprintKey, Title: "New", Body: &body})
	if err != nil {
		t.Fatalf("DocumentCreate: %v", err)
	}
	var created Document
	if err := json.Unmarshal(createData, &created); err != nil || created.ID != 2 {
		t.Fatalf("DocumentCreate unmarshal: %v %+v", err, created)
	}
	if gotMethod != "POST" || gotBody["title"] != "New" || gotBody["body"] != "b" {
		t.Fatalf("create body wrong: %v %v", gotMethod, gotBody)
	}

	if _, err := c.DocumentDelete(generated.DocumentDeleteArgs{SprintKey: &sprintKey, DocId: 2}); err != nil {
		t.Fatalf("DocumentDelete: %v", err)
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
