"use client";

import { useState } from "react";

import { createEvent } from "@/app/(dashboard)/bikes/[id]/actions";
import { MaintenanceEventForm } from "@/components/maintenance-event-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Point d'entrée de la saisie, depuis la fiche d'une intervention. On n'ajoute
 * plus d'action depuis la fiche vélo : l'intervention est la porte d'entrée,
 * pas un effet de bord de la première action.
 */
export function QuickAddEvent({
  bikeId,
  interventionId,
  label = "Ajouter une action",
  variant = "default",
}: {
  bikeId: string;
  interventionId: string;
  label?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter une action</DialogTitle>
          </DialogHeader>
          <MaintenanceEventForm
            action={createEvent.bind(null, bikeId)}
            interventionId={interventionId}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
