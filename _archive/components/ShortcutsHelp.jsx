// DD-499 (Legacy/ui-Dedup): Die frühere Doublette ist zur reinen Re-Export-Hülle
// reduziert. Kanonische, token-saubere Implementierung (Modal + gruppierte
// Default-Shortcuts) lebt in der ui/molecules-Variante (DD-481-Harvest). Live-App
// und Storybook teilen damit EINE Quelle. Props (open/onClose) reichen unverändert
// durch; der Default-Shortcut-Katalog ist dort hinterlegt.
export { default } from './ui/molecules/ShortcutsHelp.jsx'
