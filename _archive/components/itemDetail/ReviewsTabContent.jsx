import StatusBadge from '../ui/atoms/StatusBadge.jsx'
import { renderMarkdown } from '../../lib/markdown.js'

export default function ReviewsTabContent({ item, reviews, createReview, creatingReview }) {
  return (
    <>
      <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--mantle)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm" style={{ color: 'var(--subtext0)' }}>Review-Runden ({reviews.length})</h2>
          <button onClick={createReview} disabled={creatingReview}
            data-ui="issue-detail.reviews.add-round"
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--peach)', color: 'var(--on-accent)', minHeight: '36px', opacity: creatingReview ? 0.7 : 1 }}>
            {creatingReview ? '...' : '+ Neue Runde'}
          </button>
        </div>
        {reviews.length === 0 && <p className="text-sm" style={{ color: 'var(--hint)' }}>Noch keine Reviews</p>}
        {reviews.map((r, idx) => (
          <div key={r.id} data-ui={`issue-detail.reviews.round.${r.id}`} className="py-3" style={{ borderBottom: idx < reviews.length - 1 ? '1px solid var(--surface0)' : 'none' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold">Runde {reviews.length - idx}</span>
              {r.review_status && <StatusBadge status={r.review_status === 'passed' ? 'passed' : r.review_status === 'not_passed' ? 'rejected' : 'in_progress'} />}
              <span className="text-xs ml-auto" style={{ color: 'var(--hint)' }}>
                {r.created_at ? new Date(r.created_at).toLocaleString('de-DE') : ''}
              </span>
            </div>
            {r.notes && <div className="text-xs" style={{ color: 'var(--subtext1)' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(r.notes) }} />}
            {r.screenshots?.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {r.screenshots.map(s => (
                  <a key={s.id} href={`/uploads/${s.file_path}`} data-ui={`issue-detail.reviews.round.${r.id}.screenshot.${s.id}`} target="_blank" rel="noreferrer">
                    <img src={`/uploads/${s.file_path}`} alt="Screenshot" className="w-20 h-20 object-cover rounded" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {item.feedback?.length > 0 && (
        <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--mantle)' }}>
          <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--subtext0)' }}>Ältere Review-Historie</h2>
          <div className="space-y-3">
            {item.feedback.map(fb => (
              <div key={fb.id} data-ui={`issue-detail.reviews.history-item.${fb.id}`} className={`p-3 rounded-lg review-${fb.status}`}>
                <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--subtext0)' }}>
                  <span className="font-semibold uppercase">{fb.status.replace('_', ' ')}</span>
                  <span>{new Date(fb.created_at).toLocaleString('de-DE')}</span>
                </div>
                {fb.comment && <p className="text-sm">{fb.comment}</p>}
                {fb.screenshots?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {fb.screenshots.map(s => (
                      <a key={s.id} href={`/uploads/${s.file_path}`} data-ui={`issue-detail.reviews.history-item.${fb.id}.screenshot.${s.id}`} target="_blank" rel="noreferrer">
                        <img src={`/uploads/${s.file_path}`} alt="Screenshot" className="w-20 h-20 object-cover rounded" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
