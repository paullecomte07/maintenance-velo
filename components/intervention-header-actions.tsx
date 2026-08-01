"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateIntervention } from "@/app/(dashboard)/bikes/[id]/interventions/actions";
import { InterventionForm } from "@/components/intervention-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Intervention, InterventionStatus } from "@/lib/types";

/**
 * Actions du chantier : démarrer, clôturer, renommer. La clôture est toujours
 * explicite — rien ne se ferme tout seul, un chantier peut dormir des semaines
 * sans être fini.
 */
export function InterventionHeaderActions({
  bikeId,
  intervention,
  status,
  onStart,
  onClose,
}: {
  bikeId: string;
  intervention: Intervention;
  status: InterventionStatus;
  lastMileageKm?: number | null;
  onStart: () => Promise<{ error: string | null }>;
  onClose: () => Promise<{ error: string | null }>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error: string | null }>, ok: string) {
    startTransition(async () => {
      const { error } = await fn();
      if (error) toast.error(error);
      else toast.success(ok);
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "a_venir" && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(onStart, "Chantier démarré.")}
          >
            {isPending ? "…" : "Démarrer ce chantier"}
          </Button>
        )}
        {status === "en_cours" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(onClose, "Chantier clôturé.")}
          >
            {isPending ? "…" : "Clôturer"}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          Renommer
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;intervention</DialogTitle>
          </DialogHeader>
          <InterventionForm
            action={updateIntervention.bind(null, intervention.id, bikeId)}
            intervention={intervention}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
