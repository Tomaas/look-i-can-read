import { mkdir } from "node:fs/promises";
import { basename } from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { generateId } from "~/lib/id-generator";
import { mediaFilePath } from "~/server/providers/media-store";
import type { Lang, TtsProvider } from "~/server/providers/types";

// Free Microsoft Edge neural voices. FR in v1; RU voice wired for later.
const VOICE: Record<Lang, string> = {
  fr: "fr-FR-DeniseNeural",
  ru: "ru-RU-SvetlanaNeural",
};

/**
 * Default TTS: msedge-tts (edge-tts Node port). No API key required.
 * Behind TTS_ENABLED — the caller decides whether to invoke this.
 */
export const edgeTtsProvider: TtsProvider = {
  async synthesize(text: string, lang: Lang): Promise<string> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      VOICE[lang],
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
    );

    // In this version, toFile takes the full destination path (with filename)
    // and returns it. Ensure the media directory exists first.
    const destination = mediaFilePath(`${generateId("audio")}.mp3`);
    await mkdir(mediaFilePath(""), { recursive: true });

    const written = await tts.toFile(destination, text);
    return `/data/media/${basename(written)}`;
  },
};
