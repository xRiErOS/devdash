// DD-346 (DD#47): Settings-Tab embeddet die bestehende ProjectSettings-View
// (Wiederverwendung, kein Duplikat). embedded=true unterdrückt deren Back-Link + H1-Header,
// da ProjectHomeView Breadcrumb + H1 liefert. Scope: vollständige projekt-bezogene
// Settings; globale-vs-projekt-Trennung ist auf DD#48 (Q03/D05) vertagt.

import ProjectSettings from '../../../views/ProjectSettings.jsx'

export default function SettingsTab() {
  return (
    <section
      role="tabpanel"
      id="tabpanel-settings"
      aria-labelledby="tab-settings"
      data-ui="project-home.tabs.settings"
    >
      <ProjectSettings embedded />
    </section>
  )
}
