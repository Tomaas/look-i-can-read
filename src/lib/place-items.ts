import type { PickerItem } from "~/components/picker-grid";

/** Minimal shape both a DB place and a config place satisfy. */
interface PlaceLike {
  id: string;
  label: string;
  emoji?: string | null;
}

/**
 * Map places (DB rows OR config entries) to picker items. A DB place's emoji is
 * optional, so fall back to a calm pin rather than an empty tile.
 */
export function toPlaceItems(places: PlaceLike[]): PickerItem[] {
  return places.map((p) => ({
    id: p.id,
    label: p.label,
    emoji: p.emoji || "📍",
  }));
}
