/**
 * Dimensions intrinsèques des illustrations générées, pour les attributs
 * width/height des <img> (indice de ratio anti-CLS — le layout reste piloté
 * par le CSS). 4:3 ≈ 1024×768 : le ratio est FIGÉ par le provider image
 * (`aspectRatio: "4:3"` dans nanobanana.ts) ; changer la résolution là-bas
 * ne demande de mettre à jour que ces deux constantes.
 */
export const GENERATED_IMAGE_WIDTH = 1024;
export const GENERATED_IMAGE_HEIGHT = 768;
