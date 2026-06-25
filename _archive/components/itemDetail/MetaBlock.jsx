export default function MetaBlock({ label, value }) {
  return (
    <div className="px-4 py-3" style={{ borderTop: '1px solid var(--surface0)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--overlay0)' }}>
        {label}
      </div>
      <div className="text-xs leading-snug" style={{ color: 'var(--subtext1)' }}>
        {value}
      </div>
    </div>
  )
}
