"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  ETAT_CONSTATE_DESCRIPTIONS,
  ETATS_CONSTATES,
  NATURE_CHANGEMENT_DESCRIPTIONS,
  NATURE_CHANGEMENT_TYPES,
  systemsForPart,
  type BikeSystem,
  type EtatConstate,
  type NatureChangementType,
} from "@/lib/reference-data";
import type { MaintenanceEvent } from "@/lib/types";
import type { EventFormState } from "@/app/(dashboard)/bikes/[id]/actions";

function SubmitButton({
  label,
  disabled,
  variant,
  onClick,
}: {
  label: string;
  disabled: boolean;
  variant?: "default" | "outline";
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      onClick={onClick}
    >
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

/**
 * Saisie d'une action. La session est **toujours** connue à l'avance : on
 * n'entre dans ce formulaire que depuis sa fiche. C'est ce qui a permis de
 * retirer la question du nom et de la cause au milieu de la saisie — la session
 * n'est plus un effet de bord de la première action.
 */
export function MaintenanceEventForm({
  action,
  event,
  interventionId,
  lastMileageKm,
  onSuccess,
}: {
  action: (
    prevState: EventFormState,
    formData: FormData
  ) => Promise<EventFormState>;
  event?: MaintenanceEvent;
  /** Session à laquelle l'action est rattachée. */
  interventionId: string;
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
  const [etatConstate, setEtatConstate] = useState<EtatConstate | null>(
    event?.etat_constate ?? null
  );
  const datalistId = useId();

  const formRef = useRef<HTMLFormElement>(null);
  // « Enregistrer et ajouter une autre » : l'intention est portée par un ref
  // plutôt qu'un state, parce qu'elle est lue dans l'effet de succès et ne doit
  // déclencher aucun rendu.
  const continuer = useRef(false);

  // Les systèmes candidats pour l'organe saisi. Un seul candidat renseigne le
  // système sans rien demander ; plusieurs les proposent côte à côte.
  const candidates = systemsForPart(title);
  const isAmbiguous = candidates.length > 1;

  useEffect(() => {
    const found = systemsForPart(title);
    if (found.length === 1) setSystem(found[0]);
  }, [title]);

  useEffect(() => {
    if (!state.success) return;

    if (continuer.current) {
      // On reste dans le formulaire pour l'action suivante de la même session.
      continuer.current = false;
      setTitle("");
      setSystem(null);
      setNatureChangement(null);
      setEtatConstate(null);
      formRef.current?.reset();
      toast.success("Action enregistrée. À la suivante.");
      return;
    }

    toast.success(event ? "Action modifiée." : "Action ajoutée.");
    onSuccess();
  }, [state, event, onSuccess]);

  const today = new Date().toISOString().slice(0, 10);
  const incomplete = !system || !natureChangement || !etatConstate;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="intervention_id" value={interventionId} />

      {/* L'action d'abord : c'est elle l'unité de saisie. Ouvrir sur la pièce
          rendait l'inspection absurde — on n'a rien changé, et il fallait
          pourtant décrire un changement. */}
      <ChipGroup
        label="Qu'est-ce que tu as fait ?"
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

      <div className="space-y-2">
        <Label htmlFor="title">Sur quelle pièce ? *</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Plaquettes"
          list={datalistId}
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
          // `?? ""` et non `?? undefined` : `undefined` rendrait le Select
          // non contrôlé, il garderait l'affichage de l'action précédente
          // après un « ajouter une autre », et re-choisir la même valeur ne
          // déclencherait aucun changement — champ visuellement rempli, mais
          // vide pour le formulaire.
          <Select
            name="system"
            value={system ?? ""}
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

      {/* L'état est une **observation**, pas une intention : il ne se déduit
          jamais de la cause de la session. Une casse d'usure peut très bien
          contenir des pièces trouvées en bon état. */}
      <ChipGroup
        label="Dans quel état tu l'as trouvée ?"
        options={ETATS_CONSTATES}
        value={etatConstate}
        onChange={setEtatConstate}
        hint={etatConstate ? ETAT_CONSTATE_DESCRIPTIONS[etatConstate] : undefined}
      />
      <input type="hidden" name="etat_constate" value={etatConstate ?? ""} />

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

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {incomplete && (
          <p className="text-xs text-muted-foreground">
            Choisis l&apos;action, le système et l&apos;état pour enregistrer.
          </p>
        )}
        {/* Une session compte 1 à 4 pièces : sans ce second bouton, chacune
            imposerait un aller-retour par la navigation. */}
        {!event && (
          <SubmitButton
            label="Enregistrer et ajouter une autre action"
            variant="outline"
            disabled={incomplete}
            onClick={() => {
              continuer.current = true;
            }}
          />
        )}
        <SubmitButton
          label={event ? "Enregistrer" : "Ajouter"}
          disabled={incomplete}
        />
      </div>
    </form>
  );
}
