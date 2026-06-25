// DD-675 — Single Source für Toast-Feedback.
//
// Vereinheitlicht den zuvor mehrfach duplizierten Inline-Helper (u.a. SstdTab):
// feuert ein window-CustomEvent `devd-toast`, das der globale ToastHost in
// components/ui/layout/Layout.jsx einsammelt (5s Auto-Dismiss).
//
// kind ∈ 'success' | 'error' | 'info' — ToastHost mappt auf var(--green)/
// var(--red)/var(--surface1). SSR-/Non-Browser-safe (no-op ohne window).

/**
 * Feuert einen globalen Toast.
 * @param {string} message - Anzuzeigender Text
 * @param {'success'|'error'|'info'} [kind='info'] - Toast-Variante
 */
export function toast(message, kind = 'info') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('devd-toast', { detail: { message, kind } }))
}
