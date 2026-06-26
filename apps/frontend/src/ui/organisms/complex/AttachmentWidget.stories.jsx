/**
 * AttachmentWidget — Anhänge-Stack + Dropzone. Achse: collapsed.
 * Komponiert WidgetBase + FileItem + IconButton. data-ui je Teil.
 * 0 inline-style / 0 Raw-Hex.
 */
import AttachmentWidget from './AttachmentWidget.jsx'

const FILES = [
  { name: 'capture-flow.png', meta: 'PNG · 184 KB' },
  { name: 'authelia-config.yml', meta: 'YAML · 2 KB' },
]

const meta = {
  title: '04 ORGANISMS/AttachmentWidget',
  component: AttachmentWidget,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { collapsed: { control: 'boolean' } },
  args: { files: FILES, collapsed: false },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="max-w-md">
      <AttachmentWidget {...args} dataUiScope="organism.widget.attachments.default" />
    </div>
  ),
}

export const Empty = {
  render: () => (
    <div className="max-w-md">
      <AttachmentWidget files={[]} dataUiScope="organism.widget.attachments.empty" />
    </div>
  ),
}
