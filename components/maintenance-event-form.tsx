"use client";

import { useEffect, useId, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BIKE_SYSTEMS,
  CAUSE_TYPES,
  INTERVENTION_TYPES,
  SYSTEM_PARTS,
  type BikeSystem,
} from "@/lib/reference-data";
import type { MaintenanceEvent } from "@/lib/types";
import type { EventFormState } from "@/app/(dashboard)/bikes/[id]/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

export function MaintenanceEventForm({
  action,
  event,
  onSuccess,
}: {
  action: (
    prevState: EventFormState,
    formData: FormData
  ) => Promise<EventFormState>;
  event?: MaintenanceEvent;
  onSuccess: () => void;
}) {
  const [state, formAction] = useFormState<EventFormState, FormData>(action, {
    error: null,
    success: false,
  });
  const [system, setSystem] = useState<BikeSystem>(
    event?.system ?? "transmission"
  );
  const datalistId = useId();

  useEffect(() => {
    if (state.success) {
      toast.success(
        event ? "Intervention modifiée." : "Intervention ajoutée."
      );
      onSuccess();
    }
  }, [state, event, onSuccess]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={event?.date ?? today}
          />
        </div>
        <div className="space-y-2">
          <Label>Système *</Label>
          <Select
            name="system"
            value={system}
            onValueChange={(v) => setSystem(v as BikeSystem)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BIKE_SYSTEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={event?.title}
          placeholder="Cassette Shimano V9"
          list={datalistId}
        />
        <datalist id={datalistId}>
          {SYSTEM_PARTS[system].map((part) => (
            <option key={part} value={part} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">
          Suggestions basées sur les organes du système sélectionné.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type d&apos;intervention *</Label>
          <Select
            name="intervention_type"
            defaultValue={event?.intervention_type ?? "entretien"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTERVENTION_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type de cause *</Label>
          <Select
            name="cause_type"
            defaultValue={event?.cause_type ?? "usure_normale"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CAUSE_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cost">Coût (€)</Label>
        <Input
          id="cost"
          name="cost"
          type="number"
          min="0"
          step="0.01"
          defaultValue={event?.cost ?? ""}
          placeholder="Laisser vide si inconnu"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end">
        <SubmitButton label={event ? "Enregistrer" : "Ajouter"} />
      </div>
    </form>
  );
}
