import Card from '../atoms/Card.jsx'
import CardHead from '../atoms/CardHead.jsx'
import Ico from '../atoms/Ico.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'

/**
 * TodoPreviewSection — DD-481 Organism (Extract aus components/projectHome/SettingsSidebar.jsx,
 * Inline-Komponente `TodoPreviewSection`).
 * Domänen-bewusst: rendert die Projekt-ToDo-Vorschau (Top 5 offene ToDos) als Card-Sektion
 * mit Status-Badge je Eintrag. Kennt das Todo-Vokabular (status='open', label) → ORGANISM-Tier.
 *
 * PRESENTATIONAL — gehobene Kopplung (D-Phase3-01):
 * - ENTFERNT: `useProjectTodos(projectId)`-Hook (Store/Fetch) + der davon abgeleitete
 *   `loading`-Zustand. Die ToDos kommen jetzt als `todos`-Prop rein, der Lade-Zustand als
 *   `loading`-Prop. Kein Store, kein Fetch, kein API-Call. Auch der `projectId`-Prop entfällt
 *   (war nur Eingabe für den entfernten Hook).
 * - BEHALTEN: kein lokaler UI-State nötig (reine Render-Liste). Die Top-5-Open-Filterung
 *   bleibt verlustfrei als reine Ableitung aus den Props.
 *
 * @param {object} props
 * @param {Array<{id:number|string, label?:string, status?:string}>} [props.todos=[]] - ToDos (extern geladen)
 * @param {boolean} [props.loading=false] - Lade-Zustand (extern gesteuert)
 * @param {number} [props.limit=5] - max. Anzahl offener ToDos in der Vorschau
 * @param {string} [props.dataUiScope='todo-preview-section'] - parametrisierter data-ui-Wurzelbereich (I03/D01)
 * @param {string} [props.className] - zusätzliche Klassen
 */

// Card-Head-Icon: Checkbox-mit-Häkchen, verlustfreier SVG-Slot aus der Quelle.
const HEAD_ICON = (
  <Ico icon={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} />
)

export default function TodoPreviewSection({
  todos = [],
  loading = false,
  limit = 5,
  dataUiScope = 'todo-preview-section',
  className = '',
  ...rest
}) {
  const open = todos.filter((t) => t.status === 'open').slice(0, limit)

  return (
    <Card
      tone="mantle"
      className={`relative shadow-[var(--shadow-card)] ${className}`}
      data-ui={dataUiScope}
      {...rest}
    >
      <CardHead
        icon={HEAD_ICON}
        title={`ToDos · Top ${limit}`}
        data-ui={`${dataUiScope}.head`}
      />

      {open.length === 0 ? (
        <p
          data-ui={`${dataUiScope}.empty`}
          className="m-0 text-xs leading-normal text-[var(--subtext0)] font-[var(--font-display,system-ui)]"
        >
          {loading ? 'Lädt …' : 'Keine offenen ToDos.'}
        </p>
      ) : (
        <ul
          data-ui={`${dataUiScope}.list`}
          className="list-none m-0 p-0 flex flex-col gap-2"
        >
          {open.map((t) => (
            <li
              key={t.id}
              data-ui={`${dataUiScope}.item`}
              className="flex items-center gap-2 text-xs text-[var(--text)] font-[var(--font-display,system-ui)]"
            >
              <StatusBadge status={t.status} data-ui={`${dataUiScope}.item.status`} />
              <span
                data-ui={`${dataUiScope}.item.label`}
                className="overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {t.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
