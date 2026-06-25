/**
 * VisionGoalsCard — Organism (DD-481 Phase 5 Gap G1, Projekt-Home Overview).
 *
 * Domänen-bewusste Einheit: Vision-Prosa + nummerierte Goals-Liste eines Projekts.
 * Komponiert die Atoms Card + CardHead + das Layout-Primitive Stack.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API/useEffect-Datenladen. Vision
 * und Goals kommen ausschließlich als Props; keine Mutation (read-only Anzeige).
 * Kein eigener State.
 *
 * TOKEN-CLEAN: 0 inline-style-Literale, 0 Raw-Hex. Flächen/Farben via
 * Tailwind-v4-Arbitrary + Catppuccin-Tokens.
 *
 * Optionale Edit-Affordance: liegt eine `onEditVision`/`onEditGoals`-Callback-Prop
 * vor, rendert die jeweilige Box einen Pencil-IconButton im Box-Header. Der Edit
 * selbst (Text-Modal) gehört in den Konsumenten — die Card hebt nur die Intention.
 *
 * @param {object} props
 * @param {string} [props.vision=''] - Vision-Prosa (1–2 Sätze)
 * @param {string[]} [props.goals=[]] - geordnete Goals → nummerierte Liste
 * @param {()=>void} [props.onEditVision] - Edit-Action Vision (zeigt Pencil, wenn gesetzt)
 * @param {()=>void} [props.onEditGoals] - Edit-Action Goals (zeigt Pencil, wenn gesetzt)
 * @param {string} [props.title='Vision & Goals'] - Card-Titel
 * @param {string} [props.dataUiScope='vision-goals-card'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */
import { Pencil } from 'lucide-react'
import Card from '../atoms/Card.jsx'
import CardHead from '../atoms/CardHead.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Cluster from '../layout/Cluster.jsx'
import Stack from '../layout/Stack.jsx'

const BOX_CLS = 'rounded-lg border border-[var(--surface2)] bg-[var(--base)] p-3'
const LABEL_CLS = 'block text-[11px] uppercase tracking-wide text-[var(--subtext0)]'

function BoxHead({ label, onEdit, editLabel, dataUiScope }) {
  return (
    <Cluster justify="between" className="mb-1 flex-nowrap">
      <span className={LABEL_CLS}>{label}</span>
      {onEdit && (
        <IconButton
          size="sm"
          variant="ghost"
          icon={<Pencil size={13} aria-hidden="true" />}
          label={editLabel}
          onClick={onEdit}
          data-ui={`${dataUiScope}.edit`}
        />
      )}
    </Cluster>
  )
}

export default function VisionGoalsCard({
  vision = '',
  goals = [],
  onEditVision,
  onEditGoals,
  title = 'Vision & Goals',
  dataUiScope = 'vision-goals-card',
  className = '',
}) {
  return (
    <Card tone="mantle" data-ui={dataUiScope} className={className}>
      <CardHead title={title} />
      <Stack gap="sm">
        <div data-ui={`${dataUiScope}.vision`} className={BOX_CLS}>
          <BoxHead label="Vision" onEdit={onEditVision} editLabel="Vision bearbeiten" dataUiScope={`${dataUiScope}.vision`} />
          {vision ? (
            <p className="m-0 text-sm text-[var(--text)]">{vision}</p>
          ) : (
            <p className="m-0 text-sm italic text-[var(--subtext0)]">Noch keine Vision hinterlegt.</p>
          )}
        </div>

        <div data-ui={`${dataUiScope}.goals`} className={BOX_CLS}>
          <BoxHead label="Goals" onEdit={onEditGoals} editLabel="Goals bearbeiten" dataUiScope={`${dataUiScope}.goals`} />
          {goals.length > 0 ? (
            <ol
              data-ui={`${dataUiScope}.goals.list`}
              className="m-0 list-decimal pl-5 flex flex-col gap-1 text-sm text-[var(--text)]"
            >
              {goals.map((goal, i) => (
                <li key={`${i}-${goal}`} data-ui={`${dataUiScope}.goals.item`}>
                  {goal}
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-sm italic text-[var(--subtext0)]">Keine Goals definiert.</p>
          )}
        </div>
      </Stack>
    </Card>
  )
}
