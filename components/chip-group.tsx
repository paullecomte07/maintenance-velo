"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Groupe de puces à choix unique. Toutes les valeurs sont visibles d'un coup
 * d'œil, et **aucune n'est pré-sélectionnée** : les anciennes valeurs par
 * défaut produisaient silencieusement de la donnée fausse sur les champs dont
 * dépend toute l'analyse.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    // Le groupe est nommé : deux groupes du même formulaire peuvent proposer
    // le même libellé (« Accident » vaut pour un chantier comme pour une
    // pièce), et rien ne relie ces boutons à leur Label sans ça.
    <div className="space-y-2" role="group" aria-label={label}>
      <div className="flex items-center gap-2">
        <Label>{label} *</Label>
        {value === null && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
            À choisir
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(options) as [T, string][]).map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              value === key
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : "border-input bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {text}
          </button>
        ))}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
