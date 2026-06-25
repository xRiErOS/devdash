// src/screens/_shell/Providers.jsx
// Fester Provider-Stack. Reihenfolge: Debug (äußerst) > PageChrome > ConfirmDialog.
// useTheme ist ein Hook (kein Provider) und wird im Frame aufgerufen.
import { DebugProvider } from '../../contexts/DebugContext.jsx'
import { PageChromeProvider } from '../../lib/pageChrome.jsx'
import { ConfirmDialogProvider } from '../../contexts/ConfirmDialogContext.jsx'

export function Providers({ children }) {
  return (
    <DebugProvider>
      <PageChromeProvider>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </PageChromeProvider>
    </DebugProvider>
  )
}
