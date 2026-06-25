// Drift-Gate: hält OpenAPI-Doku und Code konsistent.
//  1. Jede in server/api.js definierte Route MUSS in der Registry registriert sein.
//  2. Kein verwaister Registry-Eintrag ohne Route in api.js.
//  3. Das committete openapi.json MUSS dem Regenerat entsprechen.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getRouteKeys, routeKey } from '../../openapi/registry.js';
import { buildSpec } from '../../openapi/generate.js';
import '../../openapi/routes.def.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const API = join(ROOT, 'server', 'api.js');
const OPENAPI = join(ROOT, 'openapi', 'openapi.json');

/** Alle app.METHOD('/path')-Routen aus api.js extrahieren. */
function routesFromApi() {
  const src = readFileSync(API, 'utf8');
  const re = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
  const keys = new Set();
  let m;
  while ((m = re.exec(src)) !== null) {
    keys.add(routeKey(m[1], m[2]));
  }
  return keys;
}

describe('OpenAPI drift gate', () => {
  it('registriert jede REST-Route aus server/api.js', () => {
    const apiKeys = routesFromApi();
    const regKeys = getRouteKeys();
    const missing = [...apiKeys].filter((k) => !regKeys.has(k)).sort();
    expect(missing, `Nicht registriert (→ openapi/routes.def.js ergänzen):\n${missing.join('\n')}`).toEqual([]);
  });

  it('hat keine verwaisten Registry-Einträge', () => {
    const apiKeys = routesFromApi();
    const regKeys = getRouteKeys();
    const stale = [...regKeys].filter((k) => !apiKeys.has(k)).sort();
    expect(stale, `Verwaist (Route fehlt in api.js):\n${stale.join('\n')}`).toEqual([]);
  });

  it('openapi.json ist aktuell (Regenerat == committet)', () => {
    expect(existsSync(OPENAPI), 'openapi.json fehlt — npm run gen:openapi').toBe(true);
    const committed = readFileSync(OPENAPI, 'utf8');
    const fresh = JSON.stringify(buildSpec(), null, 2) + '\n';
    expect(fresh, 'openapi.json veraltet — npm run gen:openapi').toEqual(committed);
  });
});
