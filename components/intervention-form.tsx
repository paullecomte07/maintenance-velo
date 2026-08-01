"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Intervention } from "@/lib/types";
import type { InterventionFormState } from "@/app/(dashboard)/bikes/[id]/interventions/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
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

      <div className="flex justify-end">
        <SubmitButton label={intervention ? "Enregistrer" : "Ajouter"} />
      </div>
    </form>
  );
}
