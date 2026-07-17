import { appConfig } from "~/config/app";
import type { ReadingAidsFlags } from "~/lib/use-reading-aids";
import type { StorySegment } from "~/server/db/schema";
import { isRenderableImagePath } from "~/server/providers/types";
import { HighlightableText } from "./highlightable-text";

/**
 * The discreet colophon printed at the end of every booklet.
 * Shared with the operations sheet (printable-operations.tsx).
 */
export function Colophon() {
  return (
    <p
      className="mt-16 text-center italic"
      style={{ fontSize: "12pt", opacity: 0.6 }}
    >
      {appConfig.storyLabel}
    </p>
  );
}

/**
 * Print-only A5 booklet for a dynamic ("choose-your-path") story: the title,
 * then each beat of the chosen path in order — its illustration (if any) and
 * big text — flowing one after another, then the discreet colophon. Renders
 * whatever images exist; a missing image just leaves that beat text-only and
 * never blocks the booklet. Same @media print rules as the classic booklet.
 * The on-screen reading aids (lettres muettes, liaisons) print too, so the
 * booklet matches real reading-education books — softened by the print CSS.
 */
export function PrintableDynamicStory({
  title,
  segments,
  aids,
}: {
  title: string;
  segments: StorySegment[];
  aids: ReadingAidsFlags;
}) {
  return (
    <article className="printable-story hidden">
      <h1
        className="mb-10 text-center font-bold"
        style={{ fontSize: "28pt", lineHeight: 1.3 }}
      >
        {title}
      </h1>

      <div className="space-y-10">
        {segments.map((segment) => (
          <div className="space-y-6" key={`print-seg-${segment.id}`}>
            {isRenderableImagePath(segment.imagePath) ? (
              <img
                alt=""
                className="w-full rounded-lg"
                src={segment.imagePath}
                style={{ maxHeight: "80mm", objectFit: "cover" }}
              />
            ) : null}
            <div
              className="space-y-6"
              style={{ fontSize: "18pt", lineHeight: 1.8 }}
            >
              {segment.paragraphs.map((paragraph, i) => (
                <p key={`${segment.id}-print-${i}`}>
                  <HighlightableText
                    showLiaisons={aids.showLiaisons}
                    showSilent={aids.showSilent}
                    text={paragraph}
                  />
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Colophon />
    </article>
  );
}
