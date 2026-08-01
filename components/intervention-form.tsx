"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { ChipGroup } from "@/components/chip-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  INTERVENTION_CAUSE_DESCRIPTIONS,
  INTERVENTION_CAUSES,
  type InterventionCause,
} from "@/lib/reference-data";
import type { Intervention } from "@/lib/types";
import type { InterventionFormState } from "@/app/(dashboard)/bikes/[id]/interventions/actions";

function SubmitButton({
  label,
  disabled,
}: {
  label: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

export function InterventionForm({
  action,
  intervention,
  onSuccess,
}: {
  action: (
    prevState: InterventionFormState,
    formData: FormData
  ) => Promise<InterventionFormState>;
  intervention?: Intervention;
  onSuccess: () => void;
}) {
  const [state, formAction] = useFormState<InterventionFormState, FormData>(
    action,
    { error: null, success: false }
  );
  const [cause, setCause] = useState<InterventionCause | null>(
    intervention?.cause ?? null
  );
  // Seule exception à l'obligation : corriger une intervention importée, dont
  // la cause est inconnue et le restera. L'exiger reviendrait à en faire
  // inventer une — le défaut même que cette refonte corrige.
  const causeFacultative = intervention !== undefined && intervention.cause === null;

  useEffect(() => {
    if (state.success) {
      toast.success(
        intervention ? "Intervention modifiée." : "Intervention ajoutée."
      );
      onSuccess();
    }
  }, [state, intervention, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Nom de l&apos;intervention *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={intervention?.title}
          placeholder="Ex : Révision de printemps"
        />
      </div>

      {/* Une seule cause pour tout le chantier, jamais par pièce. */}
      <ChipGroup
        label="Pourquoi ce chantier ?"
        options={INTERVENTION_CAUSES}
        value={cause}
        onChange={setCause}
        hint={
          cause
            ? INTERVENTION_CAUSE_DESCRIPTIONS[cause]
            : causeFacultative
              ? "Cette intervention vient de ton historique importé : sa cause est inconnue. Tu peux la renseigner, ou la laisser vide."
              : undefined
        }
      />
      <input type="hidden" name="cause" value={cause ?? ""} />

      {/* Facultative : un chantier peut être prévu « un jour », sans échéance. */}
      <div className="space-y-2">
        <Label htmlFor="date_prevue">Date prévue</Label>
        <Input
          id="date_prevue"
          name="date_prevue"
          type="date"
          defaultValue={intervention?.date_prevue ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Laisse vide si tu ne sais pas encore quand. Une date dépassée fait
          apparaître l&apos;intervention comme en retard.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Input
          id="note"
          name="note"
          defaultValue={intervention?.note ?? ""}
          placeholder="Remarques sur la session (facultatif)"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center justify-end gap-3">
        {!cause && !causeFacultative && (
          <p className="text-xs text-muted-foreground">
            Choisis une cause pour enregistrer.
          </p>
        )}
        <SubmitButton
          label={intervention ? "Enregistrer" : "Ajouter"}
          disabled={!cause && !causeFacultative}
        />
      </div>
    </form>
  );
}
