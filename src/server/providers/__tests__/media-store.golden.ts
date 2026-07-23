/**
 * MEDIA-STORE assertion script — the single media choke-point's READ-BACK.
 *
 * Pins:
 *  1. blob host allowlist derivation (`blobHostFromToken` must lowercase — a
 *     mixed-case store id once made the app silently reject its OWN blob URLs
 *     and disable every reference image in blob/prod mode);
 *  2. the https-branch allowlist decision (`allowedStoredMediaUrl`, pure):
 *     exact own-store host when the rw token is set, `*.public.blob.
 *     vercel-storage.com` fallback otherwise, everything else rejected (SSRF
 *     defense-in-depth);
 *  3. the `/`-prefix (local) branch of `resolveStoredMediaForModel`: bytes
 *     round-trip for a stored `/data/media/<file>` path, and REJECTION of any
 *     path escaping the media dir or of another shape entirely;
 *  4. the https branch of `resolveStoredMediaForModel` rejecting a
 *     non-allowlisted host (undefined, no fetch — the allowlist fails first).
 *
 * Both storage branches are pinned AT THE NEW INTERFACE so no caller ever
 * re-implements the `/` vs `https://` back-compat rule again.
 *
 * No test runner is configured in this app, so this is a standalone runnable
 * assertion (same pattern as prompt-identity.golden.ts):
 *   SKIP_ENV_VALIDATION=1 bun run src/server/providers/__tests__/media-store.golden.ts
 * (wired as `bun run test:media`). It exits non-zero on any failure.
 * SKIP_ENV_VALIDATION is required because importing media-store reads env at
 * module load; DATA_DIR is pointed at a throwaway temp dir BEFORE the dynamic
 * import below so the local-branch assertions touch only that sandbox.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The env snapshot is taken when ~/env is first imported — set the sandbox
// BEFORE the dynamic import of media-store (static imports would hoist).
const sandbox = mkdtempSync(join(tmpdir(), "media-store-golden-"));
process.env.DATA_DIR = sandbox;
process.env.BLOB_READ_WRITE_TOKEN = "";

const { allowedStoredMediaUrl, blobHostFromToken, resolveStoredMediaForModel } =
  await import("~/server/providers/media-store");

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ ${name}`);
  } else {
    failures += 1;
    console.error(`✗ ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

// ── 1. Blob host derivation ──────────────────────────────────────────────────

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
// the exact hostname compare used in the https allowlist.
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

// ── 2. https allowlist decision (pure) ───────────────────────────────────────

const OWN_HOST = blobHostFromToken(MIXED_CASE_TOKEN);

check(
  "storeHost set: the app's OWN blob URL is allowed",
  allowedStoredMediaUrl(
    "https://storeabc123xyz.public.blob.vercel-storage.com/media/a.png",
    OWN_HOST
  )?.hostname === OWN_HOST
);
check(
  "storeHost set: ANOTHER public-blob store is rejected (exact host, not suffix)",
  allowedStoredMediaUrl(
    "https://otherstore.public.blob.vercel-storage.com/media/a.png",
    OWN_HOST
  ) === null
);
check(
  "storeHost set: an arbitrary https host is rejected",
  allowedStoredMediaUrl("https://evil.example.com/media/a.png", OWN_HOST) ===
    null
);
check(
  "no storeHost (local dev): the public-blob suffix is the fallback allowlist",
  allowedStoredMediaUrl(
    "https://somestore.public.blob.vercel-storage.com/media/a.png",
    null
  )?.hostname === "somestore.public.blob.vercel-storage.com"
);
check(
  "no storeHost: a non-blob https host is rejected",
  allowedStoredMediaUrl("https://evil.example.com/media/a.png", null) === null
);
check(
  "a suffix-LOOKALIKE host is rejected (endsWith needs the dot-prefixed suffix)",
  allowedStoredMediaUrl(
    "https://evilpublic.blob.vercel-storage.com.evil.example.com/a.png",
    null
  ) === null
);
check(
  "a non-https value is never a blob URL",
  allowedStoredMediaUrl("/data/media/a.png", OWN_HOST) === null &&
    allowedStoredMediaUrl("http://insecure.example.com/a.png", null) === null
);
check(
  "a malformed https value is rejected, not thrown",
  allowedStoredMediaUrl("https://", null) === null
);

// ── 3. resolveStoredMediaForModel — local branch ─────────────────────────────

const mediaDir = join(sandbox, "media");
mkdirSync(mediaDir, { recursive: true });
const AUDIO_BYTES = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00]);
writeFileSync(join(mediaDir, "beat0.mp3"), AUDIO_BYTES);
// A file OUTSIDE the media dir that a traversal would otherwise reach.
writeFileSync(join(sandbox, "secret.txt"), "hors du dossier media");

{
  const bytes = await resolveStoredMediaForModel("/data/media/beat0.mp3");
  check(
    "local branch: a stored /data/media/<file> path reads back its exact bytes",
    bytes !== undefined &&
      bytes.length === AUDIO_BYTES.length &&
      AUDIO_BYTES.every((b, i) => bytes[i] === b),
    JSON.stringify(bytes)
  );
}
check(
  "local branch: a traversal escaping the media dir is REJECTED (undefined)",
  (await resolveStoredMediaForModel("/data/media/../secret.txt")) === undefined
);
check(
  "local branch: a path of another shape is REJECTED (undefined)",
  (await resolveStoredMediaForModel("/etc/passwd")) === undefined &&
    (await resolveStoredMediaForModel("/data/other/beat0.mp3")) === undefined
);

// ── 4. resolveStoredMediaForModel — https branch, allowlist rejection ────────

check(
  "https branch: a non-allowlisted host resolves to undefined (never fetched)",
  (await resolveStoredMediaForModel("https://evil.example.com/media/a.png")) ===
    undefined
);

rmSync(sandbox, { force: true, recursive: true });

if (failures > 0) {
  console.error(`\nMEDIA-STORE FAILED: ${failures} mismatch(es).`);
  process.exit(1);
}
console.log(
  "\nMEDIA-STORE OK: read-back choke-point pins both storage branches (allowlist + media-dir escape)."
);
