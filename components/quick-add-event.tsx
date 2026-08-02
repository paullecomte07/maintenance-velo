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
import type { Intervention } from "@/lib/types";

/**
 * Point d'entrée unique de la saisie. Depuis la fiche vélo, il ouvre le
 * formulaire sans rien demander sur le regroupement : le serveur rattache au
 * chantier ouvert, ou en démarre un dont l'utilisateur choisit le nom.
 */
export function QuickAddEvent({
  bikeId,
  interventions,
  openIntervention,
  lastMileageKm,
  fixedInterventionId,
  label = "Ajouter une action",
  variant = "default",
}: {
  bikeId: string;
  interventions: Intervention[];
  openIntervention?: Intervention | null;
  lastMileageKm?: number | null;
  fixedInterventionId?: string;
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
            interventions={interventions}
            openIntervention={openIntervention}
            lastMileageKm={lastMileageKm}
            fixedInterventionId={fixedInterventionId}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
