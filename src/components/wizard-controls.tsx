import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";

interface WizardControlsProps {
  /** Go to the previous step. Omitted on the first step (no back). */
  onBack?: () => void;
  /** Reset the whole parcours back to the first step. */
  onRestart: () => void;
}

/**
 * The shared back + restart row under the stepper, identical in both parcours.
 * "← Retour" is a quiet ghost link to the previous step (hidden on the first
 * step). "Recommencer" is deliberately DISCREET — small, muted, right-aligned —
 * so a child won't tap it by accident; it resets the parcours to the start.
 */
export function WizardControls({ onBack, onRestart }: WizardControlsProps) {
  function handleRestart() {
    // A light confirm so an accidental tap doesn't wipe the picks. Calm wording,
    // no stakes. (window.confirm matches the parent pages' delete confirms.)
    if (window.confirm("On recommence depuis le début ?")) {
      onRestart();
    }
  }

  return (
    <div className="no-print flex items-center justify-between">
      {onBack ? (
        <Button
          className="gap-2 text-base text-muted-foreground"
          onClick={onBack}
          type="button"
          variant="ghost"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Button>
      ) : (
        <span />
      )}

      <Button
        aria-label="Recommencer depuis le début"
        className="gap-1.5 text-muted-foreground/70 text-sm hover:text-muted-foreground"
        onClick={handleRestart}
        size="sm"
        type="button"
        variant="ghost"
      >
        <RotateCcw className="size-3.5" />
        Recommencer
      </Button>
    </div>
  );
}
