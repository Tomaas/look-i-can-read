import type { PickerItem } from "~/components/picker-grid";

/** Minimal shape both a DB place and a config place satisfy. */
interface PlaceLike {
  emoji?: string | null;
  id: string;
  label: string;
}

/**
 * Map places (DB rows OR config entries) to picker items. A DB place's emoji is
 * optional, so fall back to a calm pin rather than an empty tile.
 */
export function toPlaceItems(places: PlaceLike[]): PickerItem[] {
  return places.map((p) => ({
    emoji: p.emoji || "📍",
    id: p.id,
    label: p.label,
  }));
}
