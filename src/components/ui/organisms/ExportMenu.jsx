import { useEffect, useRef, useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import Button from '../atoms/Button.jsx'
import PopoverPanel from '../atoms/PopoverPanel.jsx'

/**
 * ExportMenu — DD#61 Organism (harvest aus components/ExportMenu.jsx).
 * Domänen-bewusst: konsolidiertes Export-Format-Dropdown für Backlog & Sprint-
 * Review (DD-149). Kennt das Export-Vokabular (Markdown/CSV-Formate, Download)
 * → ORGANISM-Tier. Komponiert das Button-Atom (Trigger) + PopoverPanel-Atom
 * (Float-Hülle) statt inline neu zu bauen.
 *
 * PRESENTATIONAL — gehobene Kopplung (D-Phase3-01):
 * - Die Quelle hatte keinen fetch/Store/useEffect-Datenlade-Pfad; `formats` kam
 *   bereits als Prop rein (Liste von {label, href, title}). Diese Datenherkunft
 *   bleibt als Prop. NEU additiv: `onExport(format)`-Callback für den Mutations-/
 *   Aktions-Pfad — Items ohne `href` rendern als Button und feuern `onExport`,
 *   Items mit `href` bleiben Download-Links (verlustfreies Markup).
 * - BEHALTEN (ephemerer UI-State): `open`-useState, `ref`-useRef, Outside-Click-
 *   + Escape-useEffect. Kein Daten-State.
 *
 * @param {object} props
 * @param {Array<{label:string, href?:string, title?:string}>} props.formats - Export-Formate (extern)
 * @param {string} [props.label='Export'] - Trigger-Label
 * @param {(format:{label:string,href?:string,title?:string}) => void} [props.onExport] - Aktion bei Item-Klick (Items ohne href)
 * @param {string} [props.dataUiScope='export-menu'] - parametrisierter data-ui-Wurzelbereich (I03/D01)
 * @param {string} [props.className]
 */
export default function ExportMenu({
  formats = [],
  label = 'Export',
  onExport,
  dataUiScope = 'export-menu',
  className = '',
  ...rest
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleItem = (f) => {
    setOpen(false)
    if (!f.href && onExport) onExport(f)
  }

  return (
    <div data-ui={dataUiScope} className={`relative ${className}`} ref={ref} {...rest}>
      <Button
        variant="secondary"
        size="md"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${label} (Markdown / CSV)`}
        data-ui={`${dataUiScope}.trigger`}
        leadingIcon={<Download size={13} />}
        trailingIcon={<ChevronDown size={12} className="opacity-60" />}
      >
        {label}
      </Button>
      {open && (
        <PopoverPanel align="right" data-ui={`${dataUiScope}.panel`} className="min-w-[140px] py-1">
          {formats.map(f => (
            f.href ? (
              <a
                key={f.label}
                href={f.href}
                role="menuitem"
                onClick={() => handleItem(f)}
                className="block px-3 py-1.5 text-xs text-[var(--text)]"
                title={f.title}
                data-ui={`${dataUiScope}.panel.item`}
              >
                {f.label}
              </a>
            ) : (
              <button
                key={f.label}
                type="button"
                role="menuitem"
                onClick={() => handleItem(f)}
                className="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)]"
                title={f.title}
                data-ui={`${dataUiScope}.panel.item`}
              >
                {f.label}
              </button>
            )
          ))}
        </PopoverPanel>
      )}
    </div>
  )
}
