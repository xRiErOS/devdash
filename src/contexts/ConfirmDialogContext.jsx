// DD-283 / DD-252 (Hot-Fix-I10/I01): Promise-basierter Confirm-Dialog statt
// blockendem window.confirm()/window.prompt(). Mountet einmal pro App, alle
// Consumer holen sich confirm()/prompt() via useConfirmDialog().
//
// API:
//   const { confirm, prompt } = useConfirmDialog()
//   const ok = await confirm({ message, title, confirmLabel, danger })
//   const value = await prompt({ message, title, defaultValue, placeholder, required })
//
// confirm returnt boolean. prompt returnt string|null (null=Cancel).

import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ConfirmDialogContext = createContext(null)

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(null) // { type, message, title?, ..., resolve }
  const resolverRef = useRef(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        type: 'confirm',
        title: opts?.title || 'Bestätigung',
        message: opts?.message || 'Wirklich fortfahren?',
        confirmLabel: opts?.confirmLabel || 'OK',
        cancelLabel: opts?.cancelLabel || 'Abbrechen',
        danger: !!opts?.danger,
      })
    })
  }, [])

  const prompt = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        type: 'prompt',
        title: opts?.title || 'Eingabe',
        message: opts?.message || '',
        defaultValue: opts?.defaultValue || '',
        placeholder: opts?.placeholder || '',
        required: !!opts?.required,
        confirmLabel: opts?.confirmLabel || 'OK',
        cancelLabel: opts?.cancelLabel || 'Abbrechen',
      })
    })
  }, [])

  const handleResolve = (value) => {
    setState(null)
    if (resolverRef.current) {
      const r = resolverRef.current
      resolverRef.current = null
      r(value)
    }
  }

  return (
    <ConfirmDialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {state && (
        <DialogShell
          state={state}
          onCancel={() => handleResolve(state.type === 'prompt' ? null : false)}
          onConfirm={(v) => handleResolve(state.type === 'prompt' ? v : true)}
        />
      )}
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext)
  if (!ctx) {
    // Fallback: window.confirm/prompt (out-of-provider Smoke-Test/Storybook etc.)
    return {
      confirm: async (opts) => (typeof window !== 'undefined' && window.confirm ? window.confirm(opts?.message || '') : true),
      prompt: async (opts) => (typeof window !== 'undefined' && window.prompt ? window.prompt(opts?.message || '', opts?.defaultValue || '') : ''),
    }
  }
  return ctx
}

function DialogShell({ state, onCancel, onConfirm }) {
  const [value, setValue] = useState(state.defaultValue || '')

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    if (state.type === 'prompt') {
      if (state.required && !value.trim()) return
      onConfirm(value)
    } else {
      onConfirm(true)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  return (
    <div
      data-ui="confirm-dialog.backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
      onKeyDown={handleKey}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.5)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        data-ui="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--mantle)',
          color: 'var(--text)',
          border: '1px solid var(--surface1)',
          borderRadius: 10,
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          fontFamily: 'inherit',
        }}
      >
        <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          {state.title}
        </h3>
        <p data-ui="confirm-dialog.message" style={{ margin: 0, fontSize: 13, color: 'var(--subtext1)', whiteSpace: 'pre-wrap' }}>
          {state.message}
        </p>
        {state.type === 'prompt' && (
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={state.placeholder}
            data-ui="confirm-dialog.input"
            style={{
              padding: '8px 10px',
              background: 'var(--surface0)',
              color: 'var(--text)',
              border: '1px solid var(--surface1)',
              borderRadius: 6,
              fontSize: 16,
              outline: 'none',
              minHeight: 40,
            }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            data-ui="confirm-dialog.cancel"
            onClick={onCancel}
            style={btnSecondary}
          >
            {state.cancelLabel}
          </button>
          <button
            type="submit"
            data-ui="confirm-dialog.confirm"
            disabled={state.type === 'prompt' && state.required && !value.trim()}
            style={state.danger ? btnDanger : btnPrimary}
          >
            {state.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

const btnSecondary = {
  padding: '8px 14px',
  background: 'transparent',
  color: 'var(--subtext1)',
  border: '1px solid var(--surface1)',
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnPrimary = {
  padding: '8px 14px',
  background: 'var(--blue)',
  color: 'var(--on-accent)',
  border: 0,
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnDanger = {
  ...btnPrimary,
  background: 'var(--red)',
}
