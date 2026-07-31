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
  CAUSE_TYPE_DESCRIPTIONS,
  CAUSE_TYPES,
  NATURE_CHANGEMENT_DESCRIPTIONS,
  NATURE_CHANGEMENT_TYPES,
  SYSTEM_PARTS,
  type BikeSystem,
  type CauseType,
  type NatureChangementType,
} from "@/lib/reference-data";
import {
  NEW_INTERVENTION,
  type Intervention,
  type MaintenanceEvent,
} from "@/lib/types";
import type { EventFormState } from "@/app/(dashboard)/bikes/[id]/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR");
}

export function MaintenanceEventForm({
  action,
  event,
  interventions,
  fixedInterventionId,
  onSuccess,
}: {
  action: (
    prevState: EventFormState,
    formData: FormData
  ) => Promise<EventFormState>;
  event?: MaintenanceEvent;
  interventions: Intervention[];
  fixedInterventionId?: string;
  onSuccess: () => void;
}) {
  const [state, formAction] = useFormState<EventFormState, FormData>(action, {
    error: null,
    success: false,
  });
  const [system, setSystem] = useState<BikeSystem>(
    event?.system ?? "transmission"
  );
  const [natureChangement, setNatureChangement] =
    useState<NatureChangementType>(event?.nature_changement ?? "entretien");
  const [causeType, setCauseType] = useState<CauseType>(
    event?.cause_type ?? "usure_normale"
  );
  const [interventionId, setInterventionId] = useState(
    event?.intervention_id ?? ""
  );
  const datalistId = useId();

  useEffect(() => {
    if (state.success) {
      toast.success(event ? "Changement modifié." : "Changement ajouté.");
      onSuccess();
    }
  }, [state, event, onSuccess]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      {fixedInterventionId ? (
        <input
          type="hidden"
          name="intervention_id"
          value={fixedInterventionId}
        />
      ) : (
        <div className="space-y-2">
          <Label>Intervention *</Label>
          <Select
            name="intervention_id"
            value={interventionId}
            onValueChange={setInterventionId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une intervention" />
            </SelectTrigger>
            <SelectContent>
              {interventions.map((intervention) => (
                <SelectItem key={intervention.id} value={intervention.id}>
                  {intervention.title} — {formatDate(intervention.date)}
                </SelectItem>
              ))}
              <SelectItem value={NEW_INTERVENTION}>
                + Créer une nouvelle intervention
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Chaque changement de pièce appartient à une intervention (la session
            au cours de laquelle il a été réalisé).
          </p>
        </div>
      )}

      {interventionId === NEW_INTERVENTION && (
        <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new_intervention_title">
              Nom de la nouvelle intervention *
            </Label>
            <Input
              id="new_intervention_title"
              name="new_intervention_title"
              required
              placeholder="Ex : Révision de printemps"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_intervention_date">
              Date de l&apos;intervention *
            </Label>
            <Input
              id="new_intervention_date"
              name="new_intervention_date"
              type="date"
              required
              defaultValue={today}
            />
          </div>
        </div>
      )}

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
          placeholder="Ex : Plaquettes de frein avant"
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
          <Label>Nature du changement *</Label>
          <Select
            name="nature_changement"
            value={natureChangement}
            onValueChange={(v) => setNatureChangement(v as NatureChangementType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NATURE_CHANGEMENT_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {NATURE_CHANGEMENT_DESCRIPTIONS[natureChangement]}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Type de cause *</Label>
          <Select
            name="cause_type"
            value={causeType}
            onValueChange={(v) => setCauseType(v as CauseType)}
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
          <p className="text-xs text-muted-foreground">
            {CAUSE_TYPE_DESCRIPTIONS[causeType]}
          </p>
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
