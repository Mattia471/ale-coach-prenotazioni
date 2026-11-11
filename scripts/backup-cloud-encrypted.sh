#!/usr/bin/env bash
# Encrypted logical backup to an external destination. No plaintext written to disk.
set -Eeuo pipefail
umask 077
: "$PGSERVICE" "$PGPASSFILE" "$AGE_RECIPIENT" "$BACKUP_DIR"
if [[ "$PGSERVICE" != 'alecoach' || "$AGE_RECIPIENT" != age1* ]]; then
  echo 'Set PGSERVICE=alecoach and a valid public AGE_RECIPIENT' >&2
  exit 2
fi
if [[ ! -f "$PGPASSFILE" || ! -r "$PGPASSFILE" ]]; then
  echo 'A private PGPASSFILE is missing/unreadable' >&2
  exit 2
fi
for tool in pg_dump age realpath; do
  command -v "$tool" >/dev/null || { echo "Missing tool: $tool" >&2; exit 2; }
done
mkdir -p -- "$BACKUP_DIR"
target_dir="$(realpath "$BACKUP_DIR")"
repo_root="$(realpath "$(dirname "$0")/..")"
if [[ "$target_dir" == "$repo_root" || "$target_dir" == "$repo_root/"* ]]; then
  echo 'Refusing to save customer backup inside Git repository' >&2
  exit 2
fi
filename="ale-coach-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
target="$target_dir/$filename"
partial="$target.partial"
if [[ -e "$target" || -e "$partial" ]]; then
  echo 'Backup output already exists' >&2
  exit 2
fi
cleanup() { rm -f -- "$partial"; }
trap cleanup EXIT
# PGSERVICE resolves network host/user/db/SSL from private ~/.pg_service.conf.
# PGPASSFILE supplies credentials. Never pass passwords on the command line.
pg_dump --format=custom --no-owner --no-acl --no-tablespaces |
  age --recipient "$AGE_RECIPIENT" --output "$partial"
if [[ ! -s "$partial" ]]; then
  echo 'Empty encrypted archive' >&2
  exit 1
fi
mv -- "$partial" "$target"
trap - EXIT
printf 'Encrypted backup created: %s\n' "$target"
printf 'Verify with scripts/verify-encrypted-backup.sh using private age identity.\n'
