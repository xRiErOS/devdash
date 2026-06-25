// GF-2 /dd-screen T03 — BacklogPage (connected). Verdrahtet den Container-Hook
// useBacklog mit dem präsentationalen BacklogScreen und hängt den Issue-anlegen-
// Flow (IssueCreateModal, vorhandenes Prod-Organism, D03) an das vom Screen
// gefeuerte 'devd-backlog-create'-Event. Das ist der Import-Ziel der Strangler-
// Route (_shell/routes.jsx, D17-A).
import { useCallback, useEffect, useState } from 'react'
import { ISSUE_TYPES } from '@devd/api-types/backlog.contracts.js'
import BacklogScreen from './BacklogScreen.jsx'
import { useBacklog } from './useBacklog.js'
import IssueCreateModal from '../../components/ui/organisms/IssueCreateModal.jsx'

const TYPE_OPTIONS = ISSUE_TYPES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))
const PRIORITY_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `P${n}` }))

export default function BacklogPage() {
  const screen = useBacklog()
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [tagIds, setTagIds] = useState([])

  useEffect(() => {
    const open = () => { setCreateError(''); setTagIds([]); setCreateOpen(true) }
    window.addEventListener('devd-backlog-create', open)
    return () => window.removeEventListener('devd-backlog-create', open)
  }, [])

  const handleCreate = useCallback(async (issue) => {
    setSaving(true)
    setCreateError('')
    const ok = await screen.onCreate({ ...issue, tag_ids: tagIds })
    setSaving(false)
    if (ok) setCreateOpen(false)
    else setCreateError('Anlegen fehlgeschlagen — Eingaben prüfen.')
  }, [screen, tagIds])

  return (
    <>
      <BacklogScreen {...screen} />
      <IssueCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        saving={saving}
        error={createError}
        typeOptions={TYPE_OPTIONS}
        priorityOptions={PRIORITY_OPTIONS}
        tagIds={tagIds}
        onTagsChange={setTagIds}
      />
    </>
  )
}
