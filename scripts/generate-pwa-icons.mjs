#!/usr/bin/env node
// DD-226: Generate PWA icon set + apple-touch-icon from public/favicon.svg.
// Re-run with `node scripts/generate-pwa-icons.mjs` whenever the source SVG changes.
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svgSrc = readFileSync(resolve(root, 'public/favicon.svg'))

// Apple-touch-icon: 180×180, no transparency (iOS adds its own rounded corners).
// We render onto an opaque mantle background to avoid the iOS "white-square" bug
// where SVG with transparency on iOS renders the alpha as pure white.
// B01 (2026-06-03): aligned to Catppuccin Macchiato crust #181926 to match the badge fill.
const MANTLE = { r: 0x18, g: 0x19, b: 0x26 }
const PEACH = { r: 0xf5, g: 0xa9, b: 0x7f }

async function flatPng(size, outName, { background = MANTLE } = {}) {
  const out = resolve(root, 'public', outName)
  await sharp(svgSrc, { density: 600 })
    .resize(size, size, { fit: 'contain', background })
    .flatten({ background })
    .png({ compressionLevel: 9 })
    .toFile(out)
  return out
}

async function maskablePng(size, outName) {
  // Maskable: safe-zone is the inner 80% (centered). We render the source SVG
  // at 80% size on a mantle-filled square so launcher masks don't clip the
  // "DD"-glyph.
  const out = resolve(root, 'public', outName)
  const innerSize = Math.round(size * 0.8)
  const innerBuf = await sharp(svgSrc, { density: 600 })
    .resize(innerSize, innerSize, { fit: 'contain', background: MANTLE })
    .flatten({ background: MANTLE })
    .png()
    .toBuffer()
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: MANTLE,
    },
  })
    .composite([{ input: innerBuf, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(out)
  return out
}

async function favicon() {
  // 32×32 ico equivalent — modern browsers accept PNG for /favicon.ico requests
  // when content-type is set, but we still keep favicon.svg as the primary.
  const out = resolve(root, 'public/favicon.png')
  await sharp(svgSrc, { density: 600 })
    .resize(32, 32, { fit: 'contain', background: MANTLE })
    .flatten({ background: MANTLE })
    .png()
    .toFile(out)
  return out
}

const generated = []
generated.push(await favicon())
generated.push(await flatPng(180, 'apple-touch-icon.png'))
generated.push(await flatPng(192, 'icons/pwa-192x192.png'))
generated.push(await flatPng(512, 'icons/pwa-512x512.png'))
generated.push(await maskablePng(512, 'icons/pwa-maskable-512x512.png'))

for (const path of generated) console.log('wrote', path)
