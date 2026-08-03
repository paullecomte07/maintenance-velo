"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { ChipGroup } from "@/components/chip-group";
import { DictationButton } from "@/components/dictation-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  detecterNomDAction,
  INTERVENTION_CAUSE_DESCRIPTIONS,
  INTERVENTION_CAUSES,
  NOMS_SESSION_SUGGERES,
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
  const [title, setTitle] = useState(intervention?.title ?? "");
  const [note, setNote] = useState(intervention?.note ?? "");

  /**
   * La dictée **complète** la note : la transcription se trompe sur le
   * vocabulaire du cycle, et on dicte volontiers en plusieurs fois.
   */
  function ajouterAuTexte(texte: string) {
    setNote((actuel) => (actuel ? `${actuel.trimEnd()} ${texte}` : texte));
  }
  // Seule exception à l'obligation : corriger une session importée, dont la
  // cause est inconnue et le restera. L'exiger reviendrait à en faire inventer
  // une — le défaut même que cette refonte corrige.
  const causeFacultative = intervention !== undefined && intervention.cause === null;

  // Le nom décrit-il une action plutôt qu'une session ? On le signale, on ne
  // l'interdit pas : « Chaîne et cassette » est un nom de session recevable.
  const indice = detecterNomDAction(title);

  useEffect(() => {
    if (state.success) {
      toast.success(intervention ? "Session modifiée." : "Session ajoutée.");
      onSuccess();
    }
  }, [state, intervention, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {/* La cause d'abord. C'est la seule question déjà à la bonne altitude :
          elle porte sur le passage à l'atelier, pas sur une pièce. La poser en
          premier plante le cadre avant que la page blanche du nom ne le
          défasse. Une seule cause pour toute la session, jamais par pièce. */}
      <ChipGroup
        label="Pourquoi tu passes à l'atelier ?"
        options={INTERVENTION_CAUSES}
        value={cause}
        onChange={setCause}
        hint={
          cause
            ? INTERVENTION_CAUSE_DESCRIPTIONS[cause]
            : causeFacultative
              ? "Cette session vient de ton historique importé : sa cause est inconnue. Tu peux la renseigner, ou la laisser vide."
              : undefined
        }
      />
      <input type="hidden" name="cause" value={cause ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="title">
          Nom de la session{" "}
          <span className="font-normal text-muted-foreground">
            (facultatif)
          </span>
        </Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Révision de printemps"
        />

        {/* Montrer la bonne altitude plutôt que l'expliquer. Rien n'est
            pré-rempli : ces noms attendent un clic. */}
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Noms proposés"
        >
          {NOMS_SESSION_SUGGERES.map((nom) => (
            <button
              key={nom}
              type="button"
              onClick={() => setTitle(nom)}
              className="rounded-full border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              {nom}
            </button>
          ))}
        </div>

        {indice && (
          <p className="text-xs text-muted-foreground">
            {indice.type === "piece" ? (
              <>
                «&nbsp;{indice.mot}&nbsp;» est une pièce. Ici on nomme la
                session entière — tu la noteras juste après, en ajoutant une
                action. Par exemple : «&nbsp;Révision de printemps&nbsp;».
              </>
            ) : (
              <>
                «&nbsp;{indice.mot}&nbsp;» décrit un geste. Ici on nomme la
                session entière — tu noteras les gestes juste après, en
                ajoutant des actions. Par exemple : «&nbsp;Entretien
                annuel&nbsp;».
              </>
            )}
          </p>
        )}

        {!title.trim() && (
          <p className="text-xs text-muted-foreground">
            Sans nom, cette session s&apos;affichera par sa cause et sa date.
          </p>
        )}
      </div>

      {/* Facultative : une session peut être prévue « un jour », sans échéance. */}
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
          apparaître la session comme en retard.
        </p>
      </div>

      {/* Multiligne : on y dicte volontiers plusieurs phrases, et une seule
          ligne les rendrait illisibles. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="note">Note</Label>
          <DictationButton onTranscript={ajouterAuTexte} />
        </div>
        <Textarea
          id="note"
          name="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
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
