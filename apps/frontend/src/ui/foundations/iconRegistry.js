/**
 * GF-213 — Icon-Registry (Single-Source für Iconography, PO 2026-06-15,
 * project_memory D-icon-registry, mem 392).
 *
 * Modell:
 *  - KEIN freeform Lucide. Dies ist die EINZIGE Stelle, die aus 'lucide-react'
 *    importieren darf (mechanischer Guard: gf213-no-raw-lucide.test.js).
 *  - Jedes Icon trägt Bedeutung. Farbe = an Semantik-ROLLE gebunden, nicht ans
 *    Icon. role → Token ist FIX (ROLE_CLASS). Die Farben SIND die DD-47-Tokens.
 *  - Rolle ist PRO VERWENDUNG: dasselbe Icon kann mehrrollig sein
 *    (brain → neutral|success|danger: Gehirn.gut=grün, Gehirn.schlecht=rot).
 *    Jeder Eintrag listet seine sanktionierten roles; roles[0] = Default.
 *  - Neues Icon = bewusster Eintrag hier (Cmp + label + roles), nie ad-hoc.
 *  - KEINE semantischen Dubletten (PO-Review 2026-06-15): ein Konzept = ein Icon.
 */
import {
  X, Plus, Minus, Pencil, Copy, Search, Filter, SlidersHorizontal,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown,
  ArrowUpRight, ArrowLeftRight, CornerDownLeft,
  GripVertical, MoreHorizontal, Command, Hash,
  Brain, Check, CheckCircle2, XCircle, AlertCircle, Info, CircleHelp, CircleDot,
  Lock, Eye, EyeOff, Flag, Pin, ShieldCheck,
  Inbox, Home, LayoutDashboard, Columns3, Settings,
  Trash2, ClipboardCheck, List, ListChecks,
  Layers, Map, Network, Milestone, Target, BarChart3, Activity, History,
  FileText, FilePlus, FolderOpen, FolderPlus, FolderGit2,
  GitBranch, Code2, Terminal, Paperclip, Tag, Tags,
  Sun, Moon, Download, Save, Share2, ExternalLink, Link2,
  Redo2, Undo2, RotateCcw, Play, LogIn,
  Calendar, Sparkles, Bug, Wrench, Loader2,
  Maximize2,
} from 'lucide-react'

// Semantik-Rolle → Farb-Token (FIX, DD-47). Statische Tailwind-Arbitrary-Klassen
// (JIT-sichtbar). roles[0] eines Eintrags = Default-Rolle.
export const ROLE_CLASS = {
  neutral: 'text-[var(--subtext0)]',
  primary: 'text-[var(--accent-primary)]',
  success: 'text-[var(--accent-success)]',
  danger: 'text-[var(--accent-danger)]',
  warning: 'text-[var(--accent-warning)]',
  info: 'text-[var(--accent-info)]',
}

export const ROLE_LABEL = {
  neutral: 'Neutral',
  primary: 'Primär',
  success: 'Erfolg',
  danger: 'Gefahr',
  warning: 'Warnung',
  info: 'Info',
}

export const ROLES = Object.keys(ROLE_CLASS)

