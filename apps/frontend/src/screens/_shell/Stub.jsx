// src/screens/_shell/Stub.jsx
// Routen-Platzhalter, bis ein Screen aus dem Storybook-Katalog promotet wird
// (Promote-Loop Phase 3). Token-konform, trägt einen data-ui-Anker je Screen.
// Der Frame liefert Rail+Topbar — der Stub füllt nur den Outlet-Content.
export default function Stub({ name, title }) {
  return (
    <div
      data-ui={`screen:${name}.placeholder`}
      className="flex flex-col items-center justify-center gap-[var(--space-2)] py-[var(--space-7)] text-center"
    >
      <span className="[font-family:var(--font-display)] text-[15px] font-semibold text-[var(--text)]">
        {title || name}
      </span>
      <span className="text-[13px] text-[var(--subtext0)]">
        Platzhalter — Screen wird aus dem Storybook-Katalog promotet.
      </span>
    </div>
  )
}
