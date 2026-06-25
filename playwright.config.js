import { defineConfig, devices } from '@playwright/test'

// DD-267: Playwright-Konfiguration für die Sprint-Card-Milestone-Pill-Acceptance.
// E2E-DB-Isolation via DEVD_DB_PATH override im webServer-Block.
// Eigene Ports (5567/5568) damit ein parallel laufender Dev-Server (5555/5556)
// auf der Production-DB nicht stört. Viewport-Pflicht: 1280px (Laptop).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  globalSetup: './e2e/_fixtures/global-setup.js',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5567',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 8000,
    navigationTimeout: 15000,
    // DD-379: Slug-Routing (DD-368) leitet den Projektkontext aus dem URL-Slug ab.
    // Damit Legacy-Redirects (RootRedirect/legacyTarget via getActiveSlug) und der
    // erste Render deterministisch auf das aktive Projekt 'devd' (project_id 2)
    // auflösen, BEIDE Keys seeden — id UND slug. Ohne den Slug-Key fiele
    // getActiveSlug() auf null zurück → Legacy-Redirects landeten auf /projects.
    storageState: {
      cookies: [],
      origins: [{
        origin: process.env.E2E_BASE_URL || 'http://localhost:5567',
        localStorage: [
          { name: 'devd-active-project-id', value: '2' },
          { name: 'devd-active-project-slug', value: 'devd' },
        ],
      }],
    },
  },
  projects: [
    {
      name: 'chromium-laptop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testIgnore: ['**/dd269/**', '**/dd270/**', '**/dd268/**', '**/dd271/**', '**/dd272/**', '**/dd277/**', '**/dd603/**'],
    },
    // DD-603 (M5d): Mobile-Regression iPhone 14 Pro (393×852, DPR 3). Eigener
    // Device-Descriptor + harter Viewport (volle logische Screen-Höhe statt der
    // verkleinerten Safari-Web-Area), damit Overflow/Touch gegen die ganze Fläche
    // misst. webkit-basiert (defaultBrowserType des Descriptors).
    {
      name: 'mobile-iphone-dd603',
      use: { ...devices['iPhone 14 Pro'], viewport: { width: 393, height: 852 } },
      testMatch: ['**/dd603/**'],
    },
    // DD#41 Acceptance-Gate: chromium + webkit + mobile-chrome für M1-Followup-UIs.
    {
      name: 'chromium-dd41',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testMatch: ['**/dd269/**', '**/dd270/**', '**/dd268/**'],
    },
    {
      name: 'webkit-dd41',
      use: { ...devices['Desktop Safari'] },
      testMatch: ['**/dd269/**', '**/dd270/**', '**/dd268/**'],
    },
    {
      name: 'mobile-chrome-dd41',
      use: { ...devices['Pixel 7'] },
      testMatch: ['**/dd269/**', '**/dd270/**', '**/dd268/**'],
    },
    // DD#40 Acceptance-Gate: chromium + webkit + mobile-chrome für UX-Polish + M0-Followup.
    {
      name: 'chromium-dd40',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testMatch: ['**/dd271/**', '**/dd272/**', '**/dd277/**'],
    },
    {
      name: 'webkit-dd40',
      use: { ...devices['Desktop Safari'] },
      testMatch: ['**/dd271/**', '**/dd272/**', '**/dd277/**'],
    },
    {
      name: 'mobile-chrome-dd40',
      use: { ...devices['Pixel 7'] },
      testMatch: ['**/dd271/**', '**/dd272/**', '**/dd277/**'],
    },
  ],
  // I12: Zwei getrennte webServer-Einträge statt `node api.js & npx vite`.
  // Das alte `&` detachte den API-Server aus Playwrights Prozessgruppe → er
  // überlebte als Orphan über Runs/Sessions hinweg, hielt Port 5568 mit einem
  // FD auf die bereits unlinkte alte DB-Inode → neue Läufe sahen `no such table`
  // für frisch ergänzte Tabellen. Array-Form: Playwright besitzt+killt BEIDE
  // Prozesse und wartet auf den API-Healthcheck (5568), bevor Tests starten —
  // schließt damit sowohl das Readiness-Race als auch die Orphan-Akkumulation.
  webServer: process.env.E2E_BASE_URL ? undefined : [
    {
      // Dedizierte Ports + Inline-Env, damit Production-Dev-Server (5555/5556)
      // ungestört weiterläuft. Healthcheck via /api/projects (Default-Projekt 1).
      command: 'DEVD_DB_PATH=$(pwd)/data/devd.dd267-e2e.db NODE_ENV=test PORT=5568 node server/api.js',
      url: 'http://localhost:5568/api/projects',
      reuseExistingServer: false,
      timeout: 90_000,
    },
    {
      // Eigene vite.config.e2e.js routet /api auf den E2E-API-Port.
      command: 'E2E_API_PORT=5568 E2E_VITE_PORT=5567 npx vite --config vite.config.e2e.js',
      url: 'http://localhost:5567',
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
})
