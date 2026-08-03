"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Intervention, InterventionStatus } from "@/lib/types";

/**
 * Actions du chantier : démarrer, clôturer, renommer, supprimer. La clôture
 * est toujours explicite — rien ne se ferme tout seul, un chantier peut dormir
 * des semaines sans être fini.
 *
 * Seul le geste du jour est un bouton. Renommer et supprimer se font une fois
 * par an, voire jamais : au même poids visuel, « Supprimer » captait autant
 * l'œil que ce qu'on venait faire. Même principe que la fiche vélo, où ces
 * deux-là vivent déjà au bas de la fiche d'identité.
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
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* 44 px : l'écran se consulte au garage, au doigt. */}
            <Button
              variant="outline"
              className="ml-auto h-11 w-11 shrink-0 p-0"
              aria-label="Réglages de l'intervention"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          {/* Sans ça, la fermeture du menu reprend le focus et referme la
              boîte de dialogue qu'elle vient d'ouvrir. */}
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil aria-hidden="true" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Le libellé dit ce qu'on supprime : chaque action de la liste
                porte elle aussi un « Supprimer », et rien d'autre ne les
                distinguerait. L'icône double la couleur, qui ne doit jamais
                porter le sens seule. */}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 aria-hidden="true" />
              Supprimer l&apos;intervention
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
