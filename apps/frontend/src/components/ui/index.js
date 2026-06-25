// src/components/ui/index.js
// Aggregat-Barrel — verweist ausschließlich auf die kanonischen Schichten
// (atoms/ · molecules/ · layout/ · templates/). Keine Legacy-Top-Level-Pfade mehr.
// Atoms
export { default as Card } from './atoms/Card.jsx'
export { default as Input } from './atoms/Input.jsx'
export { default as Textarea } from './atoms/Textarea.jsx'
export { default as PopoverPanel } from './atoms/PopoverPanel.jsx'
export { default as IconButton } from './atoms/IconButton.jsx'
export { default as Pill } from './atoms/Pill.jsx'
export { default as Tooltip } from './atoms/Tooltip.jsx'
// Molecules
export { default as Modal } from './molecules/Modal.jsx'
export { default as Select } from './molecules/Select.jsx'
export { default as SegmentedControl } from './molecules/SegmentedControl.jsx'
export { default as EmptyState } from './molecules/EmptyState.jsx'
// Layout
export { default as PageShell } from './layout/PageShell.jsx'
// Templates
export { default as ListPage } from './templates/ListPage.jsx'
export { default as MasterDetail } from './templates/MasterDetail.jsx'
export { default as BoardPage } from './templates/BoardPage.jsx'
export { default as FormPage } from './templates/FormPage.jsx'
export { default as DashboardPage } from './templates/DashboardPage.jsx'
export { default as ProjectHomeLayout } from './templates/ProjectHomeLayout.jsx'
