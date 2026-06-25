import { describe, test, expect } from 'vitest'
import { computeFixedPopoverPosition } from '../../src/components/ui/atoms/PopoverPanel.jsx'

// DD-672 (r3) — Portal-Popover-Positionierung.
//
// Reject Runde 2 (PO): "filter-popover.body nicht vollstaendig sichtbar". Ursache:
// die SprintReview-FilterPopover liegt in der schmalen, overflow:auto Master-Detail-
// Listen-Spalte (~352px); ein 320px-Panel (align=right, mittig im Spaltenheader
// verankert) laeuft links unter den Spaltenrand und wird vom overflow:auto geclippt.
// CSS laesst overflow-x nicht isoliert `visible`, daher entkommt nur ein
// position:fixed-Portal dem Clip.
//
// computeFixedPopoverPosition rechnet die fixed-Koordinaten aus Anker-Rect +
// Panel-Groesse, geclampt an den Viewport (nie links/rechts/unten abgeschnitten),
// mit Flip-nach-oben wenn unten kein Platz ist.

describe('DD-672 (r3) · computeFixedPopoverPosition', () => {
  const VW = 1280
  const VH = 720
  const panel = { width: 320, height: 200 }

  test('align=left: Panel-Left = Anker-Left, Top unter dem Anker', () => {
    const anchor = { left: 400, right: 488, top: 100, bottom: 130 }
    const pos = computeFixedPopoverPosition(anchor, panel, VW, VH, 'left')
    expect(pos.left).toBe(400)
    expect(pos.top).toBe(134) // bottom + gap(4)
  })

  test('align=right: Panel-Right = Anker-Right (Left = right - width)', () => {
    const anchor = { left: 700, right: 788, top: 100, bottom: 130 }
    const pos = computeFixedPopoverPosition(anchor, panel, VW, VH, 'right')
    expect(pos.left).toBe(788 - 320) // 468
  })

  test('clamp links: ein nach links ueberlaufendes Panel bleibt >= margin (8)', () => {
    // SprintReview-Repro: align=right, schmale Spalte, anchor.right=345 → left=25 < 8? nein,
    // aber anchor.right=300 → left=-20 → geclampt auf 8.
    const anchor = { left: 250, right: 300, top: 400, bottom: 430 }
    const pos = computeFixedPopoverPosition(anchor, panel, VW, VH, 'right')
    expect(pos.left).toBe(8)
  })

  test('clamp rechts: Panel laeuft nicht ueber den rechten Viewport-Rand', () => {
    const anchor = { left: 1200, right: 1260, top: 100, bottom: 130 }
    const pos = computeFixedPopoverPosition(anchor, panel, VW, VH, 'left')
    expect(pos.left).toBe(VW - 320 - 8) // 952
  })

  test('flip nach oben: kein Platz unten → Panel ueber den Anker', () => {
    const tall = { width: 320, height: 300 }
    const anchor = { left: 400, right: 488, top: 600, bottom: 640 }
    const pos = computeFixedPopoverPosition(anchor, tall, VW, VH, 'left')
    // unten: 640+4+300=944 > 720-8 → flip: top = 600 - 4 - 300 = 296
    expect(pos.top).toBe(296)
  })

  test('Top nie negativ (Clamp auf margin)', () => {
    const anchor = { left: 400, right: 488, top: 0, bottom: 4 }
    const pos = computeFixedPopoverPosition(anchor, panel, VW, VH, 'left')
    expect(pos.top).toBeGreaterThanOrEqual(8)
  })
})
