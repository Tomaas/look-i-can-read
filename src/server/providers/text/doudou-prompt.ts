import type { DoudouContext } from "~/server/providers/types";

/**
 * The optional doudou (comforting companion) prompt fragments, shared by the
 * classic + dynamic text providers so the framing is identical.
 *
 * The doudou is PURE comfort with ZERO stakes: a reassuring presence that
 * accompanies the hero, never gets lost, never is in danger, never creates
 * conflict, and always stays close. The system clause keeps it on-contract; the
 * existing FORBIDDEN_TERMS scan (catches "peur", "danger"…) is the backstop.
 */

/**
 * The user-prompt line for the doudou(s). "" when there is no doudou. With
 * several, lists them all so the model names each one naturally in the text
 * (e.g. "avec Zaichik et Pikachu tout contre lui"); they all accompany the hero,
 * comfort him, never get lost, and stay close to the end.
 */
export function doudouUserBlock(doudous: DoudouContext[]): string {
  const hints = doudous.map((d) => d.promptHint).filter(Boolean);
  if (hints.length === 0) {
    return "";
  }
  const joined =
    hints.length === 1
      ? hints[0]
      : `${hints.slice(0, -1).join(" ; ")} ; et ${hints.at(-1)}`;
  const plural = hints.length > 1;
  return (
    `Doudou${plural ? "s" : ""} (compagnon${plural ? "s" : ""} rassurant${plural ? "s" : ""}) : ${joined}. ` +
    `${plural ? "Ils accompagnent" : "Il accompagne"} le héros tout du long, ` +
    `le réconforte${plural ? "nt" : ""}, ne se perde${plural ? "nt" : ""} jamais et reste${plural ? "nt" : ""} près de lui jusqu'à la fin. ` +
    `Nomme chaque doudou naturellement au fil de l'histoire (pas forcément à chaque fois, sans alourdir les phrases).`
  );
}

/**
 * The IMAGE-prompt fragment for the doudou(s): all of them beside the hero. ""
 * when there is none. Shared by the classic + dynamic image prompts so the
 * framing is identical (and so multi-doudou composes naturally — busy is
 * acceptable, there is no hard cap).
 */
export function doudouImageLine(doudous: DoudouContext[]): string {
  const hints = doudous.map((d) => d.imageHint).filter(Boolean);
  if (hints.length === 0) {
    return "";
  }
  const joined =
    hints.length === 1
      ? hints[0]
      : `${hints.slice(0, -1).join(", ")} et ${hints.at(-1)}`;
  // With several, ask for them GROUPED together near the child so a busy
  // illustration stays coherent (no hard cap — the user wanted "several").
  return hints.length === 1
    ? `Avec ${joined}, tendrement près de l'enfant.`
    : `Avec ${joined}, les doudous choisis regroupés tendrement près de l'enfant.`;
}

/**
 * The system-prompt clause: the doudou is a comforting presence, never a source
 * of danger, loss, or conflict. Always included (harmless when no doudou).
 */
export const DOUDOU_SYSTEM_CLAUSE =
  "- S'il y a un doudou, c'est un compagnon purement rassurant : il ne se perd " +
  "jamais, ne court aucun danger, n'a jamais peur, ne crée aucun enjeu ni " +
  "conflit, et reste tendrement près du héros jusqu'au bout.";
