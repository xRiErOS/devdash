# exchange/ — Datei-Austausch Mac ↔ Thinkpad

**Git-ignored Scratch-Ordner.** Nur diese README ist getrackt — alles andere hier bleibt aus dem Repo draußen (siehe `.gitignore`: `/exchange/*` + `!/exchange/README.md`).

## Zweck

Schneller Austausch von WIP-Dateien (Wireframes, Mockups, draw.io-Drafts) zwischen **Mac** (dev-machine, erzeugt) und **Thinkpad** (mobil). Ablage am Arbeitsort im Repo, aber ohne git-Konflikt — git fasst den Inhalt nie an.

**Abgrenzung:** Commit-reife Deliverables gehören NICHT hierher, sondern via git in `specs-DD/32-Mockups/` (push/pull). Dieser Ordner ist nur für flüchtigen Zwischenstand.

## Sync (rsync über Tailscale)

Aliase in `~/.zshrc` (Mac), Thinkpad-Tailscale-Hostname einsetzen:

```sh
alias ex-push='rsync -avz ~/Obsidian/tools/DeveloperDashboard/exchange/ erik@thinkpad:~/<repo-pfad>/exchange/'
alias ex-pull='rsync -avz erik@thinkpad:~/<repo-pfad>/exchange/ ~/Obsidian/tools/DeveloperDashboard/exchange/'
```

`-avz` = archiv + komprimiert. Je Richtung ein Alias (explizit). `--delete` nur ergänzen, wenn echtes Spiegeln (inkl. Löschen auf dem Ziel) gewünscht ist.

Alternative: **Syncthing** auf diesen Ordner (kontinuierlich bidirektional, kein Cloud, über Tailscale) — dann nur DIESEN Unterordner freigeben, nie den Repo-Tree (sonst `.git`-Konflikt).

## Regel

Nichts hier ist versioniert oder gesichert. Wichtiges → in den git-Tree heben (committen) oder in den Vault.
