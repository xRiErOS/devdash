---
type:
description: "Storybook vom Mac ueber Tailscale am ThinkPad: npm run storybook:remote (-h 0.0.0.0), allowedHosts, Troubleshooting"
tags: []
aliases: []
relates_to:
uid: 1cfe64a6-bc18-4e67-9a86-375f0854b50a
title: Storybook ueber Tailscale
---

# Storybook über Tailscale (Mac → ThinkPad-Remote-Review)

Storybook vom Mac hosten, vom ThinkPad im Browser ansehen — über das Tailscale-Netz.

## Voraussetzung — Playwright-Chromium (einmalig)

`@storybook/addon-vitest` bootet beim Dev-Start einen Vitest-Browser-Runner

(`@vitest/browser-playwright`). Ohne installiertes Playwright-Chromium hängt der

Boot → 30s-Timeout → `storybook dev` bricht mit **exit 1** ab (`Failed to start

test runner process`). Einmalig im Repo-Root installieren:

```bash
npx playwright install chromium
```

Danach bootet Storybook sauber. (Alternative wäre, `@storybook/addon-vitest` aus

`addons` in `.storybook/main.js` zu nehmen — verworfen, würde den CT-Runner

wegwerfen.)

## Start (Mac)

```bash
cd apps/frontend
npm run storybook:remote
```

Das Script bindet an alle Interfaces statt nur `localhost`:

```
storybook dev -c .storybook -p 6006 -h 0.0.0.0 --no-open
```

`-h 0.0.0.0` ist der einzige Unterschied zu `npm run storybook` — ohne das lauscht

Storybook nur auf `127.0.0.1` und ist über die Tailscale-IP nicht erreichbar.

## Zugriff (ThinkPad)

Mac-Tailscale-IP ermitteln (auf dem Mac):

```bash
tailscale ip -4          # z.B. 100.85.223.39  (Host: mac-mini-von-erik)
```

Im ThinkPad-Browser:

```
http://<mac-tailscale-ip>:6006
```

## Warum kein `allowedHosts`-Edit nötig

`.storybook/main.js` setzt bereits:

- `core.allowedHosts: true` — deaktiviert die Storybook-10-eigene Host-Header-
  Validierung (sonst `403 Invalid host` für den Tailscale-Hostnamen).
- `viteFinal` → `server.host: true`, `server.allowedHosts: true` — gleiches für den
  darunterliegenden Vite-Dev-Server.

`true` ist offener als eine Wildcard-IP-Liste (`100.*.*.*`) — für ein reines

LAN/Tailscale-Review-Setup gewollt. **Nicht** auf einem öffentlich erreichbaren Host

verwenden.

## Troubleshooting

| Symptom | Ursache / Fix |
|---|---|
| `refused to connect` | Tailscale auf beiden Geräten aktiv? `tailscale status` prüfen. |
| `403 Invalid host` | `core.allowedHosts` in `.storybook/main.js` fehlt → siehe oben. |
| `exit 1`, `Failed to start test runner process` / 30s-Timeout | Playwright-Chromium fehlt → `npx playwright install chromium` (siehe Voraussetzung). |
| Boot hängt bei 0 % | `rm -rf node_modules/.vite node_modules/.cache`, neu starten. |
| `NoStoryMatchError` beim Öffnen | Veraltete Last-Viewed-Story-ID im Browser-State, harmlos — andere Story wählen. |
| Port belegt | `lsof -ti tcp:6006 \| xargs kill -9`, neu starten. |
| Nur `127.0.0.1` erreichbar | `-h 0.0.0.0` vergessen → `npm run storybook:remote` nutzen. |

Erreichbarkeit verifizieren (Mac): `curl -sf -o /dev/null -w "%{http_code}\n" http://<mac-tailscale-ip>:6006/` → `200`.
