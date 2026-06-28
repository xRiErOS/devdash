import Badge from './Badge.jsx'

export default {
  title: '02 ATOMS/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    tone: { control: 'select', options: ['neutral', 'muted', 'accent'] },
    size: { control: 'select', options: ['sm', 'md'] },
    mono: { control: 'boolean' },
  },
}

export const Neutral = { args: { children: '3 Sprints', tone: 'neutral' } }
export const Muted   = { args: { children: 'DD2', tone: 'muted', mono: true, size: 'sm' } }
export const Accent  = { args: { children: 'Sprint 4 — aktiv', tone: 'accent' } }
export const AllTones = {
  name: 'Alle Tones',
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge tone="neutral">5 Sprints</Badge>
      <Badge tone="muted" mono size="sm">DD2</Badge>
      <Badge tone="accent">Sprint 4 — aktiv</Badge>
    </div>
  ),
}
