/**
 * MarkdownField (04.10 Form) — dünner Wrapper um `note-field` (MarkdownNoteField,
 * CodeMirror 6 + ixora Live-Preview, Catppuccin). Präsentational/controlled:
 * value (Markdown-String) + onChange(string). note-field bringt eigene Toolbar +
 * Live-Preview mit.
 *
 * THEME-SYNC (GF-2, 2026-06-21): MarkdownField spiegelt das App-Theme
 * (`data-theme` auf <html>) reaktiv auf note-fields `theme`-Prop — siehe MDX
 * „Theme-Sync". Ohne diesen Bridge bliebe der Editor in Dark-Mode hell (Latte-
 * Default via prefers-color-scheme). Der Storybook-Theme-Toggle wirkt jetzt voll.
 */
import MarkdownField from '../../../components/ui/molecules/MarkdownField.jsx'

const noop = () => {}

const SAMPLE = '# Sprint-Notiz\n\nRe-Home **05.70 → 06.60** zuerst.\n\n- [x] Slot-Anker stabil\n- [ ] IssueDetails nach Fix\n\n`entity-detail.slot.notes`'

const meta = {
  title: '04 MOLECULES/04.10 Form/MarkdownField',
  component: MarkdownField,
  tags: ['status:review', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: 'text', description: 'Markdown-Roh-Text (controlled).' },
    rows: { control: 'number', description: 'Mindesthöhe in Zeilen (→ note-field minRows).' },
    disabled: { control: 'boolean', description: 'readOnly.' },
  },
  args: { value: '', rows: 4, disabled: false },
}
export default meta

// Default: args-getrieben — leeres Feld (Placeholder), folgt dem Theme-Toggle.
export const Default = {
  args: {},
  render: () => (
    <div data-ui="molecule.markdown-field.default" className="max-w-md">
      <MarkdownField onChange={noop} />
    </div>
  ),
}

// Main: realistischer Hauptfall — befüllt (Heading, Bold, Checkliste, Inline-Code).
export const Main = {
  render: () => (
    <div data-ui="molecule.markdown-field.main" className="max-w-md">
      <MarkdownField value={SAMPLE} rows={4} onChange={noop} />
    </div>
  ),
}

// State_Disabled: readOnly — Anzeige ohne Eingabe.
export const State_Disabled = {
  render: () => (
    <div data-ui="molecule.markdown-field.disabled" className="max-w-md">
      <MarkdownField value={SAMPLE} disabled onChange={noop} />
    </div>
  ),
}
