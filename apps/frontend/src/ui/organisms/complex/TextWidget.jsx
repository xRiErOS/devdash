/**
 * TextWidget — Beschreibungs-Widget mit benannten Abschnitten (Goal/Background/
 * Description). Konkreter Organism im Content-Stack eines Detail-Screens.
 *
 * Komposition: `WidgetBase` (Accordion) + `Section` (Molecule) + `IconButton`
 * (Bearbeiten). Presentational, props-driven; `collapsed`/`onToggle` durchgereicht.
 *
 * @param {object} props
 * @param {{goal?:string, background?:string, description?:string}} [props.value]
 * @param {boolean} [props.collapsed]
 * @param {()=>void} [props.onToggle]
 * @param {string} [props.dataUiScope='organism.widget.text']
 */
import WidgetBase from '../../molecules/WidgetBase.jsx'
import Section from '../../molecules/Section.jsx'
import IconButton from '../../atoms/IconButton.jsx'

export default function TextWidget({ value = {}, collapsed, onToggle, dataUiScope = 'organism.widget.text' }) {
  return (
    <WidgetBase
      title="Beschreibung"
      collapsed={collapsed}
      onToggle={onToggle}
      dataUiScope={dataUiScope}
      action={<IconButton iconName="edit" label="Bearbeiten" size="sm" dataUiScope={`${dataUiScope}.edit`} />}
    >
      <div className="flex flex-col gap-[var(--space-3)]">
        {value.goal != null && <Section label="Goal" dataUiScope={`${dataUiScope}.goal`}>{value.goal}</Section>}
        {value.background != null && <Section label="Background" dataUiScope={`${dataUiScope}.background`}>{value.background}</Section>}
        {value.description != null && <Section label="Description" dataUiScope={`${dataUiScope}.description`}>{value.description}</Section>}
      </div>
    </WidgetBase>
  )
}
