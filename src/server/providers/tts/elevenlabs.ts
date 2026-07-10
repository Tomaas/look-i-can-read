import { serverEnv } from "~/env";
import { generateId } from "~/lib/id-generator";
import { saveMedia } from "~/server/providers/media-store";
import type { Lang, TtsProvider } from "~/server/providers/types";

// A warm multilingual ElevenLabs voice (Rachel). Multilingual model covers FR.
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const MODEL_ID = "eleven_multilingual_v2";

/**
 * Premium alternative TTS via the ElevenLabs REST API. Raw fetch — no SDK
 * needed for a single endpoint. Behind TTS_ENABLED + TTS_PROVIDER=elevenlabs.
 */
export const elevenLabsTtsProvider: TtsProvider = {
  async synthesize(text: string, _lang: Lang): Promise<string> {
    if (!serverEnv.elevenLabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY manquante.");
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": serverEnv.elevenLabsApiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({ text, model_id: MODEL_ID }),
      },
    );

    if (!res.ok) {
      throw new Error(`ElevenLabs a renvoyé une erreur (${res.status}).`);
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    return saveMedia(`${generateId("audio")}.mp3`, bytes);
  },
};
