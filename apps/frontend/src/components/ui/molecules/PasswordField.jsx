import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Input from '../atoms/Input.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * PasswordField — Molecule (04.10 Form, GF-230). Komponiert das Input-Atom
 * (maskiert/sichtbar) + ein IconButton-Atom (Show/Hide-Toggle) zu einem
 * Passwort-Eingabefeld.
 *
 * Dumb-Molecule (CONV-molecule-boundary): präsentational, KEINE Lifecycle-/
 * Transition-/Fetch-/Validierungs-Logik. Der einzige Eigen-State ist die rein
 * visuelle Sichtbarkeits-Umschaltung (`visible`) — kein Domänen-Zustand. Der
 * Feld-Wert ist controlled (value/onChange → Input). Token-clean (0 inline-style,
 * 0 Roh-Hex), logische RTL-Utilities (pe-/end-).
 *
 * @param {object} props
 * @param {string} [props.value] - controlled Wert (an Input durchgereicht).
 * @param {(e:any)=>void} [props.onChange]
 * @param {string} [props.placeholder='Passwort']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.defaultVisible=false] - Start-Sichtbarkeit (Story/SSR-Demo).
 * @param {string} [props.className] - zusätzliche Klassen am Wrapper.
 */
export default function PasswordField({
  value,
  onChange,
  placeholder = 'Passwort',
  disabled = false,
  defaultVisible = false,
  className = '',
  ...rest
}) {
  const [visible, setVisible] = useState(defaultVisible)
  return (
    <div data-ui="password-field" className={`relative flex items-center ${className}`}>
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        data-ui="password-field.input"
        className="pe-10"
        {...rest}
      />
      <IconButton
        icon={visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        variant="ghost"
        size="sm"
        data-ui="password-field.toggle"
        className="absolute end-1 top-1/2 -translate-y-1/2"
      />
    </div>
  )
}
