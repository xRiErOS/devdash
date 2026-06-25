/**
 * AccordionBody — Molecule (04.40 Data Display). Inhalt einer AccordionSection als
 * eine ODER mehrere Reihen, je Reihe zwei Spalten 2fr (links) / 1fr (rechts). Die
 * Spalten sind benannte, im Organismus adressierbare SLOTS.
 *
 * DER TITEL GEHÖRT IN DEN SLOT (nicht ins Widget): jeder Slot = { title, content }.
 * AccordionBody rendert den Titel als SubHeading (Dot + Sub-Akzent, kein Slash;
 * CommentLabel-Nachfolger, D-C). Im 6-Ebenen-Canon sind die EntityDetail-Widgets
 * self-titled (heading-Prop) → die Composer passen `title:null`/`hideTitle:true`;
 * der Slot-Titel ist damit ein vestigialer Opt-in (Default-off, D-QC2). Ein roher
 * Node als Slot wird als titelloser content behandelt.
 *
 * data-ui-Schema (mehr als 2 Elemente nestbar):
 *   1 Reihe   → accordion-body.slot-left / accordion-body.slot-right
 *   N Reihen  → accordion-body.section-<n>-left / accordion-body.section-<n>-right
 *   anchor    → trägt ein Slot `anchor`, ersetzt er den Default-data-ui (EntityDetail-
 *               SOLL-Anker `entity-detail.slot.*`, GF-417). Fallback = accordion-body-Default
 *               → noch nicht migrierte Organismen bleiben unverändert (Back-Compat).
 *
 * SPAN-LEFT-REIHE (T4.8): statt `{left, right}` kann eine Reihe `{left, rights: [a, b]}`
 * tragen. Dann spannt die linke Zelle vertikal über die rechte Spalte (`md:row-span-2`),
 * während die `rights`-Slots in der zweiten Spalte gestapelt werden. Schema-Anker
 * (ohne eigenen `anchor`): accordion-body.section-<n>-left / .section-<n>-right-<m>.
 * Die `{left, right}`-Reihe bleibt unverändert (Back-Compat) — kein anderes
 * Komposit ändert sich.
 *
 * RANDLOS: keine Trennstriche zwischen Slots — Abgrenzung allein über Spacing.
 *
 * @param {object} props
 * @param {Array<{left?: SlotDef, right?: SlotDef, rights?: SlotDef[]}>} [props.rows] - mehrere Reihen.
 * @param {SlotDef} [props.left] - Slot links (Einzelreihen-Kurzform).
 * @param {SlotDef} [props.right] - Slot rechts (Einzelreihen-Kurzform).
 * @param {string} [props.className]
 * @typedef {{title?: import('react').ReactNode, content?: import('react').ReactNode, anchor?: string}|import('react').ReactNode} SlotDef
 */
import { isValidElement } from 'react'
import SubHeading from '../atoms/SubHeading.jsx'

// Normalisiert eine SlotDef zu { title, content, anchor, hideTitle } — roher Node = titelloser content.
// hideTitle (D-QC2, GF-2 Wave-4): self-titled WidgetBase trägt den Titel selbst → Slot
// unterdrückt seinen Titel, behält aber den Slot (Anker/Layout). Default = Titel an (Back-Compat).
function normalize(def) {
  if (def && typeof def === 'object' && !isValidElement(def) && ('title' in def || 'content' in def || 'anchor' in def)) {
    return { title: def.title ?? null, content: def.content ?? null, anchor: def.anchor ?? null, hideTitle: def.hideTitle ?? false }
  }
  return { title: null, content: def ?? null, anchor: null, hideTitle: false }
}

function Slot({ ui, def }) {
  const { title, content, anchor, hideTitle } = normalize(def)
  return (
    <div data-ui={anchor || ui} className="space-y-2 p-4">
      {title && !hideTitle ? <SubHeading>{title}</SubHeading> : null}
      {content}
    </div>
  )
}

export default function AccordionBody({ rows, left, right, className = '' }) {
  const list = rows ?? [{ left, right }]
  const single = list.length === 1

  return (
    <div data-ui="accordion-body" className={`space-y-4 ${className}`}>
      {list.map((row, i) => {
        const n = i + 1
        const leftUi = single ? 'accordion-body.slot-left' : `accordion-body.section-${n}-left`
        const rightUi = single ? 'accordion-body.slot-right' : `accordion-body.section-${n}-right`

        // Full-Width-Reihe (D-G, W0-T14): `left` ohne `right`/`rights` → die linke Zelle
        // spannt die volle Breite (col-span-2) statt 2fr + leere 1fr-Zelle. Keine leere
        // rechte Slot-Zelle mehr. Nutznießer: dod + Solo-Reihen (notes/context/ponotes).
        if (!Array.isArray(row.rights) && row.right == null) {
          return (
            <div key={n} className="grid grid-cols-1 md:grid-cols-[2fr_1fr]">
              <div className="md:col-span-2">
                <Slot ui={leftUi} def={row.left} />
              </div>
            </div>
          )
        }

        // Span-Left-Reihe: linke Zelle spannt über die gestapelten `rights`-Slots.
        if (Array.isArray(row.rights)) {
          return (
            <div key={n} className="grid grid-cols-1 md:grid-cols-[2fr_1fr]">
              <div className="md:row-span-2">
                <Slot ui={leftUi} def={row.left} />
              </div>
              <div className="flex flex-col">
                {row.rights.map((def, j) => (
                  <Slot key={j} ui={`${rightUi}-${j + 1}`} def={def} />
                ))}
              </div>
            </div>
          )
        }

        return (
          <div key={n} className="grid grid-cols-1 md:grid-cols-[2fr_1fr]">
            <Slot ui={leftUi} def={row.left} />
            <Slot ui={rightUi} def={row.right} />
          </div>
        )
      })}
    </div>
  )
}
