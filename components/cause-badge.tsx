import { Badge } from "@/components/ui/badge";
import {
  INTERVENTION_CAUSES,
  type InterventionCause,
} from "@/lib/reference-data";
import type { Intervention } from "@/lib/types";

/**
 * La cause d'un chantier, sur une échelle de gravité : ce qu'on a subi se
 * signale, ce qu'on a choisi reste neutre.
 *
 * « Casse d'usure » et « Dysfonctionnement » partagent volontairement la même
 * teinte : ils décrivent la même gravité — quelque chose ne va plus, sans
 * violence extérieure. Leur inventer deux couleurs distinctes donnerait un
 * arc-en-ciel sans rien apprendre ; c'est le libellé qui les sépare, et il est
 * toujours écrit.
 */
const VARIANTES: Record<
  InterventionCause,
  "alert" | "warn" | "outline"
> = {
  accident: "alert",
  casse_usure: "warn",
  dysfonctionnement: "warn",
  prevention: "outline",
};

export function CauseBadge({ cause }: { cause: Intervention["cause"] }) {
  // L'historique importé n'a pas de cause, et on ne lui en invente pas.
  if (!cause) return <Badge variant="absent">Cause non renseignée</Badge>;

  return <Badge variant={VARIANTES[cause]}>{INTERVENTION_CAUSES[cause]}</Badge>;
}
