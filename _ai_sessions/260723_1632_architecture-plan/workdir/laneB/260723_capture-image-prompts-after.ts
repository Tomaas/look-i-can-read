/**
 * AFTER-capture for candidate 3: same fixtures as the BEFORE capture, run
 * through the EXTRACTED builder. `diff` against 260723_image-prompts-before.json
 * proves byte-identity.
 */

import { buildSegmentImagePrompt } from "~/server/providers/image/segment-prompt";
import { FIXTURES } from "./260723_capture-image-prompts";

const out: Record<string, string> = {};
for (const f of FIXTURES) {
  out[f.name] = buildSegmentImagePrompt(
    { visualWorld: f.visualWorld },
    { paragraphs: f.paragraphs, sceneHint: f.sceneHint },
    f.hasReference,
    {
      doudous: f.doudous,
      heroes: f.heroes,
      outfit: f.outfit,
      place: f.place,
    }
  );
}
console.log(JSON.stringify(out, null, 2));
