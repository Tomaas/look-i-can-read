import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { DbElement } from "~/server/db/schema";

export interface ElementFormValues {
  label: string;
  emoji?: string;
  imagePath?: string;
  promptHint: string;
}

interface ElementFormProps {
  // Undefined = a new element; a row = editing it.
  initial?: DbElement;
  onSubmit: (values: ElementFormValues) => void | Promise<void>;
  onCancel: () => void;
}

// Match the place form's sizing so the parent tools read identically.
const LABEL_CLASS = "text-base";
const FIELD_CLASS = "md:text-base";

/**
 * Add / edit form for an element (the "et avec quoi ?" surprise-element
 * choices). Mirrors the place form (no image-hint — elements never drive the
 * illustration). `label` + `promptHint` are required (mirrors the server Zod).
 * Emoji + image path are optional; image UPLOAD is out of scope.
 */
export function ElementForm({ initial, onSubmit, onCancel }: ElementFormProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [imagePath, setImagePath] = useState(initial?.imagePath ?? "");
  const [promptHint, setPromptHint] = useState(initial?.promptHint ?? "");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = label.trim().length > 0 && promptHint.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        label: label.trim(),
        emoji: emoji.trim() || undefined,
        imagePath: imagePath.trim() || undefined,
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
        <Label className={LABEL_CLASS} htmlFor="element-label">
          Nom (montré à l'enfant)
        </Label>
        <Input
          className={FIELD_CLASS}
          id="element-label"
          onChange={(e) => setLabel(e.target.value)}
          placeholder="une clé magique"
          value={label}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS} htmlFor="element-emoji">
          Emoji (facultatif)
        </Label>
        <Input
          className={`w-24 ${FIELD_CLASS}`}
          id="element-emoji"
          maxLength={8}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🗝️"
          value={emoji}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS} htmlFor="element-hint">
          Description pour l'histoire (l'enfant ne la voit pas)
        </Label>
        <Textarea
          className={`min-h-24 ${FIELD_CLASS}`}
          id="element-hint"
          onChange={(e) => setPromptHint(e.target.value)}
          placeholder="une clé magique qui ouvre des portes surprenantes et douces"
          value={promptHint}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS} htmlFor="element-image">
          Chemin d'image (facultatif, avancé)
        </Label>
        <Input
          className={FIELD_CLASS}
          id="element-image"
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
