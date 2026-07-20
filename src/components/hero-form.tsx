import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { DbHero } from "~/server/db/schema";

export interface HeroFormValues {
  emoji?: string;
  imageHint: string;
  imagePath?: string;
  label: string;
  promptHint: string;
}

interface HeroFormProps {
  // Undefined = a new hero; a row = editing it.
  initial?: DbHero;
  onCancel: () => void;
  onSubmit: (values: HeroFormValues) => void | Promise<void>;
}

// Match the doudou/place forms' sizing so the parent tools read identically.
const LABEL_CLASS = "text-base";
const FIELD_CLASS = "md:text-base";

/**
 * Add / edit form for a hero (the "qui est le héros ?" choices). Mirrors the
 * doudou form (it shares the image-hint field: the hero appears in the
 * illustration). `label`, `promptHint` + `imageHint` are required (mirrors the
 * server Zod). Emoji + image path are optional; image UPLOAD is out of scope.
 */
export function HeroForm({ initial, onSubmit, onCancel }: HeroFormProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [imagePath, setImagePath] = useState(initial?.imagePath ?? "");
  const [promptHint, setPromptHint] = useState(initial?.promptHint ?? "");
  const [imageHint, setImageHint] = useState(initial?.imageHint ?? "");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    label.trim().length > 0 &&
    promptHint.trim().length > 0 &&
    imageHint.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        emoji: emoji.trim() || undefined,
        imageHint: imageHint.trim(),
        imagePath: imagePath.trim() || undefined,
        label: label.trim(),
        promptHint: promptHint.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-2xl border bg-card p-5"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <Label className={LABEL_CLASS} htmlFor="hero-label">
          Prénom (montré à l'enfant)
        </Label>
        <Input
          className={FIELD_CLASS}
          id="hero-label"
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Mona"
          value={label}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS} htmlFor="hero-emoji">
          Emoji (facultatif)
        </Label>
        <Input
          className={`w-24 ${FIELD_CLASS}`}
          id="hero-emoji"
          maxLength={8}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🐻"
          value={emoji}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS} htmlFor="hero-hint">
          Description pour l'histoire (l'enfant ne la voit pas)
        </Label>
        <Textarea
          className={`min-h-24 ${FIELD_CLASS}`}
          id="hero-hint"
          onChange={(e) => setPromptHint(e.target.value)}
          placeholder="Mona, la grande sœur de Jules, gentille et courageuse"
          value={promptHint}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS} htmlFor="hero-image-hint">
          Description pour l'illustration (l'enfant ne la voit pas)
        </Label>
        <Textarea
          className={`min-h-24 ${FIELD_CLASS}`}
          id="hero-image-hint"
          onChange={(e) => setImageHint(e.target.value)}
          placeholder="un petit garçon aux cheveux bruns, au sourire doux"
          value={imageHint}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS} htmlFor="hero-image">
          Chemin d'image (facultatif, avancé)
        </Label>
        <Input
          className={FIELD_CLASS}
          id="hero-image"
          onChange={(e) => setImagePath(e.target.value)}
          placeholder="(vide)"
          value={imagePath}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button disabled={!canSubmit || submitting} type="submit">
          {initial ? "Enregistrer" : "Ajouter"}
        </Button>
        <Button onClick={onCancel} type="button" variant="ghost">
          Annuler
        </Button>
      </div>
    </form>
  );
}
