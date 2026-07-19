-- Migration de DONNÉES (décisions eng-review 1B + T3) — aucun changement de
-- schéma. La ligne legacy `calcul-pose` (palier unique) devient une ligne par
-- famille `calcul-pose:<famille>`, dérivée de son palier (constraints.op).
-- GARDÉE et IDEMPOTENTE : si des lignes au nouveau format existent déjà (le
-- parent a sauvegardé pendant la fenêtre app-déployée-pas-migrée), on ne
-- réécrit rien ; la legacy est supprimée dans tous les cas. Rejouable sans
-- dégât. Un palier inconnu retombe sur addition (miroir de resolvePalier).
UPDATE math_skills
SET skill = 'calcul-pose:' || CASE
    WHEN palier IN ('sous-sans-emprunt', 'sous-emprunt') THEN 'soustraction'
    WHEN palier IN ('mult-1-chiffre', 'mult-abstraite') THEN 'multiplication'
    ELSE 'addition'
  END
WHERE skill = 'calcul-pose'
  AND NOT EXISTS (
    SELECT 1 FROM math_skills WHERE skill LIKE 'calcul-pose:%'
  );--> statement-breakpoint
DELETE FROM math_skills WHERE skill = 'calcul-pose';
