"use client";

import { useEffect, useId, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { ChipGroup } from "@/components/chip-group";
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
import { cn } from "@/lib/utils";
import {
  ALL_PARTS,
  BIKE_SYSTEMS,
  CAUSE_TYPE_DESCRIPTIONS,
  CAUSE_TYPES,
  INTERVENTION_CAUSE_DESCRIPTIONS,
  INTERVENTION_CAUSES,
  NATURE_CHANGEMENT_DESCRIPTIONS,
  NATURE_CHANGEMENT_TYPES,
  systemsForPart,
  type BikeSystem,
  type CauseType,
  type InterventionCause,
  type NatureChangementType,
} from "@/lib/reference-data";
import type { Intervention, MaintenanceEvent } from "@/lib/types";
import type { EventFormState } from "@/app/(dashboard)/bikes/[id]/actions";

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
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
  openIntervention,
  lastMileageKm,
  onSuccess,
}: {
  action: (
    prevState: EventFormState,
    formData: FormData
  ) => Promise<EventFormState>;
  event?: MaintenanceEvent;
  interventions: Intervention[];
  /** Saisie depuis la fiche d'un chantier : le rattachement est imposé. */
  fixedInterventionId?: string;
  /** Chantier ouvert du vélo, s'il y en a un : rattachement automatique. */
  openIntervention?: Intervention | null;
  /** Dernier kilométrage connu, proposé par défaut. */
  lastMileageKm?: number | null;
  onSuccess: () => void;
}) {
  const [state, formAction] = useFormState<EventFormState, FormData>(action, {
    error: null,
    success: false,
  });

  const [title, setTitle] = useState(event?.title ?? "");
  const [system, setSystem] = useState<BikeSystem | null>(
    event?.system ?? null
  );
  const [natureChangement, setNatureChangement] =
    useState<NatureChangementType | null>(event?.nature_changement ?? null);
  const [causeType, setCauseType] = useState<CauseType | null>(
    event?.cause_type ?? null
  );
  // Cause du *chantier*, demandée uniquement quand cette pièce en ouvre un.
  const [interventionCause, setInterventionCause] =
    useState<InterventionCause | null>(null);
  // Rattachement : vide = « laisse le serveur décider » (chantier ouvert, ou
  // ouverture d'un nouveau chantier). Renseigné = correction explicite.
  const [interventionId, setInterventionId] = useState(
    event?.intervention_id ?? ""
  );
  const [editingAttachment, setEditingAttachment] = useState(false);
  const datalistId = useId();

  // Les systèmes candidats pour l'organe saisi. Un seul candidat renseigne le
  // système sans rien demander ; plusieurs les proposent côte à côte.
  const candidates = systemsForPart(title);
  const isAmbiguous = candidates.length > 1;

  useEffect(() => {
    const found = systemsForPart(title);
    if (found.length === 1) setSystem(found[0]);
  }, [title]);

  useEffect(() => {
    if (state.success) {
      toast.success(event ? "Changement modifié." : "Changement ajouté.");
      onSuccess();
    }
  }, [state, event, onSuccess]);

  const today = new Date().toISOString().slice(0, 10);
  const attachedTo = fixedInterventionId
    ? interventions.find((i) => i.id === fixedInterventionId)
    : openIntervention;
  // Un chantier existe déjà (imposé ou ouvert) : on ne demande pas de titre.
  const needsNewChantier = !fixedInterventionId && !openIntervention && !event;
  const incomplete =
    !system ||
    !natureChangement ||
    !causeType ||
    (needsNewChantier && !interventionCause);

  return (
    <form action={formAction} className="space-y-4">
      {fixedInterventionId && (
        <input
          type="hidden"
          name="intervention_id"
          value={fixedInterventionId}
        />
      )}
      {!fixedInterventionId && interventionId && (
        <input type="hidden" name="intervention_id" value={interventionId} />
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Qu&apos;est-ce que tu as changé ? *</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Plaquettes"
          list={datalistId}
          autoFocus
        />
        <datalist id={datalistId}>
          {ALL_PARTS.map((part) => (
            <option key={part} value={part} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Système *</Label>
          {system && candidates.length === 1 && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Déduit de la pièce
            </span>
          )}
          {!system && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
              À choisir
            </span>
          )}
        </div>
        {isAmbiguous ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {candidates.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={system === candidate}
                  onClick={() => setSystem(candidate)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    system === candidate
                      ? "border-primary bg-primary font-medium text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {BIKE_SYSTEMS[candidate]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Cette pièce existe sur plusieurs systèmes : précise lequel.
            </p>
            <input type="hidden" name="system" value={system ?? ""} />
          </>
        ) : (
          <Select
            name="system"
            value={system ?? undefined}
            onValueChange={(v) => setSystem(v as BikeSystem)}
          >
            {/* Le Select Radix n'est pas relié à son Label : on le nomme. */}
            <SelectTrigger aria-label="Système">
              <SelectValue placeholder="Sélectionner un système" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BIKE_SYSTEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <ChipGroup
        label="Nature du changement"
        options={NATURE_CHANGEMENT_TYPES}
        value={natureChangement}
        onChange={setNatureChangement}
        hint={
          natureChangement
            ? NATURE_CHANGEMENT_DESCRIPTIONS[natureChangement]
            : undefined
        }
      />
      <input
        type="hidden"
        name="nature_changement"
        value={natureChangement ?? ""}
      />

      <ChipGroup
        label="Type de cause"
        options={CAUSE_TYPES}
        value={causeType}
        onChange={setCauseType}
        hint={causeType ? CAUSE_TYPE_DESCRIPTIONS[causeType] : undefined}
      />
      <input type="hidden" name="cause_type" value={causeType ?? ""} />

      <div className="grid gap-4 sm:grid-cols-3">
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
          <Label htmlFor="cost">Coût (€)</Label>
          <Input
            id="cost"
            name="cost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={event?.cost ?? ""}
            placeholder="Facultatif"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mileage_km">Kilométrage</Label>
          <Input
            id="mileage_km"
            name="mileage_km"
            type="number"
            min="0"
            step="1"
            defaultValue={event?.mileage_km ?? lastMileageKm ?? ""}
            placeholder="km au compteur"
          />
        </div>
      </div>

      {needsNewChantier && (
        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <div className="space-y-2">
            <Label htmlFor="new_intervention_title">
              Tu démarres un nouveau chantier. Tu l&apos;appelles comment ? *
            </Label>
            <Input
              id="new_intervention_title"
              name="new_intervention_title"
              required
              placeholder="Ex : Révision de printemps"
            />
            <p className="text-xs text-muted-foreground">
              Demandé une seule fois. Les pièces suivantes s&apos;y rattacheront
              seules, même dans plusieurs jours.
            </p>
          </div>

          {/* La cause vaut pour tout le chantier : elle n'est demandée qu'ici,
              jamais sur les pièces suivantes. */}
          <ChipGroup
            label="Pourquoi ce chantier ?"
            options={INTERVENTION_CAUSES}
            value={interventionCause}
            onChange={setInterventionCause}
            hint={
              interventionCause
                ? INTERVENTION_CAUSE_DESCRIPTIONS[interventionCause]
                : undefined
            }
          />
          <input
            type="hidden"
            name="new_intervention_cause"
            value={interventionCause ?? ""}
          />
        </div>
      )}

      {attachedTo && !fixedInterventionId && !event && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          {editingAttachment ? (
            <div className="space-y-2">
              <Label>Rattacher à</Label>
              <Select
                value={interventionId || attachedTo.id}
                onValueChange={setInterventionId}
              >
                <SelectTrigger aria-label="Rattacher à">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interventions.map((intervention) => (
                    <SelectItem key={intervention.id} value={intervention.id}>
                      {intervention.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Rattaché à{" "}
              <span className="font-medium text-foreground">
                « {attachedTo.title} »
              </span>
              {attachedTo.started_at &&
                `, ouvert depuis le ${formatDate(attachedTo.started_at)}`}
              .{" "}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-4"
                onClick={() => setEditingAttachment(true)}
              >
                Changer
              </button>
            </p>
          )}
        </div>
      )}

      {event && !fixedInterventionId && (
        <div className="space-y-2">
          <Label>Intervention de rattachement</Label>
          <Select value={interventionId} onValueChange={setInterventionId}>
            <SelectTrigger aria-label="Intervention de rattachement">
              <SelectValue placeholder="Sélectionner une intervention" />
            </SelectTrigger>
            <SelectContent>
              {interventions.map((intervention) => (
                <SelectItem key={intervention.id} value={intervention.id}>
                  {intervention.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center justify-end gap-3">
        {incomplete && (
          <p className="text-xs text-muted-foreground">
            {needsNewChantier
              ? "Choisis le système, la nature, la cause de la pièce et celle du chantier pour enregistrer."
              : "Choisis le système, la nature et la cause pour enregistrer."}
          </p>
        )}
        <SubmitButton
          label={event ? "Enregistrer" : "Ajouter"}
          disabled={incomplete}
        />
      </div>
    </form>
  );
}
