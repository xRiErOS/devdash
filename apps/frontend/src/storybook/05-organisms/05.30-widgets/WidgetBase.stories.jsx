import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'
import WidgetBase from '../../../components/ui/organisms/WidgetBase.jsx'
import WidgetField from '../../../components/ui/organisms/WidgetField.jsx'
import SubHeading from '../../../components/ui/atoms/SubHeading.jsx'
import AccordionSection from '../../../components/ui/molecules/AccordionSection.jsx'

/**
 * WidgetBase — self-titled Widget-Shell (GF-2 6-Ebenen-Canon, PO 2026-06-20).
 * Layer-3-Fill, Heading = WidgetHeading (Dot + heading-accent), Bausteine = WidgetField (Layer-4).
 * EINZIGE Fill-Quelle der Widget-Schicht (D-QC1). Sitzt auf Layer-2 (Accordion).
 */

const noop = () => {}

const actions = (
  <>
    <Icon name="edit" size={15} className="cursor-pointer hover:text-[var(--text)]" />
    <Icon name="copy" size={15} className="cursor-pointer hover:text-[var(--text)]" />
    <Icon name="delete" role="neutral" size={15} className="cursor-pointer hover:text-[var(--text)]" />
  </>
)

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/WidgetBase',
  component: WidgetBase,
  tags: ['status:stable', 'qa_behavioral:n/a', 'design_version:v2'],
}
export default meta

// Default = 1 Baustein.
export const Default = {
  render: () => (
    <div data-ui="organism.widget-base.default">
      <WidgetBase heading="Tags" action={actions} dataUi="widget-base">
        <SubHeading>Labels</SubHeading>
        <WidgetField>feature · keyboard · a11y</WidgetField>
      </WidgetBase>
    </div>
  ),
}

// Main = maßgebliche Voll-Komposition (Goal + Background).
export const Main = {
  render: () => (
    <div data-ui="organism.widget-base.main">
      <WidgetBase heading="Beschreibung" action={actions} dataUi="widget-base">
        <SubHeading>Goal</SubHeading>
        <WidgetField>Power-User steuern die Issue-Liste vollständig per Tastatur.</WidgetField>
        <SubHeading>Background</SubHeading>
        <WidgetField>Bestehende Liste hat keine Keyboard-Steuerung; Maus kostet Zeit.</WidgetField>
      </WidgetBase>
    </div>
  ),
}

// Variant_MultiBaustein = mehrere Layer-4-Bausteine (= Main-Komposition, eigener Anker).
export const Variant_MultiBaustein = {
  render: () => (
    <div data-ui="organism.widget-base.variant-multibaustein">
      <WidgetBase heading="Beschreibung" action={actions} dataUi="widget-base">
        <SubHeading>Goal</SubHeading>
        <WidgetField>Power-User steuern die Issue-Liste vollständig per Tastatur.</WidgetField>
        <SubHeading>Background</SubHeading>
        <WidgetField>Bestehende Liste hat keine Keyboard-Steuerung; Maus kostet Zeit.</WidgetField>
      </WidgetBase>
    </div>
  ),
}

// State_Empty = Heading ohne Bausteine.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.widget-base.state-empty">
      <WidgetBase heading="Abhängigkeiten" dataUi="widget-base" />
    </div>
  ),
}

// Interaction_Hover = group-hover enthüllt das Action-Trio (statisch dokumentiert).
export const Interaction_Hover = {
  render: () => (
    <div data-ui="organism.widget-base.interaction-hover">
      <WidgetBase heading="Tags" action={actions} dataUi="widget-base">
        <SubHeading>Labels</SubHeading>
        <WidgetField>feature · keyboard · a11y</WidgetField>
      </WidgetBase>
    </div>
  ),
}

// Variant_InAccordionSection = Einbettung in die ECHTE AccordionSection (Wave-3-Integration,
// kein Mock). Card-Shell = Layer-2 (Accordion-Ebene), Widgets self-titled (kein AccordionBody-Titel, D-QC1).
export const Variant_InAccordionSection = {
  parameters: { layout: 'fullscreen', fullBleed: true },
  render: () => (
    <div data-ui="wb-accordion-shell" className="m-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--layer-2)]">
      <AccordionSection open no="01" title="Issue Details" hint="Beschreibung · Metadaten" panelId="wb-01" onToggle={noop}>
        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1.7fr_1fr]">
          <WidgetBase heading="Beschreibung" action={actions} dataUi="wb-in-acc.desc">
            <SubHeading>Goal</SubHeading>
            <WidgetField>Tastatur-Navigation der Issue-Liste.</WidgetField>
          </WidgetBase>
          <WidgetBase heading="Metadaten" dataUi="wb-in-acc.meta">
            <WidgetField>Status · Priorität · Sprint · Owner</WidgetField>
          </WidgetBase>
        </div>
      </AccordionSection>
    </div>
  ),
}
