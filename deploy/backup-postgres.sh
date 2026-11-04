#!/usr/bin/env bash
# Produce a private, validated PostgreSQL logical backup (NOT offsite storage).
# Requires pg_dump and pg_restore matching the production server major version.
set -euo pipefail
umask 077

: "${DATABASE_URL:?Set DATABASE_URL to a database connection URI}"
output_dir="${1:-./backups}"
mkdir -p -- "$output_dir"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
filename="$output_dir/postgres-$timestamp.dump"
temporary="$(mktemp "$output_dir/.postgres-$timestamp.XXXXXXXX.dump")"
trap 'rm -f -- "$temporary"' EXIT

# The URI is passed through the environment rather than command arguments.
PGDATABASE="$DATABASE_URL" pg_dump --format=custom --no-owner --no-acl --file="$temporary"
pg_restore --list "$temporary" >/dev/null
mv -- "$temporary" "$filename"
trap - EXIT
sha256sum "$filename" > "$filename.sha256"
printf "Backup created and validated: %s\n" "$filename"
printf "Transfer it to encrypted offsite storage, check retention, and test restoring it.\n"
