import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { BookHeart, Grid3x3, Leaf } from "lucide-react";
import { useEffect, useState } from "react";
import { Fenetre } from "~/components/bureau/fenetre";
import { EcranPortrait } from "~/components/bureau/portrait";
import { lireSessionOuverte, ouvrirSession } from "~/lib/bureau/session";

/**
 * La route layout pathless du bureau : le CADRE fenêtre autour des trois
 * mini-apps (préfixe `_` = layout sans segment d'URL — les chemins publics
 * /aventure, /calcul, /bibliotheque sont INCHANGÉS ; seuls les fichiers ont
 * déménagé, prémisse 6).
 *
 * Contrat de la layout (eng-review D17-A) — NE PAS poser `ssr: false` ici :
 * la config Selective SSR de TanStack est héritée vers le bas et ne peut que
 * se restreindre — un `ssr: false` rendrait silencieusement les trois
 * mini-apps client-only, exactement le comportement que la prémisse 6 promet
 * intouché. Le cadre fenêtre rend donc SSR-safe (centrage CSS, aucune
 * lecture de window pendant le rendu).
 *
 * La gate session-fermée (ceo-review T2-A) vit à exactement DEUX endroits :
 * ICI et `/` — jamais dans __root (sinon /parents et /data/$ seraient
 * gatés). Politique de flash (eng-review D22-A) : les enfants rendent
 * OPTIMISTEMENT — le SSR des mini-apps reste visible au premier paint, le
 * portrait ne se SUPERPOSE que quand la vérification client dit « session
 * fermée ». Le seul flash accepté est le lien profond à session fermée
 * (rare) — jamais le chemin quotidien session-ouverte.
 */
export const Route = createFileRoute("/_bureau")({
  component: BureauLayout,
});

/** Le titre de la fenêtre = le libellé de l'icône du bureau + son pictogramme. */
function appPourChemin(pathname: string) {
  if (pathname.startsWith("/calcul")) {
    return { icone: <Grid3x3 className="size-5" />, titre: "Calculs" };
  }
  if (pathname.startsWith("/bibliotheque")) {
    return { icone: <BookHeart className="size-5" />, titre: "Bibliothèque" };
  }
  return { icone: <Leaf className="size-5" />, titre: "Histoires" };
}

function BureauLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const app = appPourChemin(pathname);
  // false au SSR et au premier rendu client (rendu optimiste D22-A) ; la
  // vérification est 100 % client — le serveur ne lit pas localStorage.
  const [gateFermee, setGateFermee] = useState(false);
  useEffect(() => {
    setGateFermee(!lireSessionOuverte());
  }, []);

  return (
    <>
      <Fenetre icone={app.icone} titre={app.titre}>
        <Outlet />
      </Fenetre>
      {gateFermee ? (
        <EcranPortrait
          onOuvrir={() => {
            ouvrirSession();
            setGateFermee(false);
          }}
        />
      ) : null}
    </>
  );
}
