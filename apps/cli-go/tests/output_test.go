package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"strings"
	"testing"

	"devd-cli/internal/output"
	"github.com/spf13/cobra"
)

func captureStdout(fn func()) string {
	r, w, _ := os.Pipe()
	old := os.Stdout
	os.Stdout = w
	fn()
	w.Close()
	os.Stdout = old
	var buf bytes.Buffer
	io.Copy(&buf, r)
	return buf.String()
}

func cmdWithFlags() *cobra.Command {
	c := &cobra.Command{}
	c.Flags().Bool("json", false, "")
	c.Flags().Bool("yaml", false, "")
	return c
}

func TestPrintJSON(t *testing.T) {
	c := cmdWithFlags()
	c.Flags().Set("json", "true")
	data := map[string]string{"key": "DD2#1", "status": "in_progress"}

	got := captureStdout(func() { output.Print(c, data, func() { t.Error("humanFn darf bei --json nicht laufen") }) })

	var parsed map[string]string
	if err := json.Unmarshal([]byte(got), &parsed); err != nil {
		t.Fatalf("Output kein valides JSON: %v\ngot: %q", err, got)
	}
	if parsed["key"] != "DD2#1" {
		t.Errorf("key = %q, want DD2#1", parsed["key"])
	}
}

func TestPrintYAML(t *testing.T) {
	c := cmdWithFlags()
	c.Flags().Set("yaml", "true")
	data := map[string]string{"status": "in_progress"}

	got := captureStdout(func() { output.Print(c, data, func() {}) })

	if !strings.Contains(got, "status: in_progress") {
		t.Errorf("erwartete YAML 'status: in_progress', got: %q", got)
	}
}

func TestPrintHumanFallback(t *testing.T) {
	c := cmdWithFlags()
	ran := false
	captureStdout(func() { output.Print(c, nil, func() { ran = true }) })
	if !ran {
		t.Error("humanFn lief nicht im Human-Modus")
	}
}
