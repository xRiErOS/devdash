#!/usr/bin/env bash
#
# secret-scan: Secret-Scanner (tracked Spiegel des frueheren .git/hooks/pre-commit)
# Blockt Commits mit hardcodierten API-Keys / Credentials in STAGED changes.
# Bypass (nur bewusst): SKIP_SECRET_SCAN=1 git commit ...  oder  git commit --no-verify
#
# DD-410 (DD#59): Seit dem DD#56-Enforcement-Layer setzt husky core.hooksPath=.husky/_
# und haengt damit .git/hooks/* aus. Der frueher in .git/hooks/pre-commit gelebte
# Secret-Scanner (Bereich 2, 2026-05-26) lief dadurch nicht mehr. Dieser tracked Spiegel
# wird von .husky/pre-commit VOR lint-staged aufgerufen — version-controlled, ueberlebt Clone.
#
set -euo pipefail

if [ "${SKIP_SECRET_SCAN:-0}" = "1" ]; then
  echo "secret-scan: Secret-Scan uebersprungen (SKIP_SECRET_SCAN=1)."
  exit 0
fi

# Muster echter Secrets. Beschreibung|Regex
PATTERNS=(
  "Stripe Live Key|(sk|rk)_live_[0-9a-zA-Z]{16,}"
  "Stripe Live Publishable|pk_live_[0-9a-zA-Z]{16,}"
  "AWS Access Key ID|AKIA[0-9A-Z]{16}"
  "AWS Secret Access Key|aws_secret_access_key\s*[=:]\s*['\"]?[0-9a-zA-Z/+]{40}"
  "Google API Key|AIza[0-9A-Za-z_\-]{35}"
  "GitHub Token|gh[pousr]_[0-9A-Za-z]{36,}"
  "Slack Token|xox[baprs]-[0-9A-Za-z-]{10,}"
  "OpenAI/Anthropic Key|sk-(ant-)?[0-9A-Za-z_\-]{20,}"
  "Private Key Block|-----BEGIN [A-Z ]*PRIVATE KEY-----"
  "Generic Secret Assignment|(api[_-]?key|secret|token|passwd|password)\s*[=:]\s*['\"][^'\"]{12,}['\"]"
)

# Nur hinzugefuegte Zeilen (+) der gestageten Diffs scannen, ohne den Diff-Header.
staged_added() { git diff --cached --no-color -U0 -- "$@" | grep -E '^\+' | grep -Ev '^\+\+\+'; }

found=0
report=""

# Alle gestageten Textdateien scannen (bash-3.2-kompatibel, kein mapfile)
while IFS= read -r f; do
  [ -f "$f" ] || continue
  added="$(staged_added "$f" || true)"
  [ -z "$added" ] && continue
  for entry in "${PATTERNS[@]}"; do
    desc="${entry%%|*}"
    rx="${entry#*|}"
    hits="$(printf '%s\n' "$added" | grep -niE -- "$rx" || true)"
    if [ -n "$hits" ]; then
      found=1
      while IFS= read -r line; do
        masked="$(printf '%s' "$line" | sed -E 's/(.{0,12}).*/\1…[REDACTED]/')"
        report+="  [$desc] $f: $masked"$'\n'
      done <<< "$hits"
    fi
  done
done < <(git diff --cached --name-only --diff-filter=ACM)

if [ "$found" = "1" ]; then
  echo ""
  echo "COMMIT GESTOPPT — moegliche Secrets in gestageten Aenderungen:"
  echo ""
  printf '%s' "$report"
  echo ""
  echo "Pruefe die Treffer. Entferne echte Keys oder ersetze durch ENV-Referenzen."
  echo "Falsch-positiv? -> SKIP_SECRET_SCAN=1 git commit ...  (oder git commit --no-verify)"
  echo ""
  exit 1
fi

exit 0
