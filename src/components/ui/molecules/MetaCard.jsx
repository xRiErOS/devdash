/**
 * MetaCard — kanonische Molecule (DD-481 Extract aus SettingsSidebar.jsx „MetaCard").
 * Komponiert ../atoms/CardHead.jsx (Icon + Titel) mit einer Liste aus ../atoms/MetaRow.jsx
 * (Label/Value-Zeilen) in einer Card-Shell. Props-driven, kein Store/Fetch,
 * keine Domänen-Begriffe — generische Display-Props.
 *
 * ABGRENZUNG zu MetaFieldGrid (Molecule): MetaCard = fertige Karte mit
 * EINSPALTIGER MetaRow-Liste, kein actions-Slot — für Meta-Listen in
 * Seitenleisten. MetaFieldGrid = shell-loses Chip-Grid (1–2 Spalten,
 * surface0-Chips, mono/truncate), Kopf + Card baut der Konsument — für
 * Stammdaten-Karten mit Copy-for-AI (Projekt-Meta, Sprint-Meta).
 * Konsolidierungs-Kandidat: MetaCard variant="rows|chips" könnte beide vereinen.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.icon] - Icon im CardHead (z.B. lucide-react-Element)
 * @param {import('react').ReactNode} props.title - Titeltext im CardHead
 * @param {Array<{label: import('react').ReactNode, value: import('react').ReactNode, dot?: boolean}>} [props.rows=[]] - Meta-Zeilen
 * @param {string} [props.className] - zusätzliche Klassen für die Wurzel
 */
import CardHead from '../atoms/CardHead.jsx'
import MetaRow from '../atoms/MetaRow.jsx'

export default function MetaCard({ icon, title, rows = [], className = '', ...rest }) {
  return (
    <section
      data-ui="meta-card"
      className={`relative rounded-lg border border-[var(--border)] bg-[var(--surface0)] p-4 shadow-[var(--shadow-card)] ${className}`}
      {...rest}
    >
      <CardHead icon={icon} title={title} />
      <div data-ui="meta-card.list" className="flex flex-col gap-2 font-[var(--font-display,system-ui)]">
        {rows.map((row, i) => (
          <MetaRow
            key={`${row.label}-${i}`}
            label={row.label}
            value={row.value}
            dot={row.dot}
          />
        ))}
      </div>
    </section>
  )
}
