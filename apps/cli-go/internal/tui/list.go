package tui

// listState ist ein minimaler, testbarer Cursor über eine Liste fester Länge.
type listState struct {
	length int
	cursor int
}

func (l *listState) setLen(n int) {
	l.length = n
	if l.cursor >= n {
		l.cursor = n - 1
	}
	if l.cursor < 0 {
		l.cursor = 0
	}
}

func (l *listState) move(d int) {
	if l.length == 0 {
		l.cursor = 0
		return
	}
	l.cursor += d
	if l.cursor < 0 {
		l.cursor = 0
	}
	if l.cursor >= l.length {
		l.cursor = l.length - 1
	}
}

// reset setzt den Cursor auf 0 (z.B. wenn die Parent-Auswahl wechselt).
func (l *listState) reset() { l.cursor = 0 }
