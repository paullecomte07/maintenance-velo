"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateIntervention } from "@/app/(dashboard)/bikes/[id]/interventions/actions";
import { InterventionForm } from "@/components/intervention-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Intervention, InterventionStatus } from "@/lib/types";

/**
 * Actions du chantier : démarrer, clôturer, renommer, supprimer. La clôture
 * est toujours explicite — rien ne se ferme tout seul, un chantier peut dormir
 * des semaines sans être fini.
 */
export function InterventionHeaderActions({
  bikeId,
  intervention,
  status,
  actionCount,
  onStart,
  onClose,
  onDelete,
}: {
  bikeId: string;
  intervention: Intervention;
  status: InterventionStatus;
  /** Nombre d'actions rattachées, annoncé dans la confirmation de suppression. */
  actionCount: number;
  lastMileageKm?: number | null;
  onStart: () => Promise<{ error: string | null }>;
  onClose: () => Promise<{ error: string | null }>;
  onDelete: () => Promise<{ error: string | null }>;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
        {/* Le libellé reste court à l'écran, mais le nom accessible dit ce
            qu'on supprime : chaque action de la liste porte elle aussi un
            bouton « Supprimer », et rien d'autre ne les distinguerait. */}
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          aria-label="Supprimer l'intervention"
          onClick={() => setDeleteOpen(true)}
        >
          Supprimer
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Supprimer « {intervention.title} » ?
            </DialogTitle>
            {/* Chiffrer ce qu'on perd : un « Êtes-vous sûr ? » qui ne dit pas
                combien d'actions partent avec ne protège de rien. */}
            <DialogDescription>
              {actionCount === 0
                ? "Cette intervention ne contient aucune action. La suppression est définitive."
                : `Ses ${actionCount} action${actionCount > 1 ? "s" : ""} seront supprimées avec elle, définitivement.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setDeleteOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const { error } = await onDelete();
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success("Intervention supprimée.");
                  setDeleteOpen(false);
                  router.push(`/bikes/${bikeId}`);
                })
              }
            >
              {isPending ? "Suppression…" : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
