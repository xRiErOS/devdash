import React, { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Dropzone für Bild-Anhänge: File-Picker, Drag&Drop und cmd+v.
 * - onFiles(File[]) wird mit allen akzeptierten Bildern aufgerufen.
 * - listenGlobalPaste=true installiert einen window-paste-Listener während der
 *   Komponenten-Lifetime — nutzbar wenn das umgebende Modal/Detail aktiv ist.
 *   CodeMirror konsumiert seinen eigenen Paste, der globale Handler greift nur,
 *   wenn der Fokus außerhalb des Editors steht.
 */
export default function AttachmentDropzone({
  onFiles,
  label = 'Bild ablegen, einfügen (cmd+v) oder klicken',
  listenGlobalPaste = true,
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

  return (
    <div
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
      className="rounded-lg cursor-pointer transition-colors text-sm flex items-center justify-center"
      style={{
        border: `2px dashed ${over ? 'var(--peach)' : 'var(--surface1)'}`,
        background: over ? 'color-mix(in srgb, var(--peach) 10%, transparent)' : 'var(--surface0)',
        padding: '14px',
        color: 'var(--subtext0)',
        minHeight: '52px',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => { accept(e.target.files); e.target.value = '' }}
      />
      <span>{label}</span>
    </div>
  )
}

/**
 * Bild-Galerie: zeigt entweder server-Pfade (`file_path`) oder pending-Previews
 * mit `preview`-URL aus URL.createObjectURL. onRemove(item) optional.
 */
export function AttachmentGallery({ attachments, onRemove, className = '' }) {
  if (!attachments?.length) return null
  return (
    <div className={`flex gap-2 flex-wrap mt-2 ${className}`}>
      {attachments.map((a, idx) => {
        const src = a.preview || `/uploads/${a.file_path}`
        const key = a.id ?? a.preview ?? idx
        return (
          <div key={key} className="relative group" style={{ width: '80px', height: '80px' }}>
            <a href={src} target="_blank" rel="noreferrer">
              <img
                src={src}
                alt={a.caption || ''}
                className="w-20 h-20 object-cover rounded"
                style={{ background: 'var(--surface1)' }}
              />
            </a>
            {onRemove && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(a) }}
                aria-label="Entfernen"
                title="Entfernen"
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs hidden group-hover:flex items-center justify-center"
                style={{ background: 'var(--accent-danger)' }}
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
