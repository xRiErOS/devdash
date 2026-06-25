/**
 * SlotsContainer — Template-Tier Slot-Registry-Layout-Gerüst
 * (DD-481 Phase 4, Harvest INV-116 aus
 * `src/components/projectHome/slots/SlotsContainer.jsx`).
 *
 * Reine Layout-Slot-Shell für eine breakpoint-gefilterte, geordnete Reihe von
 * Slot-Knoten (z.B. Bottom-Slots der ProjectHome). KEINE Domäne, KEINE
 * Slot-Registry, KEIN Import einer konkreten Komponente. Wo die Quelle eine
 * importierte `slotRegistry` iterierte (`enabled`-Filter, `mobile`-Filter,
 * `order`-Sortierung, Component-Instanziierung mit projectId/projectSlug), nimmt
 * das Template die fertig zu rendernden Slots als generische Prop entgegen — die
 * aufrufende View besitzt die Registry und reicht nur die sichtbaren Knoten
 * durch. Damit ist die Shell wiederverwendbar für jede Art Slot-Reihe.
 *
 * GEHOBENE KOPPLUNG: `slotRegistry` (importierte Domänen-Registry inkl.
 * enabled/mobile/order-Filterung + Slot-Component-Props projectId/projectSlug)
 * → generische `slots`-Prop (Array<{ id, node }> oder ReactNode[]). Filterung &
 * Sortierung passieren beim Aufrufer, BEVOR die Slots reingereicht werden.
 *
 * Token-clean: Styling ausschließlich über Catppuccin-Tokens als
 * Tailwind-Arbitrary-Value-Klassen (ZERO inline style, kein Roh-Hex/px).
 *
 * @param {object} props
 * @param {Array<{id?: string|number, node: React.ReactNode}>|React.ReactNode[]} [props.slots]
 *        - bereits gefilterte & geordnete Slot-Knoten. Entweder Objekte
 *          ({ id, node }) oder nackte ReactNodes. Leeres/leer-gefiltertes Array
 *          → die Shell rendert `null` (wie die Quelle bei `visible.length === 0`).
 * @param {boolean} [props.mobile=false] - Mobile-Breakpoint-Flag. Wirkt rein
 *        layouterisch (vertikaler Stapel statt Reihe); die Slot-Auswahl pro
 *        Breakpoint trifft der Aufrufer beim Befüllen von `slots`.
 * @param {boolean} [props.collapsed=false] - Collapsed-Flag. Reicht nur als
 *        data-Attribut/Layout-Hint durch; die Slot-Knoten reagieren selbst.
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Container.
 * @param {string} [props.dataUiScope='slots-container'] - data-ui-Wurzel; Sub-Anker
 *        gepunktet abgeleitet (z.B. `${dataUiScope}.slot`).
 * @param {React.ReactNode} [props.children] - Alternative zu `slots`: direkt
 *        eingebettete Slot-Knoten. Wird genutzt, wenn `slots` nicht gesetzt ist.
 */
export default function SlotsContainer({
  slots,
  mobile = false,
  collapsed = false,
  className = '',
  dataUiScope = 'slots-container',
  children,
}) {
  const items = Array.isArray(slots) ? slots : null

  if (items && items.length === 0) return null

  // Mobile → vertikaler Stapel; Desktop → umbrechende Reihe (order = Aufruferseite).
  const flowClass = mobile
    ? 'flex flex-col gap-3'
    : 'flex flex-wrap items-stretch gap-4'

  return (
    <div
      data-ui={dataUiScope}
      data-mobile={mobile ? 'true' : 'false'}
      data-collapsed={collapsed ? 'true' : 'false'}
      className={`${flowClass} text-[var(--text)] ${className}`}
    >
      {items
        ? items.map((slot, i) => {
            const node = slot && typeof slot === 'object' && 'node' in slot ? slot.node : slot
            const key = (slot && typeof slot === 'object' && slot.id != null) ? slot.id : i
            return (
              <div
                key={key}
                data-ui={`${dataUiScope}.slot`}
                data-slot-index={i}
                className="min-w-0"
              >
                {node}
              </div>
            )
          })
        : children}
    </div>
  )
}
