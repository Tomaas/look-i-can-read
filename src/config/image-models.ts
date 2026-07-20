/**
 * The Google image models a PARENT may pick from /parents to compare
 * quality / price / speed of the illustrations. Shared by BOTH the client
 * (picker page + the localStorage hook) and the server (image server fns), so
 * the allowlist can NEVER drift between the two: the picker can only offer these
 * ids, and the server only ever honours these ids (anything else falls back).
 *
 * Kept free of any server-only import (no `~/env`) so the client bundle can
 * import it. All three ids share the CURRENT generateText + responseModalities
 * call shape, so only the model-id arg changes in nanobanana.ts.
 *
 * Calm-tool note: this is a PARENT control. The child flow never reads it; an
 * invalid/unknown stored id can never reach the child — `resolveImageModel`
 * falls back to the env default (loud `[stories]` log) before any generation.
 */
export interface ImageModelOption {
  id: string;
  /** Short French label shown on the picker card. */
  label: string;
  /** One-line French note: relative price / speed / quality. */
  note: string;
}

export const IMAGE_MODELS: readonly ImageModelOption[] = [
  {
    id: "gemini-2.5-flash-image",
    label: "Rapide & économique",
    note: "Le moins cher (~0,04 $/image) · le plus rapide · qualité correcte",
  },
  {
    id: "gemini-3.1-flash-image",
    label: "Équilibré",
    note: "Bon rapport qualité/prix (~0,07 $/image) · vitesse flash",
  },
  {
    id: "gemini-3-pro-image-preview",
    label: "Qualité maximale",
    note: "Plus belle image (~0,13 $/image) · plus lent",
  },
] as const;

/** The product default when nothing else is configured (the "Équilibré" tier). */
export const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

const VALID_IMAGE_MODEL_IDS: ReadonlySet<string> = new Set(
  IMAGE_MODELS.map((m) => m.id)
);

/** True when `id` is one of the offered models. */
export function isValidImageModel(id: string | undefined): boolean {
  return id !== undefined && VALID_IMAGE_MODEL_IDS.has(id);
}

/**
 * Resolve a (possibly untrusted) requested model id against the allowlist.
 * Returns `requested` when it is offered; otherwise logs a loud `[stories]`
 * warning and returns `fallback`. Used server-side so a stale/tampered
 * client value can never send an unknown model to the provider — and the
 * operator sees in the console whenever a fallback happened.
 */
export function resolveImageModel(
  requested: string | undefined,
  fallback: string
): string {
  if (isValidImageModel(requested)) {
    return requested as string;
  }
  if (requested !== undefined) {
    console.warn(
      `[stories] unknown image model '${requested}', falling back to ${fallback}`
    );
  }
  return fallback;
}
