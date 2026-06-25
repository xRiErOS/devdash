import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * AttachmentDropzone — DD-56 Molecule (harvest aus components/AttachmentDropzone.jsx,
 * verlustfrei). Komponiert eine Drop-/Paste-/Klick-Upload-Fläche mit einer
 * Vorschau-Galerie zu einer wiederverwendbaren, generischen Anhang-Einheit.
 * Props-driven (onFiles-Callback), kein Store/Fetch, keine Domänen-Begriffe.
 *
 * Die Remove-Action der Galerie bleibt als bespoke Overlay-Button inline
 * (absolut positioniertes rounded-full Badge) — das IconButton-Atom (rounded-lg,
 * Touch-Target) würde die Optik verändern und wäre damit nicht verlustfrei.
 *
 * @param {object} props
 * @param {(files: File[]) => void} props.onFiles - erhält alle akzeptierten Bilder
 * @param {string} [props.label] - Hinweistext in der Dropzone
 * @param {boolean} [props.listenGlobalPaste=true] - window-paste-Listener während Lifetime
 * @param {Array<{id?: string|number, preview?: string, file_path?: string, caption?: string}>} [props.attachments] - Vorschau-Items
 * @param {(item: object) => void} [props.onRemove] - optional, blendet Remove-Badge ein
 * @param {string} [props.className]
 */
export default function AttachmentDropzone({
  onFiles,
  label = 'Bild ablegen, einfügen (cmd+v) oder klicken',
  listenGlobalPaste = true,
  attachments,
  onRemove,
  className = '',
  ...rest
}) {
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)

  const accept = useCallback((fileList) => {
    const arr = Array.from(fileList || []).filter(f => f.type.startsWith('image/'))
    if (arr.length && onFiles) onFiles(arr)
  }, [onFiles])

  useEffect(() => {
    if (!listenGlobalPaste) return
    const onPaste = (e) => {
      const items = e.clipboardData?.items || []
      const files = []
      for (const it of items) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) files.push(f)
        }
      }
      if (files.length) accept(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [accept, listenGlobalPaste])

  const zoneBorder = over ? 'border-[var(--accent-warning)]' : 'border-[var(--surface1)]'
  const zoneBg = over
    ? 'bg-[color-mix(in_srgb,var(--accent-warning)_10%,transparent)]'
    : 'bg-[var(--surface0)]'

  return (
    <div data-ui="attachment-dropzone" className={className} {...rest}>
      <div
        data-ui="attachment-dropzone.zone"
        onDragOver={e => { e.preventDefault(); if (!over) setOver(true) }}
        onDragLeave={e => { e.preventDefault(); setOver(false) }}
        onDrop={e => {
          e.preventDefault(); setOver(false)
          accept(e.dataTransfer?.files)
        }}
        onClick={() => inputRef.current?.click()}
        tabIndex={0}
        role="button"
        aria-label="Bild-Upload"
        className={`rounded-lg cursor-pointer transition-colors text-sm flex items-center justify-center border-2 border-dashed p-[14px] min-h-[52px] text-[var(--subtext0)] ${zoneBorder} ${zoneBg}`}
      >
        <input
          data-ui="attachment-dropzone.input"
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { accept(e.target.files); e.target.value = '' }}
        />
        <span data-ui="attachment-dropzone.label">{label}</span>
      </div>

      <AttachmentGallery attachments={attachments} onRemove={onRemove} />
    </div>
  )
}

/**
 * AttachmentGallery — zeigt server-Pfade (`file_path`) oder pending-Previews
 * (`preview` aus URL.createObjectURL). onRemove(item) optional → Remove-Badge.
 *
 * @param {object} props
 * @param {Array<object>} [props.attachments]
 * @param {(item: object) => void} [props.onRemove]
 * @param {string} [props.className]
 */
export function AttachmentGallery({ attachments, onRemove, className = '' }) {
  if (!attachments?.length) return null
  return (
    <div data-ui="attachment-dropzone.gallery" className={`flex gap-2 flex-wrap mt-2 ${className}`}>
      {attachments.map((a, idx) => {
        const src = a.preview || `/uploads/${a.file_path}`
        const key = a.id ?? a.preview ?? idx
        return (
          <div key={key} data-ui={`attachment-dropzone.gallery.item.${key}`} className="relative group w-20 h-20">
            <a data-ui={`attachment-dropzone.gallery.preview.${key}`} href={src} target="_blank" rel="noreferrer">
              <img
                src={src}
                alt={a.caption || ''}
                className="w-20 h-20 object-cover rounded bg-[var(--surface1)]"
              />
            </a>
            {onRemove && (
              <button
                data-ui={`attachment-dropzone.gallery.remove.${key}`}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(a) }}
                aria-label="Entfernen"
                title="Entfernen"
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[var(--on-accent)] text-xs hidden group-hover:flex items-center justify-center bg-[var(--accent-danger)]"
              >
                ×
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
