"use client";

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
  INTERVENTION_TYPES,
} from "@/lib/reference-data";
import type { MaintenanceEvent } from "@/lib/types";

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
          <DialogTitle>Supprimer cette intervention ?</DialogTitle>
          <DialogDescription>
            « {event.title} » du {formatDate(event.date)} sera supprimée
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
                  toast.success("Intervention supprimée.");
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
}: {
  bikeId: string;
  events: MaintenanceEvent[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<MaintenanceEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceEvent | null>(
    null
  );

  const totalCost = events.reduce((sum, e) => sum + (e.cost ?? 0), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Cahier d&apos;intervention</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          Ajouter une intervention
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune intervention enregistrée pour ce vélo.
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
                    <TableHead>Système</TableHead>
                    <TableHead>Intervention</TableHead>
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
                      <TableCell>{BIKE_SYSTEMS[event.system]}</TableCell>
                      <TableCell>
                        {INTERVENTION_TYPES[event.intervention_type]}
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
                    </div>
                    <span className="whitespace-nowrap text-sm font-medium">
                      {formatCost(event.cost)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">
                      {INTERVENTION_TYPES[event.intervention_type]}
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
            <DialogTitle>Ajouter une intervention</DialogTitle>
          </DialogHeader>
          <MaintenanceEventForm
            action={createEvent.bind(null, bikeId)}
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
            <DialogTitle>Modifier l&apos;intervention</DialogTitle>
          </DialogHeader>
          {editEvent && (
            <MaintenanceEventForm
              key={editEvent.id}
              action={updateEvent.bind(null, editEvent.id, bikeId)}
              event={editEvent}
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
