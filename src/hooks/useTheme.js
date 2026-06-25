import { useEffect, useState } from 'react'

// DD-498: Theme-State + Persistenz, aus der IconSidebar herausgelöst, weil der
// Theme-Toggle in den Header wandert (PO D04). Persistenz unverändert:
// localStorage + data-theme am <html> (gleiches STORAGE_KEY wie zuvor).
const STORAGE_KEY = 'devd-theme'

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return { theme, toggleTheme }
}
