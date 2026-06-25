// OpenAPI-Registry — Single Source der REST-Path→Schema-Bindung (I02).
//
// NICHT-invasiv: Contracts (contracts/*.contracts.js) und das Route-Monolith
// (server/api.js) bleiben unangetastet. Hier wird jede REST-Route EINMAL deklarativ
// an ihr(e) Zod-Schema(s) gebunden. Der Generator (openapi/generate.js) liest diese
// Registry und emittiert openapi/openapi.json (OpenAPI 3.1) via Zod-4 z.toJSONSchema.
//
// Drift-Gate (tests/openapi/drift.test.js):
//   1. jede `app.METHOD('/path')` in server/api.js MUSS hier registriert sein,
//   2. das committete openapi.json MUSS dem Regenerat entsprechen.
// → Neue Route ohne Registry-Eintrag bricht CI. Doku kann nicht still driften.
//
// Pfad-Notation: api.js-Stil mit `:param` (z.B. '/api/backlog/:id'). Der Generator
// konvertiert nach OpenAPI-`{param}`. Method = Großbuchstaben ('GET'|'POST'|...).

/** @type {Array<RouteSpec>} */
const routes = [];

/**
 * @typedef {Object} RouteSpec
 * @property {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @property {string} path                 api.js-Stil mit :param
 * @property {string} tag                  Gruppierung (entity)
 * @property {string} summary              kurze Beschreibung
 * @property {import('zod').ZodTypeAny} [params]  Pfad-Parameter (z.object)
 * @property {import('zod').ZodTypeAny} [query]   Query-Parameter (z.object)
 * @property {import('zod').ZodTypeAny} [body]    Request-Body (application/json)
 * @property {import('zod').ZodTypeAny} [res]     Response-Body (application/json)
 * @property {number} [status]             Erfolgs-Status (default 200)
 * @property {boolean} [deprecated]
 */

/**
 * Registriert eine REST-Route.
 * @param {RouteSpec} spec
 */
export function register(spec) {
  if (!spec || !spec.method || !spec.path) {
    throw new Error(`register(): method + path Pflicht, bekam ${JSON.stringify(spec)}`);
  }
  routes.push(spec);
}

/** Stabil sortierter Schlüssel "METHOD path" — für Drift-Vergleich. */
export function routeKey(method, path) {
  return `${String(method).toUpperCase()} ${path}`;
}

/** Alle registrierten Routes (Einfüge-Reihenfolge = Generat-Reihenfolge). */
export function getRoutes() {
  return routes;
}

/** Set aller registrierten "METHOD path"-Schlüssel. */
export function getRouteKeys() {
  return new Set(routes.map((r) => routeKey(r.method, r.path)));
}
