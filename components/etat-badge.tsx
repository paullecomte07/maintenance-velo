import { Badge } from "@/components/ui/badge";
import { ETATS_CONSTATES, type EtatConstate } from "@/lib/reference-data";
import type { MaintenanceEvent } from "@/lib/types";

/**
 * L'état dans lequel une pièce a été trouvée, sur une échelle qui se lit d'un
 * bout à l'autre : neuve, correcte, usée trop tôt, morte. Le libellé est
 * toujours écrit — la couleur ne fait que rendre la liste balayable.
 */
const VARIANTES: Record<EtatConstate, "info" | "ok" | "warn" | "alert"> = {
  neuf: "info",
  usure_normale: "ok",
  usure_prematuree: "warn",
  hs: "alert",
};

export function EtatBadge({
  etat,
}: {
  etat: MaintenanceEvent["etat_constate"];
}) {
  // Vide sur l'historique migré depuis un « accident », qui ne disait rien de
  // l'état de la pièce. Ça ne se remplira jamais : on l'affiche tel quel.
  if (!etat) return <Badge variant="absent">État non renseigné</Badge>;

  return <Badge variant={VARIANTES[etat]}>{ETATS_CONSTATES[etat]}</Badge>;
}
