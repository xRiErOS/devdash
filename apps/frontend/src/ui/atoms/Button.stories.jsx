/**
 * Button — Aktions-Atom. Achse: variant (primary/ghost), optional Icon.
 * data-ui je Wrapper + Instanz. 0 inline-style / 0 Raw-Hex.
 */
import Button from './Button.jsx'

const meta = {
  title: '02 ATOMS/Button',
  component: Button,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'ghost'] },
    size: { control: 'inline-radio', options: ['md', 'sm'], description: 'md=12px (Default), sm=11px (wie SegmentedControl-Segmente).' },
    iconName: { control: 'text' },
    children: { control: 'text' },
  },
  args: { variant: 'primary', size: 'md', children: 'Speichern' },
}
export default meta

export const Default = {
  render: (args) => <Button {...args} dataUiScope="atom.button.default" />,
}

// Beide Varianten als ButtonBar (Abbrechen/Speichern) wie im Form-Modal.
export const Variants = {
  render: () => (
    <div data-ui="atom.button.variants" className="flex gap-[var(--space-2)]">
      <Button variant="ghost" dataUiScope="atom.button.cancel">Abbrechen</Button>
      <Button variant="primary" dataUiScope="atom.button.save">Speichern</Button>
    </div>
  ),
}

// Mit führendem Icon (inherit-Farbe).
export const WithIcon = {
  render: () => (
    <div data-ui="atom.button.withIcon" className="flex gap-[var(--space-2)]">
      <Button variant="primary" iconName="add" dataUiScope="atom.button.new">Neues Issue</Button>
    </div>
  ),
}

// Größe sm (11px) — gleiche Schrift wie SegmentedControl-Segmente; in der
// RoadmapBoard-Steuerzeile (Filter-Trigger, Create-Buttons) verwendet.
export const Small = {
  render: () => (
    <div data-ui="atom.button.small" className="flex items-center gap-[var(--space-2)]">
      <Button variant="ghost" size="sm" iconName="filter" dataUiScope="atom.button.small.filter">Filter</Button>
      <Button variant="ghost" size="sm" iconName="milestone" dataUiScope="atom.button.small.milestone">Meilenstein</Button>
    </div>
  ),
}
