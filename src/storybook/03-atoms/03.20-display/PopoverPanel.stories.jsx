// PopoverPanel — Positionierungs-Primitive (Floating-Panel), aus dem Archiv extrahiert
// (DD-481). Token-clean; vom ProjectQuickSwitcher-Organism als Floating-Wrapper komponiert.
import PopoverPanel from '../../../components/ui/atoms/PopoverPanel'

export default {
  title: '03 ATOMS/03.20 Display/PopoverPanel',
  tags: ['status:stable', 'qa_checklist:done'],
  component: PopoverPanel,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    align: {
      control: 'inline-radio',
      options: ['left', 'right'],
    },
  },
}

function MenuItem({ children }) {
  return (
    <button
      type="button"
      className="block w-full text-left px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--surface1)] rounded"
      role="menuitem"
    >
      {children}
    </button>
  )
}

export const Default = {
  render: (args) => (
    <div className="relative h-40">
      <PopoverPanel {...args}>
        <div className="p-1">
          <MenuItem>Bearbeiten</MenuItem>
          <MenuItem>Duplizieren</MenuItem>
          <MenuItem>Archivieren</MenuItem>
        </div>
      </PopoverPanel>
    </div>
  ),
  args: {
    align: 'left',
  },
}

// Appearance: rechtsbündige Ausrichtung (align='right') — kanonische Achse Appearance.
export const Appearance = {
  ...Default,
  args: {
    align: 'right',
  },
}
