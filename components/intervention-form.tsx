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

  const today = new Date().toISOString().slice(0, 10);

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

      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={intervention?.date ?? today}
        />
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
