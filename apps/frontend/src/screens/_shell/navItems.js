// src/screens/_shell/navItems.js
// Rail-Daten als reine Datenstruktur (kein JSX). Der Frame mappt sie auf
// NavigationRail-Items (Icon-Key + active + onClick). PO 2026-06-24: nur 4
// Quick-Access-Sektionen in der Rail — home/roadmap/backlog/memories.
//
// `icon` = Registry-Key (foundations/iconRegistry.js). `segment` = Routen-Segment
// hinter dem Projekt-Slug (/:slug/<segment>). memories nutzt das 'brain'-Icon
// (Registry kennt kein 'memories'-Glyph).
export const RAIL_ITEMS = [
  { segment: 'home', label: 'Home', icon: 'home' },
  { segment: 'roadmap', label: 'Roadmap', icon: 'roadmap' },
  { segment: 'backlog', label: 'Backlog', icon: 'backlog' },
  { segment: 'memories', label: 'Memories', icon: 'brain' },
]

// Fuß-Item (gepinnt unten): Projekt-Settings.
export const RAIL_FOOT_ITEMS = [
  { segment: 'settings', label: 'Einstellungen', icon: 'settings' },
]
