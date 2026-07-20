/**
 * MEDIA-STORE assertion script — blob host allowlist derivation.
 *
 * Pins the reference-image allowlist fix: the derived blob host MUST be
 * lowercased, because `new URL(path).hostname` is lowercased by the URL parser.
 * A mixed-case store id previously produced a host that never equalled the
 * parsed hostname, so the app silently rejected its OWN blob URLs and disabled
 * every reference image in blob/prod mode (characters drifted page to page).
 *
 * No test runner is configured in this app, so this is a standalone runnable
 * assertion (same pattern as prompt-identity.golden.ts):
 *   SKIP_ENV_VALIDATION=1 bun run src/server/providers/__tests__/media-store.golden.ts
 * (wired as `bun run test:media`). It exits non-zero on any failure.
 * SKIP_ENV_VALIDATION is required only because importing media-store reads
 * DATA_DIR at module load; the assertions themselves are pure.
 */

import { blobHostFromToken } from "~/server/providers/media-store";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ ${name}`);
  } else {
    failures += 1;
    console.error(`✗ ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

// A real rw token: `vercel_blob_rw_<storeId>_<secret>`; store ids carry mixed
// case. The bug: the un-lowercased host never matched the parsed URL hostname.
const MIXED_CASE_TOKEN = "vercel_blob_rw_StoreAbc123XYZ_s3cr3tPart";

check(
  "blobHostFromToken lowercases the derived host",
  blobHostFromToken(MIXED_CASE_TOKEN) ===
    "storeabc123xyz.public.blob.vercel-storage.com",
  JSON.stringify(blobHostFromToken(MIXED_CASE_TOKEN))
);

// The end-to-end guarantee: the mixed-case store's own blob URL is ACCEPTED by
// the exact `url.hostname === storeHost` compare used in resolveReferenceImage.
{
  const storeHost = blobHostFromToken(MIXED_CASE_TOKEN);
  const url = new URL(
    "https://StoreAbc123XYZ.public.blob.vercel-storage.com/img/beat0.png"
  );
  check(
    "mixed-case store id → its own blob URL passes the allowlist compare",
    url.hostname === storeHost,
    `hostname=${url.hostname} storeHost=${storeHost}`
  );
}

check(
  "a malformed token (no store-id segment) → null",
  blobHostFromToken("vercel_blob_rw") === null
);

if (failures > 0) {
  console.error(`\nMEDIA-STORE FAILED: ${failures} mismatch(es).`);
  process.exit(1);
}
console.log("\nMEDIA-STORE OK: blob host allowlist derivation is case-safe.");
