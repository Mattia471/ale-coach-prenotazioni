#!/usr/bin/env bash
# Verify authenticated decryption and PostgreSQL custom dump header in streaming mode.
# Does NOT perform a full restore. Plaintext remains only in memory.
set -Eeuo pipefail
umask 077
: "$AGE_IDENTITY_FILE"
if [[ "$#" -ne 1 || "$1" != *.dump.age || ! -f "$1" ]]; then
  echo 'Usage: AGE_IDENTITY_FILE=/private/key bash scripts/verify-encrypted-backup.sh /backup/name.dump.age' >&2
  exit 2
fi
if [[ ! -f "$AGE_IDENTITY_FILE" || ! -r "$AGE_IDENTITY_FILE" ]]; then
  echo 'Private age identity missing or unreadable' >&2
  exit 2
fi
command -v age >/dev/null || { echo 'Missing tool age' >&2; exit 2; }
command -v node >/dev/null || { echo 'Missing tool node' >&2; exit 2; }
age --decrypt --identity "$AGE_IDENTITY_FILE" "$1" | node --input-type=module -e '
 import { createHash } from "node:crypto";
 const hash=createHash("sha256");
 let header=Buffer.alloc(0),total=0;
 for await(const chunk of process.stdin){
  total+=chunk.length;
  hash.update(chunk);
  if(header.length<5)header=Buffer.concat([header,chunk.subarray(0,5-header.length)]);
 }
 if(total<5||header.toString("ascii")!=="PGDMP"){
  console.error("Invalid PostgreSQL custom dump signature");
  process.exitCode=1;
 }else{
  console.log("Authenticated archive decrypted and PGDMP signature verified.");
  console.log("Decrypted bytes:",total,"SHA-256:",hash.digest("hex"));
  console.log("Full restore into isolated Supabase environment still required.");
 }
'
