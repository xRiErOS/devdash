// DD-283 / DD-252: Promise-basierter Confirm-Dialog statt blockendem
// window.confirm()/window.prompt(). Mountet einmal pro App, alle Consumer holen
// sich confirm()/prompt() via useConfirmDialog().
//
// API:
//   const { confirm, prompt } = useConfirmDialog()
//   const ok = await confirm({ message, title, confirmLabel, danger })
//   const value = await prompt({ message, title, defaultValue, placeholder, required })
//
// confirm returnt boolean. prompt returnt string|null (null=Cancel).
//
// Token-konform (apps/frontend/CLAUDE.md: 0 inline style, 0 Roh-Hex) — Tailwind v4
// Klassen über Catppuccin-Token. DialogShell rendert nur bei offenem State; im
// Boot/Render-Smoke (kein State) ist nur der Provider aktiv.

import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ConfirmDialogContext = createContext(null)

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(null)
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

const BTN_SECONDARY = 'px-[var(--space-4)] py-[var(--space-2)] bg-transparent text-[var(--subtext1)] border border-[var(--border)] rounded-sm text-xs font-semibold [font-family:var(--font-display)]'
const BTN_PRIMARY = 'px-[var(--space-4)] py-[var(--space-2)] bg-[var(--accent-primary)] text-[var(--on-accent)] border-0 rounded-sm text-xs font-semibold [font-family:var(--font-display)] disabled:opacity-50'
const BTN_DANGER = BTN_PRIMARY.replace('bg-[var(--accent-primary)]', 'bg-[var(--accent-danger)]')

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
      className="fixed inset-0 z-[60] grid place-items-center p-[var(--space-4)] bg-[color-mix(in_srgb,var(--crust)_70%,transparent)]"
    >
      <form
        onSubmit={handleSubmit}
        data-ui="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        className="w-[min(420px,100%)] flex flex-col gap-[var(--space-3)] bg-[var(--mantle)] text-[var(--text)] border border-[var(--border)] rounded-lg p-[var(--space-4)] shadow-[0_16px_40px_color-mix(in_srgb,var(--crust)_60%,transparent)]"
      >
        <h3 id="confirm-dialog-title" className="m-0 text-[15px] font-semibold [font-family:var(--font-display)]">
          {state.title}
        </h3>
        <p data-ui="confirm-dialog.message" className="m-0 text-[13px] text-[var(--subtext1)] whitespace-pre-wrap">
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
            className="px-[var(--space-3)] py-[var(--space-2)] min-h-[40px] bg-[var(--surface0)] text-[var(--text)] border border-[var(--border)] rounded-md text-base outline-none"
          />
        )}
        <div className="flex justify-end gap-[var(--space-2)]">
          <button type="button" data-ui="confirm-dialog.cancel" onClick={onCancel} className={BTN_SECONDARY}>
            {state.cancelLabel}
          </button>
          <button
            type="submit"
            data-ui="confirm-dialog.confirm"
            disabled={state.type === 'prompt' && state.required && !value.trim()}
            className={state.danger ? BTN_DANGER : BTN_PRIMARY}
          >
            {state.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
