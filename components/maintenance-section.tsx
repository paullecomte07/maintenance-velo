"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createEvent,
  deleteEvent,
  updateEvent,
} from "@/app/(dashboard)/bikes/[id]/actions";
import { MaintenanceEventForm } from "@/components/maintenance-event-form";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BIKE_SYSTEMS,
  CAUSE_TYPES,
  NATURE_CHANGEMENT_TYPES,
} from "@/lib/reference-data";
import type { Intervention, MaintenanceEvent } from "@/lib/types";

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
          <DialogTitle>Supprimer ce changement de pièce ?</DialogTitle>
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
                  toast.success("Changement supprimé.");
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

export function MaintenanceSection({
  bikeId,
  events,
  interventions,
  fixedInterventionId,
}: {
  bikeId: string;
  events: MaintenanceEvent[];
  interventions: Intervention[];
  fixedInterventionId?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<MaintenanceEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceEvent | null>(
    null
  );

  const totalCost = events.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  const interventionById = new Map(interventions.map((i) => [i.id, i]));

  // Sur la fiche d'une intervention, la colonne serait la même sur chaque ligne.
  const showInterventionColumn = !fixedInterventionId;

  function interventionCell(event: MaintenanceEvent) {
    const intervention = event.intervention_id
      ? interventionById.get(event.intervention_id)
      : undefined;

    if (!intervention) return "—";

    return (
      <Link
        href={`/bikes/${bikeId}/interventions/${intervention.id}`}
        className="underline underline-offset-4"
      >
        {intervention.title}
      </Link>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">
          Cahier de changement de pièces
        </CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          Ajouter un changement
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun changement de pièce enregistré.
          </p>
        ) : (
          <>
            {/* Tableau (desktop) */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Titre</TableHead>
                    {showInterventionColumn && (
                      <TableHead>Intervention</TableHead>
                    )}
                    <TableHead>Système</TableHead>
                    <TableHead>Nature</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead className="text-right">Coût</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(event.date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {event.title}
                      </TableCell>
                      {showInterventionColumn && (
                        <TableCell>{interventionCell(event)}</TableCell>
                      )}
                      <TableCell>{BIKE_SYSTEMS[event.system]}</TableCell>
                      <TableCell>
                        {NATURE_CHANGEMENT_TYPES[event.nature_changement]}
                      </TableCell>
                      <TableCell>{CAUSE_TYPES[event.cause_type]}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {formatCost(event.cost)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
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
                          className="text-destructive"
                          onClick={() => setDeleteTarget(event)}
                        >
                          Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Cards (mobile) */}
            <div className="space-y-3 md:hidden">
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.date)} ·{" "}
                        {BIKE_SYSTEMS[event.system]}
                      </p>
                      {showInterventionColumn && (
                        <p className="text-sm text-muted-foreground">
                          Intervention : {interventionCell(event)}
                        </p>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-sm font-medium">
                      {formatCost(event.cost)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">
                      {NATURE_CHANGEMENT_TYPES[event.nature_changement]}
                    </Badge>
                    <Badge variant="outline">
                      {CAUSE_TYPES[event.cause_type]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
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
              <span className="font-semibold">{formatCost(totalCost)}</span>
            </p>
          </>
        )}
      </CardContent>

      {/* Dialog ajout */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un changement de pièce</DialogTitle>
          </DialogHeader>
          <MaintenanceEventForm
            action={createEvent.bind(null, bikeId)}
            interventions={interventions}
            fixedInterventionId={fixedInterventionId}
            onSuccess={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog édition */}
      <Dialog
        open={editEvent !== null}
        onOpenChange={(open) => !open && setEditEvent(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le changement de pièce</DialogTitle>
          </DialogHeader>
          {editEvent && (
            <MaintenanceEventForm
              key={editEvent.id}
              action={updateEvent.bind(null, editEvent.id, bikeId)}
              event={editEvent}
              interventions={interventions}
              fixedInterventionId={fixedInterventionId}
              onSuccess={() => setEditEvent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      {deleteTarget && (
        <DeleteEventDialog
          event={deleteTarget}
          bikeId={bikeId}
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}
    </Card>
  );
}
