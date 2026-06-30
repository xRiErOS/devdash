package tui

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

// DD2-229: Drift-Guard. Nach der Migration (DD2-227/228) leiten ALLE Master-Detail-
// Split-Views ihre Pane-Breiten aus dem einen Helper masterDetailWidths (view.go) ab.
// Dieser statische String-Scan schlägt fehl, sobald eine view_*.go-Datei wieder eine
// eigene Breitenformel einführt (Prozent-Split `w*NN/NN` oder direkte Zuweisung einer
// Pane-Breiten-Variable aus einem w-Ausdruck). Wartungsarm, ohne TTY, ohne Netz.
//
// masterDetailWidths selbst lebt in view.go (kein `view_`-Präfix) → vom Scan ausgenommen.
// Will ein künftiger Screen bewusst eine Sonderbreite, ist das ein PO-Gespräch wert —
// genau dafür ist der Guard da (DD2#32 hatte view_review_sprint still abdriften lassen).
func TestNoInlineMasterDetailWidths(t *testing.T) {
	// Prozent-Split à la `w*42/100`: w, '*', Zahl, '/', Zahl.
	rePercent := regexp.MustCompile(`\bw\s*\*\s*[0-9]+\s*/\s*[0-9]+`)
	// Direkte Pane-Breiten-Zuweisung aus einem w-Ausdruck: `leftW := w * …` / `lw = w / …`.
	reAssign := regexp.MustCompile(`\b(lw|rw|leftW|rightW|paneW|masterW|detailW|listW|treeColW)\b\s*:?=\s*w\b\s*[*/]`)

	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("ReadDir(.): %v", err)
	}
	scanned := 0
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasPrefix(name, "view_") || !strings.HasSuffix(name, ".go") {
			continue
		}
		if strings.HasSuffix(name, "_test.go") {
			continue
		}
		data, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("ReadFile(%s): %v", name, err)
		}
		scanned++
		for i, line := range strings.Split(string(data), "\n") {
			// Kommentar abschneiden — dokumentierte Historie ("vorher inline …") darf
			// die Pattern-Tokens enthalten, ohne den Guard auszulösen.
			code := line
			if idx := strings.Index(code, "//"); idx >= 0 {
				code = code[:idx]
			}
			if rePercent.MatchString(code) || reAssign.MatchString(code) {
				t.Errorf("%s:%d enthält inline-Breitenformel — masterDetailWidths(w) verwenden: %q",
					name, i+1, strings.TrimSpace(line))
			}
		}
	}
	if scanned == 0 {
		t.Fatal("kein view_*.go gescannt — Glob/Arbeitsverzeichnis prüfen")
	}
}
