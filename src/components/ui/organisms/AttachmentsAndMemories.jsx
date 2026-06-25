import SubHeading from '../atoms/SubHeading.jsx'
import WidgetBase from './WidgetBase.jsx'
import AttachmentWidget from './AttachmentWidget.jsx'
import RelevantFilesWidget from './RelevantFilesWidget.jsx'
import MemoriesWidget from './MemoriesWidget.jsx'

/**
 * AttachmentsAndMemories — GF-372 V2 Composer (05.30 Widgets). Die "Relevanter Kontext"-Schicht
 * in der Terminal-Token-Sprache: reiht DREI fachlich getrennte (D09, D01) Organismen
 * randlos aneinander, jeder auf `CaptureWidget`-Basis (PO-Vision 2026-06-19, D03):
 *   1. Anhänge (Uploads + In-Frame-Preview) → AttachmentWidget    (GF-373)
 *   2. Datei-Links (Rows + Such-Slot)       → RelevantFilesWidget (GF-374)
 *   3. Memories (Browse/Pick + Multi-Select)→ MemoriesWidget      (GF-375)
 *
 * Titellos (Slot-Titel zentral im Accordion, D02); je Sektion ein `SubHeading`-Sub-Label (Teal-Dot,
 * KEIN ///-Slash — CommentLabel-Nachfolger, D-C), das IN die Capture-Toolbar-Zeile des jeweiligen
 * Organismus eingereicht wird (label LINKS, create/upload-Icon RECHTS — selbe horizontale Linie;
 * spart vertikalen Whitespace, kein Section-Header mehr, PO-Review 2026-06-20). KEINE Cards, KEINE
 * Trenn-Linien — Sektionen nur via Spacing getrennt (V2: keine unnötigen Borders, PO 2026-06-19).
 * Border ist je Organismus opt-in (`framed`-Prop, Default randlos); der Composer DEFINIERT sie bei
 * der Komposition über `framed` (Default false). Präsentational/controlled: Daten + Callbacks vom
 * Consumer; UI-State (Preview/Suche/Selektion) lebt in den Organismen. Mono überall, 0 Roh-Hex.
 *
 * data-ui: Wurzel `attachments-and-memories`; Sektionen `.attachments`/`.files`/`.memories`
 * (+ je `.label`, jetzt IN der Organismus-Toolbar statt als Header darüber); die Organismen tragen
 * ihre eigenen Scopes (attachment-widget / relevant-files-widget / memories-widget).
 *
 * @param {object} props
 * @param {string} [props.attachmentsLabel='Anhänge']
 * @param {string} [props.filesLabel='Datei-Links']
 * @param {string} [props.memoriesLabel='Memories']
 * @param {Array} [props.attachments]
 * @param {boolean} [props.uploadable=false]
 * @param {boolean} [props.removableAttachments=false]
 * @param {(files:FileList)=>void} [props.onUpload]
 * @param {()=>void} [props.onPick]
 * @param {(key:string)=>void} [props.onRemoveAttachment]
 * @param {Array<string|{path:string}>} [props.files]
 * @param {boolean} [props.filesReadOnly=false]
 * @param {(files:Array<string>)=>void} [props.onFilesChange]
 * @param {Array<{key:string,label:import('react').ReactNode,linked?:boolean,href?:string}>} [props.memories]
 * @param {(key:string,next:boolean)=>void} [props.onToggleMemoryLink]
 * @param {(q:string)=>void} [props.onMemorySearch]
 * @param {(mode:string)=>void} [props.onMemorySort]
 * @param {(mode:string)=>void} [props.onMemoryFilter]
 * @param {Array<{value:string,label:string}>} [props.memorySortModes]
 * @param {Array<{value:string,label:string}>} [props.memoryFilterModes]
 * @param {boolean} [props.framed=false] - Rahmt alle drei Sektions-Organismen (opt-in, Default randlos).
 * @param {import('react').ReactNode} [props.heading] - Optionale Slot-Heading (T7/GF-2 Wave-4):
 *   ist sie gesetzt, rendert WidgetBase EINE self-titled WidgetHeading (Dot + --heading-accent,
 *   kein //-Slash) ganz oben ÜBER den drei Sub-Sektionen. KEINE Action am Composite-Top. Ohne
 *   `heading` bleibt der Composer headless (Back-Compat: Slot/Akkordeon liefert den Titel).
 * @param {string} [props.className]
 */
// Sektions-Wrapper: keine interne Stapelung mehr (das Label lebt jetzt in der Widget-Toolbar,
// nicht als Zeile darüber) — der Wrapper bleibt nur als semantischer data-ui-Anker.
const SECTION = 'flex flex-col'

// Sektions-Sub-Label als `SubHeading` (Teal-Dot, kein ///-Slash, D-C), das in die Capture-Toolbar
// des jeweiligen Organismus eingereicht wird (toolbarLabel-Prop) statt als Header darüber.
const sectionLabel = (section, text) => (
  <SubHeading dataUi={`attachments-and-memories.${section}.label`}>{text}</SubHeading>
)

export default function AttachmentsAndMemories({
  attachmentsLabel = 'Anhänge',
  filesLabel = 'Datei-Links',
  memoriesLabel = 'Memories',
  attachments = [],
  uploadable = false,
  removableAttachments = false,
  onUpload,
  onPick,
  onRemoveAttachment,
  files = [],
  filesReadOnly = false,
  onFilesChange,
  memories = [],
  onToggleMemoryLink,
  onMemorySearch,
  onMemorySort,
  onMemoryFilter,
  memorySortModes = [],
  memoryFilterModes = [],
  framed = false,
  heading,
  className = '',
}) {
  return (
    <WidgetBase
      heading={heading}
      dataUi="attachments-and-memories"
      className={`[font-family:var(--font-display)] ${className}`}
    >
      <div className="flex flex-col gap-3">
        {/* Teil 1 — Anhänge (Uploads + Preview); Sub-Label LINKS in der Widget-Toolbar */}
        <div data-ui="attachments-and-memories.attachments" className={SECTION}>
          <AttachmentWidget
            attachments={attachments}
            uploadable={uploadable}
            removable={removableAttachments}
            onUpload={onUpload}
            onPick={onPick}
            onRemove={onRemoveAttachment}
            framed={framed}
            dropzoneSize="s"
            toolbarLabel={sectionLabel('attachments', attachmentsLabel)}
          />
        </div>

        {/* Teil 2 — Datei-Links (relevant_files); Sub-Label LINKS in der Widget-Toolbar */}
        <div data-ui="attachments-and-memories.files" className={SECTION}>
          <RelevantFilesWidget
            files={files}
            readOnly={filesReadOnly}
            onChange={onFilesChange}
            framed={framed}
            toolbarLabel={sectionLabel('files', filesLabel)}
          />
        </div>

        {/* Teil 3 — Memories (Browse/Pick, verknüpft); Sub-Label LINKS in der Widget-Toolbar */}
        <div data-ui="attachments-and-memories.memories" className={SECTION}>
          <MemoriesWidget
            memories={memories}
            onToggleLink={onToggleMemoryLink}
            onSearch={onMemorySearch}
            onSort={onMemorySort}
            onFilter={onMemoryFilter}
            sortModes={memorySortModes}
            filterModes={memoryFilterModes}
            framed={framed}
            toolbarLabel={sectionLabel('memories', memoriesLabel)}
          />
        </div>
      </div>
    </WidgetBase>
  )
}
