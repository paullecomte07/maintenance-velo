"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteEvent,
  moveEvent,
  updateEvent,
} from "@/app/(dashboard)/bikes/[id]/actions";
import { EtatBadge } from "@/components/etat-badge";
import { MaintenanceEventForm } from "@/components/maintenance-event-form";
import { QuickAddEvent } from "@/components/quick-add-event";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BIKE_SYSTEMS, NATURE_CHANGEMENT_TYPES } from "@/lib/reference-data";
import {
  nomDeSession,
  type Intervention,
  type MaintenanceEvent,
} from "@/lib/types";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR");
}

function formatCost(cost: number | null) {
  if (cost === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cost);
}

function DeleteEventDialog({
  event,
  bikeId,
  open,
  onOpenChange,
}: {
  event: MaintenanceEvent;
  bikeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer cette action ?</DialogTitle>
          <DialogDescription>
            « {event.title} » du {formatDate(event.date)} sera supprimé
            définitivement.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteEvent(event.id, bikeId);
                  toast.success("Action supprimée.");
                  onOpenChange(false);
                } catch {
                  toast.error("La suppression a échoué.");
                }
              })
            }
          >
            {isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Déplacer une action d'une session vers une autre : sans cela, une erreur de
 * rattachement automatique deviendrait définitive.
 */
function MoveEventDialog({
  event,
  bikeId,
  interventions,
  open,
  onOpenChange,
}: {
  event: MaintenanceEvent;
  bikeId: string;
  interventions: Intervention[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [target, setTarget] = useState(event.intervention_id);
  const [isPending, startTransition] = useTransition();
  const others = interventions.filter((i) => i.id !== event.intervention_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déplacer « {event.title} »</DialogTitle>
          <DialogDescription>
            Choisis la session qui doit porter cette action.
          </DialogDescription>
        </DialogHeader>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ce vélo n&apos;a pas d&apos;autre session où déplacer cette
            action.
          </p>
        ) : (
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger aria-label="Session de destination">
              <SelectValue placeholder="Sélectionner une session" />
            </SelectTrigger>
            <SelectContent>
              {others.map((intervention) => (
                <SelectItem key={intervention.id} value={intervention.id}>
                  {nomDeSession(intervention)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button
            disabled={isPending || others.length === 0 || target === event.intervention_id}
            onClick={() =>
              startTransition(async () => {
                const { error } = await moveEvent(event.id, target, bikeId);
                if (error) {
                  toast.error(error);
                  return;
                }
                toast.success("Action déplacée.");
                onOpenChange(false);
              })
            }
          >
            {isPending ? "Déplacement…" : "Déplacer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceSection({
  bikeId,
  events,
  interventions,
  interventionId,
  lastMileageKm,
}: {
  bikeId: string;
  events: MaintenanceEvent[];
  /** Toutes les interventions du vélo — nécessaires pour le déplacement. */
  interventions: Intervention[];
  /** La session dont on liste les actions. */
  interventionId: string;
  lastMileageKm?: number | null;
}) {
  const [editEvent, setEditEvent] = useState<MaintenanceEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceEvent | null>(
    null
  );
  const [moveTarget, setMoveTarget] = useState<MaintenanceEvent | null>(null);

  const totalCost = events.reduce((sum, e) => sum + (e.cost ?? 0), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Actions réalisées</CardTitle>
        <QuickAddEvent
          bikeId={bikeId}
          interventionId={interventionId}
          lastMileageKm={lastMileageKm}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune action enregistrée dans cette session.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  data-testid="action"
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {/* L'action en tête de ligne, la pièce en titre : c'est
                          l'action qu'on ajoute, la pièce n'est que son objet. */}
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {NATURE_CHANGEMENT_TYPES[event.nature_changement]}
                      </p>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.date)} · {BIKE_SYSTEMS[event.system]}
                        {event.mileage_km !== null &&
                          ` · ${event.mileage_km.toLocaleString("fr-FR")} km`}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-medium tabular-nums">
                      {formatCost(event.cost)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <EtatBadge etat={event.etat_constate} />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditEvent(event)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMoveTarget(event)}
                    >
                      Déplacer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(event)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="border-t pt-3 text-right text-sm">
              Coût total :{" "}
              <span className="font-semibold tabular-nums">
                {formatCost(totalCost)}
              </span>
            </p>
          </>
        )}
      </CardContent>

      <Dialog
        open={editEvent !== null}
        onOpenChange={(open) => !open && setEditEvent(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;action</DialogTitle>
          </DialogHeader>
          {editEvent && (
            <MaintenanceEventForm
              key={editEvent.id}
              action={updateEvent.bind(null, editEvent.id, bikeId)}
              event={editEvent}
              interventionId={interventionId}
              lastMileageKm={lastMileageKm}
              onSuccess={() => setEditEvent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {deleteTarget && (
        <DeleteEventDialog
          event={deleteTarget}
          bikeId={bikeId}
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}

      {moveTarget && (
        <MoveEventDialog
          event={moveTarget}
          bikeId={bikeId}
          interventions={interventions}
          open={moveTarget !== null}
          onOpenChange={(open) => !open && setMoveTarget(null)}
        />
      )}
    </Card>
  );
}
