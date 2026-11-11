#!/usr/bin/env bash
# CI-only encryption/decryption test using FAKE PGDMP bytes. No Supabase access.
set -Eeuo pipefail
: "$RUNNER_TEMP"
work="$(mktemp -d -p "$RUNNER_TEMP" ale-coach-crypto-XXXXXX)"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/bin"
cat > "$work/bin/pg_dump" <<'FAKE_PG_DUMP'
#!/usr/bin/env bash
printf 'PGDMPfake-ci-data-no-customers\n'
FAKE_PG_DUMP
chmod 700 "$work/bin/pg_dump"
printf 'only-test-no-real-password\n' > "$work/pgpass"
chmod 600 "$work/pgpass"
age-keygen --output "$work/age-identity" >/dev/null 2>&1
export AGE_RECIPIENT="$(age-keygen -y "$work/age-identity")"
export AGE_IDENTITY_FILE="$work/age-identity"
export PGSERVICE=alecoach
export PGPASSFILE="$work/pgpass"
export BACKUP_DIR="$work/backups"
export PATH="$work/bin:$PATH"
bash scripts/backup-cloud-encrypted.sh
archive="$(find "$BACKUP_DIR" -maxdepth 1 -name '*.dump.age' -type f -print -quit)"
if [[ -z "$archive" || ! -s "$archive" ]]; then
 echo 'QA backup archive not found' >&2
 exit 1
fi
bash scripts/verify-encrypted-backup.sh "$archive"
age-keygen --output "$work/incorrect-identity" >/dev/null 2>&1
if AGE_IDENTITY_FILE="$work/incorrect-identity" bash scripts/verify-encrypted-backup.sh "$archive" >/dev/null 2>&1; then
 echo 'QA incorrectly decrypted with unrelated private key' >&2
 exit 1
fi
echo 'PASS: wrong private identity is rejected'
cat > "$work/bin/pg_dump" <<'FAKE_FAILING_DUMP'
#!/usr/bin/env bash
exit 17
FAKE_FAILING_DUMP
chmod 700 "$work/bin/pg_dump"
export BACKUP_DIR="$work/failing-backup"
if bash scripts/backup-cloud-encrypted.sh >/dev/null 2>&1; then
 echo 'QA backup must fail when pg_dump fails' >&2
 exit 1
fi
if find "$BACKUP_DIR" -type f -print -quit | grep -q .; then
 echo 'QA failed dump left a partial file' >&2
 exit 1
fi
echo 'PASS: pg_dump error cannot leave an apparently successful archive'
echo 'All backup cryptographic smoke checks passed; this is NOT a real database restore.'
