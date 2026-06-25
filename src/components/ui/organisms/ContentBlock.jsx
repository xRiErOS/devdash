import { Pencil } from 'lucide-react'
import IconButton from '../atoms/IconButton.jsx'
import WidgetBase from './WidgetBase.jsx'
import SubHeading from '../atoms/SubHeading.jsx'

/**
 * ContentBlock — GF-335 V2 Organism → GF-2 Wave-4 (6-Ebenen/WidgetBase-Canon).
 * Rendert eine VARIABLE Liste benannter Textblöcke (`blocks[]`, consumer-fixed — D02)
 * als Read-Prosa in einer `WidgetBase`-Shell (Layer-3-Fill, self-titled). Ein EditButton
 * je Block (D04) öffnet `ContentBlockForm` über `onEdit`. Präsentational/controlled.
 *
 * Self-titled (D-QC1): `heading` (opt-in) → WidgetBase rendert WidgetHeading (Dot +
 * `--heading-accent`, KEIN `// `-Slash — ersetzt den früheren WidgetHeader/Tier-2-`//`).
 * Block-Labels rendern als `SubHeading` (`--subheading-accent`, KEIN `/// ` — ersetzt
 * CommentLabel variant="label", D-C). Mono überall, 0 Roh-Hex.
 *
 * data-ui: Wurzel `content-block` (= WidgetBase, dataUiScope); self-title `content-block.heading`;
 * Content `content-block.content`; je Block `content-block.block-<key>` + `.label` + `.edit` + `.value`|`.empty`.
 *
 * @param {object} props
 * @param {Array<{key:string, label:string, value?:string, placeholder?:string}>} [props.blocks=[]] - benannte Textblöcke (geordnet).
 * @param {import('react').ReactNode} [props.heading] - optionaler Self-Title (WidgetHeading, Dot + heading-accent); fehlt → headless.
 * @param {(key: string) => void} [props.onEdit] - öffnet das ContentBlockForm fokussiert auf `key` (EditButton je Block nur wenn gesetzt).
 * @param {string} [props.emptyPlaceholder='Kein Inhalt hinterlegt.'] - Fallback-Leer-Hinweis je Block.
 * @param {boolean} [props.showBlockLabels=true] - je-Block-Label (SubHeading) rendern. false = unterdrückt das innere Label (Einzel-Block-Slots, I01).
 * @param {string} [props.dataUiScope='content-block'] - parametrisierter data-ui-Wurzelbereich.
 */
export default function ContentBlock({
  blocks = [],
  heading,
  onEdit,
  emptyPlaceholder = 'Kein Inhalt hinterlegt.',
  showBlockLabels = true,
  dataUiScope = 'content-block',
}) {
  return (
    <WidgetBase heading={heading} dataUi={dataUiScope} className="[font-family:var(--font-display)]">
      <div className="flex flex-col gap-4">
        {blocks.map((b) => {
          const scope = `${dataUiScope}.block-${b.key}`
          return (
            <div key={b.key} data-ui={scope} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                {showBlockLabels
                  ? <SubHeading dataUi={`${scope}.label`} className="mt-0 mb-0">{b.label}</SubHeading>
                  : <span />}
                {onEdit && (
                  <IconButton
                    icon={<Pencil size={14} aria-hidden="true" />}
                    label={`${b.label} bearbeiten`}
                    onClick={() => onEdit(b.key)}
                    size="sm"
                    variant="ghost"
                    reveal
                    data-ui={`${scope}.edit`}
                  />
                )}
              </div>
              {b.value
                ? (
                  <div
                    data-ui={`${scope}.value`}
                    className="text-xs text-[var(--text)] whitespace-pre-wrap leading-relaxed"
                  >
                    {b.value}
                  </div>
                )
                : (
                  <p data-ui={`${scope}.empty`} className="text-xs italic text-[var(--overlay0)]">
                    {b.placeholder || emptyPlaceholder}
                  </p>
                )}
            </div>
          )
        })}
      </div>
    </WidgetBase>
  )
}