// key (kebab) → { Cmp, label, roles[] }. roles[0] = Default.
export const ICON_REGISTRY = {
  // — Aktionen —
  'close': { Cmp: X, label: 'Schließen', roles: ['neutral'] },
  'add': { Cmp: Plus, label: 'Hinzufügen', roles: ['neutral', 'primary'] },
  'remove': { Cmp: Minus, label: 'Entfernen', roles: ['neutral'] },
  'edit': { Cmp: Pencil, label: 'Bearbeiten', roles: ['neutral'] },
  'copy': { Cmp: Copy, label: 'Kopieren', roles: ['neutral'] },
  'search': { Cmp: Search, label: 'Suchen', roles: ['neutral'] },
  'filter': { Cmp: Filter, label: 'Filter', roles: ['neutral'] },
  'adjust': { Cmp: SlidersHorizontal, label: 'Einstellen', roles: ['neutral'] },
  'delete': { Cmp: Trash2, label: 'Löschen', roles: ['danger'] },
  'save': { Cmp: Save, label: 'Speichern', roles: ['neutral', 'success'] },
  'download': { Cmp: Download, label: 'Herunterladen', roles: ['neutral'] },
  'share': { Cmp: Share2, label: 'Teilen', roles: ['neutral', 'info'] },
  'undo': { Cmp: Undo2, label: 'Rückgängig', roles: ['neutral'] },
  'redo': { Cmp: Redo2, label: 'Wiederholen', roles: ['neutral'] },
  'reset': { Cmp: RotateCcw, label: 'Zurücksetzen', roles: ['neutral', 'warning'] },
  'play': { Cmp: Play, label: 'Start', roles: ['success', 'neutral'] },
  'login': { Cmp: LogIn, label: 'Anmelden', roles: ['neutral', 'primary'] },
  'more': { Cmp: MoreHorizontal, label: 'Mehr', roles: ['neutral'] },
  'command': { Cmp: Command, label: 'Befehl', roles: ['neutral'] },
  'enter': { Cmp: CornerDownLeft, label: 'Enter', roles: ['neutral'] },
  'drag': { Cmp: GripVertical, label: 'Ziehen/Sortieren', roles: ['neutral'] },

  // — Navigation —
  'chevron-down': { Cmp: ChevronDown, label: 'Aufklappen', roles: ['neutral'] },
  'chevron-up': { Cmp: ChevronUp, label: 'Zuklappen', roles: ['neutral'] },
  'chevron-left': { Cmp: ChevronLeft, label: 'Zurück', roles: ['neutral'] },
  'chevron-right': { Cmp: ChevronRight, label: 'Weiter', roles: ['neutral'] },
  'arrow-left': { Cmp: ArrowLeft, label: 'Zurück', roles: ['neutral'] },
  'arrow-right': { Cmp: ArrowRight, label: 'Vor', roles: ['neutral'] },
  'arrow-up': { Cmp: ArrowUp, label: 'Hoch', roles: ['neutral'] },
  'sort': { Cmp: ArrowUpDown, label: 'Sortieren', roles: ['neutral'] },
  'swap': { Cmp: ArrowLeftRight, label: 'Tauschen', roles: ['neutral'] },
  'home': { Cmp: Home, label: 'Start', roles: ['neutral'] },
  'dashboard': { Cmp: LayoutDashboard, label: 'Dashboard', roles: ['neutral'] },
  'board': { Cmp: Columns3, label: 'Board', roles: ['neutral'] },
  'settings': { Cmp: Settings, label: 'Einstellungen', roles: ['neutral'] },
  'external': { Cmp: ExternalLink, label: 'Extern öffnen', roles: ['neutral', 'info'] },
  'expand': { Cmp: Maximize2, label: 'Breit/Details', roles: ['neutral', 'primary'] },
  'link': { Cmp: Link2, label: 'Verknüpfung', roles: ['neutral', 'info'] },
  'hash': { Cmp: Hash, label: 'ID/Nummer', roles: ['neutral'] },

  // — Status / Semantik —
  'success': { Cmp: CheckCircle2, label: 'Bestanden/Erledigt', roles: ['success'] },
  'check': { Cmp: Check, label: 'Haken/Erledigt', roles: ['success', 'neutral'] },
  'error': { Cmp: XCircle, label: 'Abgelehnt/Fehler', roles: ['danger'] },
  'alert': { Cmp: AlertCircle, label: 'Warnung', roles: ['warning', 'danger'] },
  'info': { Cmp: Info, label: 'Hinweis', roles: ['info'] },
  'help': { Cmp: CircleHelp, label: 'Hilfe/Unbekannt', roles: ['neutral', 'info'] },
  'status-open': { Cmp: CircleDot, label: 'Status offen', roles: ['neutral', 'info'] },
  'lock': { Cmp: Lock, label: 'Gesperrt', roles: ['neutral', 'warning'] },
  'show': { Cmp: Eye, label: 'Anzeigen', roles: ['neutral'] },
  'hide': { Cmp: EyeOff, label: 'Verbergen', roles: ['neutral'] },
  'flag': { Cmp: Flag, label: 'Markierung/Prio', roles: ['warning', 'neutral'] },
  'pin': { Cmp: Pin, label: 'Anheften', roles: ['neutral', 'primary'] },
  'shield-check': { Cmp: ShieldCheck, label: 'Security/Geprüft', roles: ['success', 'neutral'] },
  'review': { Cmp: ClipboardCheck, label: 'Review/Abnahme', roles: ['neutral', 'success'] },
  'brain': { Cmp: Brain, label: 'KI/Denken', roles: ['neutral', 'success', 'danger'] },

  // — Domäne / Entitäten —
  'backlog': { Cmp: Inbox, label: 'Backlog/Eingang', roles: ['neutral'] },
  'list': { Cmp: List, label: 'Liste', roles: ['neutral'] },
  'checklist': { Cmp: ListChecks, label: 'Checkliste/Aufgaben', roles: ['neutral', 'success'] },
  'layers': { Cmp: Layers, label: 'Ebenen/Milestones', roles: ['neutral'] },
  'milestone': { Cmp: Milestone, label: 'Meilenstein', roles: ['neutral'] },
  'roadmap': { Cmp: Map, label: 'Roadmap', roles: ['neutral'] },
  'dependencies': { Cmp: Network, label: 'Abhängigkeiten', roles: ['neutral', 'info'] },
  'target': { Cmp: Target, label: 'Ziel', roles: ['neutral'] },
  'stats': { Cmp: BarChart3, label: 'Statistik', roles: ['neutral'] },
  'activity': { Cmp: Activity, label: 'Aktivität', roles: ['neutral'] },
  'history': { Cmp: History, label: 'Verlauf', roles: ['neutral'] },
  'calendar': { Cmp: Calendar, label: 'Datum/Zeitraum', roles: ['neutral'] },

  // — Dateien / Code —
  'file': { Cmp: FileText, label: 'Dokument', roles: ['neutral'] },
  'file-add': { Cmp: FilePlus, label: 'Neue Datei', roles: ['neutral', 'primary'] },
  'folder': { Cmp: FolderOpen, label: 'Ordner', roles: ['neutral'] },
  'folder-add': { Cmp: FolderPlus, label: 'Neues Projekt', roles: ['neutral', 'primary'] },
  'repo': { Cmp: FolderGit2, label: 'Repository', roles: ['neutral'] },
  'branch': { Cmp: GitBranch, label: 'Branch', roles: ['neutral'] },
  'code': { Cmp: Code2, label: 'Code', roles: ['neutral', 'success'] },
  'terminal': { Cmp: Terminal, label: 'CLI', roles: ['neutral'] },
  'attachment': { Cmp: Paperclip, label: 'Anhang', roles: ['neutral'] },
  'tag': { Cmp: Tag, label: 'Tag', roles: ['neutral'] },
  'tags': { Cmp: Tags, label: 'Tags', roles: ['neutral'] },

  // — Issue-Typen (verallgemeinert aus typeIcons) —
  'type-feature': { Cmp: Sparkles, label: 'Typ: Feature', roles: ['primary', 'success'] },
  'type-bug': { Cmp: Bug, label: 'Typ: Bug', roles: ['danger'] },
  'type-improvement': { Cmp: ArrowUpRight, label: 'Typ: Verbesserung', roles: ['info', 'neutral'] },
  'type-chore': { Cmp: Wrench, label: 'Typ: Chore/Wartung', roles: ['neutral'] },
  // ISSUE_TYPES (BackendContract) = bug|feature|improvement|core — `core` ist der
  // echte Backend-Typ (≠ legacy `chore`); gleiches Wartungs-Icon.
  'type-core': { Cmp: Wrench, label: 'Typ: Core/Wartung', roles: ['neutral'] },

  // — Theme —
  'theme-light': { Cmp: Sun, label: 'Hell-Theme', roles: ['neutral', 'warning'] },
  'theme-dark': { Cmp: Moon, label: 'Dunkel-Theme', roles: ['neutral'] },

  // — Sonstige —
  'spinner': { Cmp: Loader2, label: 'Lädt', roles: ['neutral'] },
}

// Lookup-Helfer: gibt Eintrag + die anzuwendende Rolle (sanktioniert oder Default).
export function resolveIcon(name, role) {
  const entry = ICON_REGISTRY[name]
  if (!entry) return null
  const appliedRole = role && entry.roles.includes(role) ? role : entry.roles[0]
  return { ...entry, appliedRole }
}
