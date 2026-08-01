import { Badge } from "@/components/ui/badge";
import { INTERVENTION_CAUSES } from "@/lib/reference-data";
import type { Intervention } from "@/lib/types";

/**
 * La cause d'un chantier. Le **libellé est toujours écrit** : la couleur ne
 * fait qu'accélérer la lecture, elle ne porte jamais le sens seule.
 *
 * Seul « Accident » se distingue aujourd'hui, faute de palette : les tokens de
 * couleur du projet sont encore le dégradé de gris par défaut de shadcn. Les
 * quatre causes ne seront réellement distinctes qu'une fois #28 livré — d'ici
 * là, c'est le texte qui fait tout le travail.
 */
export function CauseBadge({ cause }: { cause: Intervention["cause"] }) {
  if (!cause) {
    return (
      <Badge
        variant="outline"
        className="border-dashed font-normal text-muted-foreground"
      >
        Cause non renseignée
      </Badge>
    );
  }

  return (
    <Badge variant={cause === "accident" ? "destructive" : "outline"}>
      {INTERVENTION_CAUSES[cause]}
    </Badge>
  );
}
