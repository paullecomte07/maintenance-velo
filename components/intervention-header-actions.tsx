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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  nomDeSession,
  type Intervention,
  type InterventionStatus,
} from "@/lib/types";

/** « 4 200 km », comme sur un compteur. */
function formatKm(km: number) {
  return `${km.toLocaleString("fr-FR")} km`;
}

/**
 * Champ de relevé, partagé par le démarrage et la correction. Le libellé dit
 * explicitement « du vélo » : c'est toute l'ambiguïté que ce champ traînait
 * quand il vivait sur l'action, au milieu de questions portant sur la pièce.
 */
function ChampKilometrage({
  id,
  value,
  onChange,
  lastMileageKm,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  lastMileageKm?: number | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Kilométrage du vélo au compteur</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Facultatif"
      />
      <p className="text-xs text-muted-foreground">
        {lastMileageKm !== null && lastMileageKm !== undefined
          ? `Dernier relevé connu : ${formatKm(lastMileageKm)}. `
          : ""}
        Tu peux le laisser vide et le compléter plus tard.
      </p>
    </div>
  );
}

/**
 * Actions de la session : démarrer, clôturer, nommer, supprimer. La clôture est
 * toujours explicite — rien ne se ferme tout seul, une session peut dormir des
 * semaines sans être finie.
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
  lastMileageKm,
  onStart,
  onClose,
  onDelete,
  onSetMileage,
}: {
  bikeId: string;
  intervention: Intervention;
  status: InterventionStatus;
  /** Nombre d'actions rattachées, annoncé dans la confirmation de suppression. */
  actionCount: number;
  /** Dernier relevé connu du vélo, proposé par défaut. */
  lastMileageKm?: number | null;
  onStart: (mileageKm: number | null) => Promise<{ error: string | null }>;
  onClose: () => Promise<{ error: string | null }>;
  onDelete: () => Promise<{ error: string | null }>;
  onSetMileage: (mileageKm: number | null) => Promise<{ error: string | null }>;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [kmOpen, setKmOpen] = useState(false);
  const [km, setKm] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error: string | null }>, ok: string) {
    startTransition(async () => {
      const { error } = await fn();
      if (error) toast.error(error);
      else toast.success(ok);
    });
  }

  /** Champ vide = relevé absent, et non zéro kilomètre. */
  function kmSaisi(): number | null {
    const valeur = km.trim();
    return valeur === "" ? null : Number(valeur);
  }

  const dernierReleve =
    lastMileageKm !== null && lastMileageKm !== undefined
      ? String(lastMileageKm)
      : "";

  function ouvrirDemarrage() {
    setKm(dernierReleve);
    setStartOpen(true);
  }

  function ouvrirCorrection() {
    setKm(
      intervention.mileage_km !== null
        ? String(intervention.mileage_km)
        : dernierReleve
    );
    setKmOpen(true);
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {status === "a_venir" && (
              <Button size="sm" disabled={isPending} onClick={ouvrirDemarrage}>
                Démarrer cette session
              </Button>
            )}
            {status === "en_cours" && (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => run(onClose, "Session clôturée.")}
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
                aria-label="Réglages de la session"
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
                Supprimer la session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Le relevé reste corrigeable dans les trois états : une session
            démarrée sans compteur sous les yeux se complète après coup. */}
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <span>
            {intervention.mileage_km !== null
              ? `${formatKm(intervention.mileage_km)} au compteur`
              : "Kilométrage non relevé"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={ouvrirCorrection}
          >
            {intervention.mileage_km !== null ? "Corriger" : "Relever"}
          </Button>
        </div>
      </div>

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Démarrer cette session</DialogTitle>
            <DialogDescription>
              C&apos;est le bon moment pour relever le compteur : tu es à côté
              du vélo.
            </DialogDescription>
          </DialogHeader>
          <ChampKilometrage
            id="km-demarrage"
            value={km}
            onChange={setKm}
            lastMileageKm={lastMileageKm}
          />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setStartOpen(false)}
            >
              Annuler
            </Button>
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const { error } = await onStart(kmSaisi());
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success("Session démarrée.");
                  setStartOpen(false);
                })
              }
            >
              {isPending ? "Démarrage…" : "Démarrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={kmOpen} onOpenChange={setKmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kilométrage de la session</DialogTitle>
          </DialogHeader>
          <ChampKilometrage
            id="km-correction"
            value={km}
            onChange={setKm}
            lastMileageKm={lastMileageKm}
          />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setKmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const { error } = await onSetMileage(kmSaisi());
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success("Kilométrage enregistré.");
                  setKmOpen(false);
                })
              }
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la session</DialogTitle>
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
              Supprimer « {nomDeSession(intervention)} » ?
            </DialogTitle>
            {/* Chiffrer ce qu'on perd : un « Êtes-vous sûr ? » qui ne dit pas
                combien d'actions partent avec ne protège de rien. */}
            <DialogDescription>
              {actionCount === 0
                ? "Cette session ne contient aucune action. La suppression est définitive."
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
                  toast.success("Session supprimée.");
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
