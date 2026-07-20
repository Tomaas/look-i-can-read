/**
 * Selectable places. `promptHint` is injected into the story prompt; `label`
 * and `emoji` drive the picker button.
 */
export interface Place {
  emoji: string;
  id: string;
  label: string;
  promptHint: string;
}

export const places: Place[] = [
  {
    emoji: "🗻",
    id: "japon-fuji",
    label: "le Japon, près du mont Fuji",
    promptHint:
      "au Japon, au pied du mont Fuji, parmi les cerisiers dont les pétales tombent comme une neige rose, les lanternes de papier qui se balancent doucement, l'odeur du thé vert chaud et le tintement lointain d'une clochette dans un jardin tout calme",
  },
  {
    emoji: "🌻",
    id: "jardin-papy",
    label: "le jardin de papy",
    promptHint:
      "dans le jardin de papy, avec ses tournesols hauts comme des géants tout gentils, ses tomates qui sentent bon le soleil, le vieux pommier où l'on entend les abeilles ronronner, et l'arrosoir qui fait une petite pluie fraîche sur la terre",
  },
  {
    emoji: "🌲",
    id: "foret",
    label: "la forêt",
    promptHint:
      "dans une forêt paisible et lumineuse, où la mousse est moelleuse comme un coussin, où la lumière passe entre les feuilles en taches dorées, où les oiseaux se répondent tout bas et où de petits sentiers serpentent vers des clairières tranquilles",
  },
  {
    emoji: "🌙",
    id: "lune-espace",
    label: "la lune et l'espace",
    promptHint:
      "sur la lune et dans l'espace, parmi les étoiles qui scintillent comme de minuscules veilleuses, dans un silence ouaté, où l'on flotte sans bruit et où la Terre brille au loin comme une bille bleue rassurante",
  },
  {
    emoji: "🐠",
    id: "fond-mer",
    label: "le fond de la mer",
    promptHint:
      "au fond de la mer, dans une eau tiède et bleue, parmi les poissons colorés qui dansent sans se presser, les coraux aux couleurs tendres, les bulles légères qui montent en chatouillant, et le bercement lent et régulier des algues",
  },
  {
    emoji: "🏰",
    id: "chateau",
    label: "un château",
    promptHint:
      "dans un grand château accueillant, avec ses tours coiffées de petits drapeaux, ses escaliers de pierre tiède, ses tapisseries douillettes, le crépitement d'un feu de cheminée et des jardins où chantent des fontaines paisibles",
  },
];

export function findPlace(id: string): Place | undefined {
  return places.find((p) => p.id === id);
}
