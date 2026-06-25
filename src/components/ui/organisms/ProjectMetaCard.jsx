/**
 * ProjectMetaCard — Organism (DD-481 Phase 5 Gap G3, Projekt-Home Overview).
 *
 * Domänen-bewusste Einheit: kompakte, READ-ONLY Stammdaten-Übersicht eines
 * Projekts (ID, Slug, Name, Präfix, Repo, Vault) mit einer einzigen
 * „Copy-für-AI-Agent"-Action im Header. Bewusst KEIN Edit-Formular — die
 * editierbare Variante ist `ProjectMetadataCard` (Settings). Komponiert die
 * Atoms Card + IconButton + das Layout-Primitive Cluster.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API/useEffect-Datenladen. Das
 * Projekt kommt als Prop; die Copy-Action ist zur Callback-Prop `onCopyForAi`
 * gehoben (der Konsument baut den Clipboard-Text). Kein eigener State.
 *
 * TOKEN-CLEAN: 0 inline-style-Literale, 0 Raw-Hex. Werte als read-only
 * Token-Chips (surface0), Pfade mono + truncate — gerendert über das kanonische
 * Molecule MetaFieldGrid (Extract 2026-06-07, Drift-Schutz: Sprint-Meta in
 * Screens/Sprint-Details nutzt dasselbe Grid).
 *
 * @param {object} props
 * @param {object} [props.project={}] - { id, slug, name, prefix, repo_path, vault_path }
 * @param {()=>void} [props.onCopyForAi] - Copy-Action „Meta für AI-Agent kopieren"
 * @param {string} [props.title='Projekt-Meta'] - Card-Titel
 * @param {string} [props.dataUiScope='project-meta-card'] - Wurzel-data-ui-bereich (I03/D01)
 * @param {string} [props.className] - zusätzliche Klassen
 */
import { Check, Copy } from 'lucide-react'
import Card from '../atoms/Card.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Cluster from '../layout/Cluster.jsx'
import MetaFieldGrid from '../molecules/MetaFieldGrid.jsx'
import useCopyFeedback from '../../../hooks/useCopyFeedback.js'

export default function ProjectMetaCard({
  project = {},
  onCopyForAi,
  title = 'Projekt-Meta',
  dataUiScope = 'project-meta-card',
  className = '',
}) {
  const id = project.id != null ? String(project.id) : ''

  // DD-675: einheitliches Copy-Feedback (transienter Check + Toast). onCopyForAi
  // liefert den Clipboard-Text; das Schreiben übernimmt der Hook. SYNCHRON (kein
  // await vor dem Hook-copy): writeText muss im selben Klick-Tick starten, sonst
  // verfällt die User-Geste auf Safari/Firefox (DD-493 NotAllowedError).
  const { copied, copy } = useCopyFeedback()
  const handleCopy = () => {
    const text = onCopyForAi ? onCopyForAi() : null
    if (typeof text === 'string') copy(text, 'Projekt-Meta kopiert')
  }

  return (
    <Card tone="mantle" data-ui={dataUiScope} className={className}>
      <Cluster justify="between" className="mb-3 flex-nowrap">
        <h3 data-ui={`${dataUiScope}.title`} className="m-0 text-[13px] font-bold text-[var(--text)]">
          {title}
        </h3>
        <IconButton
          size="sm"
          icon={
            copied ? (
              <Check size={14} aria-hidden="true" className="text-[var(--accent-success)]" />
            ) : (
              <Copy size={14} aria-hidden="true" />
            )
          }
          label={copied ? 'Kopiert' : 'Meta für AI-Agent kopieren'}
          variant="default"
          onClick={handleCopy}
          data-ui={`${dataUiScope}.copy`}
        />
      </Cluster>

      <MetaFieldGrid
        dataUiScope={dataUiScope}
        fields={[
          { label: 'ID', value: id, mono: true, anchor: 'id' },
          { label: 'Slug', value: project.slug, mono: true, anchor: 'slug' },
          { label: 'Name', value: project.name, anchor: 'name' },
          { label: 'Präfix', value: project.prefix, mono: true, anchor: 'prefix' },
          { label: 'Repo', value: project.repo_path, mono: true, anchor: 'repo' },
          { label: 'Vault', value: project.vault_path, mono: true, anchor: 'vault' },
        ]}
      />
    </Card>
  )
}
