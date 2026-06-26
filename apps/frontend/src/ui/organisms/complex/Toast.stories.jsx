/**
 * Toast — flüchtige Erfolgs-Notiz. Komponiert Icon (Registry) + Text.
 * 0 inline-style / 0 Raw-Hex.
 */
import Toast from './Toast.jsx'

const meta = {
  title: '04 ORGANISMS/Toast',
  component: Toast,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    kind: { control: 'select', options: ['success'] },
    message: { control: 'text' },
  },
  args: { kind: 'success', message: 'Anhang hinzugefügt' },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="relative bg-[var(--base)] min-h-[480px] p-6 flex items-start">
      <Toast {...args} dataUiScope="organism.toast.default" />
    </div>
  ),
}
