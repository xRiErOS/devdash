/**
 * ToolHomeScreen — globaler Lobby-Screen (presentational).
 * Zeigt alle nicht-archivierten Projekte als Grid + AddProjectCard.
 * Zustände: Loading (3× Skeleton), Populated, Empty, Error.
 *
 * @param {object} props
 * @param {Array} [props.projects=[]]
 * @param {boolean} [props.isLoading=false]
 * @param {string|null} [props.error=null]
 * @param {(slug:string)=>void} props.onProjectSelect
 * @param {()=>void} [props.onCreateProject]
 * @param {string} [props.dataUiScope='screen.toolHome']
 */
import Icon from '../foundations/Icon.jsx'
import ProjectCard from '../organisms/base/ProjectCard.jsx'

function SkeletonCard({ dataUiScope }) {
  return (
    <div
      data-ui={dataUiScope}
      aria-hidden="true"
      className="min-h-[196px] rounded-lg border border-[var(--border)] bg-[var(--mantle)] animate-pulse overflow-hidden"
    >
      <div className="h-[3px] w-full bg-[var(--surface2)]" />
      <div className="flex flex-col gap-[var(--space-3)] p-[var(--space-3)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <div className="h-4 w-10 rounded-sm bg-[var(--surface1)]" />
          <div className="h-4 flex-1 rounded-sm bg-[var(--surface1)]" />
        </div>
        <div className="h-3 w-full rounded-sm bg-[var(--surface0)]" />
        <div className="h-3 w-3/4 rounded-sm bg-[var(--surface0)]" />
        <div className="flex gap-[var(--space-1)] mt-[var(--space-2)]">
          <div className="h-4 w-16 rounded-sm bg-[var(--surface0)]" />
          <div className="h-4 w-16 rounded-sm bg-[var(--surface0)]" />
        </div>
      </div>
    </div>
  )
}

function AddProjectCard({ onCreateProject, dataUiScope = 'organism.addProjectCard' }) {
  return (
    <button
      type="button"
      data-ui={dataUiScope}
      onClick={() => onCreateProject?.()}
      aria-label="Neues Projekt anlegen"
      className="min-h-[196px] w-full rounded-lg border-2 border-dashed border-[var(--surface2)] bg-transparent hover:bg-[var(--mantle)] hover:border-[var(--accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] transition-colors flex flex-col items-center justify-center gap-[var(--space-2)]"
    >
      <Icon name="add" size={20} mono />
      <span className="[font-family:var(--font-display)] text-[13px] font-medium text-[var(--subtext0)]">
        Neues Projekt
      </span>
    </button>
  )
}

function EmptyState({ onCreateProject, dataUiScope }) {
  return (
    <div
      data-ui={dataUiScope}
      className="flex flex-col items-center justify-center gap-[var(--space-4)] py-[var(--space-10)] text-center"
    >
      <Icon name="backlog" size={32} mono />
      <div className="flex flex-col gap-[var(--space-1)]">
        <p className="[font-family:var(--font-display)] text-[15px] font-semibold text-[var(--text)]">
          Noch keine Projekte
        </p>
        <p className="[font-family:var(--font-display)] text-[13px] text-[var(--subtext0)]">
          Leg das erste Projekt an, um loszulegen.
        </p>
      </div>
      {onCreateProject && (
        <button
          type="button"
          onClick={onCreateProject}
          className="[font-family:var(--font-display)] text-[13px] font-medium text-[var(--accent-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
        >
          Erstes Projekt anlegen
        </button>
      )}
    </div>
  )
}

export default function ToolHomeScreen({
  projects = [],
  isLoading = false,
  error = null,
  onProjectSelect,
  onCreateProject,
  dataUiScope = 'screen.toolHome',
}) {
  const visible = isLoading ? [] : projects.filter((p) => p.archived === 0)

  return (
    <div data-ui={dataUiScope} className="flex flex-col gap-[var(--space-4)]">
      {/* Header */}
      <div data-ui={`${dataUiScope}.header`} className="flex items-center justify-between">
        <h1 className="[font-family:var(--font-display)] text-[20px] font-bold text-[var(--text)]">
          Projekte
        </h1>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          data-ui={`${dataUiScope}.error`}
          className="[font-family:var(--font-display)] text-[13px] text-[var(--accent-danger)] bg-[var(--surface0)] border border-[var(--accent-danger)] rounded-md px-[var(--space-3)] py-[var(--space-2)]"
        >
          {error}
        </div>
      )}

      {/* Grid — Loading */}
      {isLoading ? (
        <div
          data-ui={`${dataUiScope}.grid`}
          aria-busy="true"
          className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[var(--space-4)]"
        >
          <SkeletonCard dataUiScope={`${dataUiScope}.skeleton-1`} />
          <SkeletonCard dataUiScope={`${dataUiScope}.skeleton-2`} />
          <SkeletonCard dataUiScope={`${dataUiScope}.skeleton-3`} />
        </div>
      ) : visible.length === 0 ? (
        /* Grid — Empty */
        <EmptyState onCreateProject={onCreateProject} dataUiScope={`${dataUiScope}.empty`} />
      ) : (
        /* Grid — Populated */
        <div
          data-ui={`${dataUiScope}.grid`}
          className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[var(--space-4)]"
        >
          {visible.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={onProjectSelect}
              dataUiScope={`${dataUiScope}.card-${p.slug}`}
            />
          ))}
          <AddProjectCard
            onCreateProject={onCreateProject}
            dataUiScope={`${dataUiScope}.add`}
          />
        </div>
      )}
    </div>
  )
}
