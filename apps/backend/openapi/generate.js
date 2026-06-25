// OpenAPI-3.1-Generator. Liest die Registry (openapi/registry.js, befüllt durch
// openapi/routes.def.js) und emittiert openapi/openapi.json via Zod-4 z.toJSONSchema.
//
//   node openapi/generate.js            → schreibt openapi/openapi.json
//   node openapi/generate.js --check    → vergleicht, exit 1 bei Drift (CI-Gate)
//
// Zod 4 liefert JSON Schema draft-2020-12 == OpenAPI-3.1-Schema-Dialekt. Pro-Schema
// `$schema` wird gestrippt (in OpenAPI redundant).

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import './routes.def.js'; // Seiteneffekt: register()-Aufrufe füllen die Registry
import { getRoutes } from './registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'openapi.json');

/** $schema rekursiv entfernen (OpenAPI mag es nicht im Component-Schema). */
function stripSchemaKey(node) {
  if (Array.isArray(node)) return node.map(stripSchemaKey);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '$schema') continue;
      out[k] = stripSchemaKey(v);
    }
    return out;
  }
  return node;
}

/** Zod-Schema → bereinigtes JSON Schema. */
function toSchema(zodSchema) {
  return stripSchemaKey(z.toJSONSchema(zodSchema, { target: 'draft-2020-12' }));
}

/** api.js-Pfad (':id') → OpenAPI-Pfad ('{id}'). */
function toOpenApiPath(path) {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/** z.object → OpenAPI-Parameter-Liste für `in`. */
function paramsFromObject(zodObject, location) {
  if (!zodObject) return [];
  const js = toSchema(zodObject);
  const required = new Set(js.required || []);
  return Object.entries(js.properties || {}).map(([name, schema]) => ({
    name,
    in: location,
    required: location === 'path' ? true : required.has(name),
    schema,
  }));
}

export function buildSpec() {
  const paths = {};
  const tagsSet = new Set();

  for (const r of getRoutes()) {
    const oaPath = toOpenApiPath(r.path);
    const method = r.method.toLowerCase();
    tagsSet.add(r.tag);

    const parameters = [
      ...paramsFromObject(r.params, 'path'),
      ...paramsFromObject(r.query, 'query'),
    ];

    const op = {
      tags: [r.tag],
      summary: r.summary || '',
      ...(r.deprecated ? { deprecated: true } : {}),
      ...(parameters.length ? { parameters } : {}),
    };

    if (r.body) {
      op.requestBody = {
        required: true,
        content: { [r.contentType || 'application/json']: { schema: toSchema(r.body) } },
      };
    }

    const status = String(r.status || 200);
    const noBody = status === '204';
    op.responses = {
      [status]: noBody
        ? { description: 'No Content' }
        : r.res
          ? { description: 'OK', content: { 'application/json': { schema: toSchema(r.res) } } }
          : { description: 'OK' },
    };

    paths[oaPath] = paths[oaPath] || {};
    paths[oaPath][method] = op;
  }

  const tags = [...tagsSet].sort().map((name) => ({ name }));

  return {
    openapi: '3.1.0',
    info: {
      title: 'DevDashboard REST API',
      version: '1.0.0',
      description:
        'Generiert aus openapi/registry.js (Zod-Contracts). Wahrheit: server/api.js. ' +
        'Nicht von Hand editieren — `npm run gen:openapi`.',
    },
    servers: [
      { url: 'http://100.71.39.53:3001', description: 'NAS (Tailscale)' },
      { url: 'http://localhost:5556', description: 'Dev' },
    ],
    tags,
    paths,
  };
}

function main() {
  const spec = buildSpec();
  const json = JSON.stringify(spec, null, 2) + '\n';
  const check = process.argv.includes('--check');

  if (check) {
    if (!existsSync(OUT)) {
      console.error('openapi.json fehlt — `npm run gen:openapi`.');
      process.exit(1);
    }
    const current = readFileSync(OUT, 'utf8');
    if (current !== json) {
      console.error('DRIFT: openapi.json veraltet — `npm run gen:openapi`.');
      process.exit(1);
    }
    console.log(`openapi.json aktuell (${getRoutes().length} Routes).`);
    return;
  }

  writeFileSync(OUT, json);
  console.log(`openapi.json geschrieben: ${getRoutes().length} Routes, ${spec.tags.length} Tags.`);
}

// Nur bei Direktaufruf (node openapi/generate.js). Beim Import (Drift-Test nutzt
// buildSpec) NICHT ausführen — sonst überschriebe der Import die geprüfte Datei.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
