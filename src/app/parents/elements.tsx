import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Home, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ElementForm } from "~/components/element-form";
import { Button } from "~/components/ui/button";
import type { DbElement } from "~/server/db/schema";
import {
  createElementFn,
  deleteElementFn,
  listElementsFn,
  updateElementFn,
} from "~/server/elements-functions";

export const Route = createFileRoute("/parents/elements")({
  loader: () => listElementsFn(),
  component: ParentsElementsPage,
});

/**
 * Parent-only page (URL-only, NOT linked from the child flow) to manage the
 * surprise elements offered in the "et avec quoi ?" picker. Add / edit /
 * soft-delete. Mirrors /parents/lieux exactly (no image-hint field).
 *
 * History safety: editing or deleting an element NEVER changes an
 * already-created story (each story froze its element label + hint at creation).
 */
function ParentsElementsPage() {
  const router = useRouter();
  const elements = Route.useLoaderData();
  // null = no form open; "new" = add form; an element = editing it.
  const [editing, setEditing] = useState<DbElement | "new" | null>(null);

  async function refresh() {
    await router.invalidate();
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "Retirer cet élément ? Les histoires déjà créées ne changeront pas.",
      )
    ) {
      return;
    }
    await deleteElementFn({ data: { id } });
    await refresh();
  }

  async function handleSubmit(values: {
    label: string;
    emoji?: string;
    imagePath?: string;
    promptHint: string;
  }) {
    if (editing === "new") {
      await createElementFn({ data: values });
    } else if (editing) {
      await updateElementFn({ data: { id: editing.id, ...values } });
    }
    setEditing(null);
    await refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <Button
          className="gap-2 text-lg text-muted-foreground"
          nativeButton={false}
          render={<Link to="/" />}
          variant="ghost"
        >
          <Home className="size-5" />
          Accueil
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="font-bold text-3xl">Les éléments</h1>
        <p className="text-muted-foreground">
          Ajoute, modifie ou retire les éléments surprise proposés à l'enfant.
          L'enfant peut en choisir un ou deux pour une même histoire. Les
          histoires déjà créées gardent leur élément d'origine.
        </p>
      </div>

      {editing ? (
        <ElementForm
          initial={editing === "new" ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      ) : (
        <Button
          className="gap-2"
          onClick={() => setEditing("new")}
          type="button"
        >
          <Plus className="size-5" />
          Ajouter un élément
        </Button>
      )}

      <ul className="space-y-3">
        {elements.map((element) => (
          <li
            className="flex items-start gap-4 rounded-2xl border bg-card p-4"
            key={element.id}
          >
            <span aria-hidden="true" className="text-3xl leading-none">
              {element.emoji || "✨"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg">{element.label}</p>
              <p className="truncate text-muted-foreground text-sm">
                {element.promptHint}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                aria-label={`Modifier ${element.label}`}
                onClick={() => setEditing(element)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                aria-label={`Retirer ${element.label}`}
                onClick={() => handleDelete(element.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
