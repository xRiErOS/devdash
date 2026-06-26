// Co-located Zeiger (kein zweites Bauteil): die App-Hülle lebt handgebaut in
// src/screens/_shell/AppShellFrame.jsx. Diese Datei macht den Frame unter dem
// Screens-Tier-Namen greifbar, damit Story/MDX (AppShell.*) co-located sind und
// gen-composition das echte Kompositionsdiagramm aus den Frame-Importen zieht.
// Eine Kopie = Alignment-Garantie bleibt gewahrt (reiner Re-Export).
import { AppShellFrame } from '../../screens/_shell/AppShellFrame.jsx'

export default AppShellFrame
