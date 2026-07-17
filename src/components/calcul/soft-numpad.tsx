import { Delete } from "lucide-react";
import { Button } from "~/components/ui/button";

/**
 * Soft on-screen numpad for the atelier — big rounded keys, no sounds, no
 * flourish. The only "special" key is a gentle erase (a pencil has one too).
 */
export function SoftNumpad({
  onDigit,
  onErase,
  disabled,
}: {
  onDigit: (digit: string) => void;
  onErase: () => void;
  disabled?: boolean;
}) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  return (
    <div className="grid w-fit grid-cols-5 gap-2">
      {digits.map((d) => (
        <Button
          className="size-14 rounded-2xl text-2xl sm:size-16"
          disabled={disabled}
          key={d}
          onClick={() => onDigit(d)}
          variant="outline"
        >
          {d}
        </Button>
      ))}
      <Button
        aria-label="Effacer"
        className="col-span-2 h-14 rounded-2xl sm:h-16"
        disabled={disabled}
        onClick={onErase}
        variant="ghost"
      >
        <Delete className="size-6" />
      </Button>
    </div>
  );
}
