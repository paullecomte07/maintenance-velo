"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createIntervention,
  deleteIntervention,
  updateIntervention,
} from "@/app/(dashboard)/bikes/[id]/interventions/actions";
import { InterventionForm } from "@/components/intervention-form";
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
import type { Intervention } from "@/lib/types";

export type InterventionStats = Record<
  string,
  { count: number; totalCost: number }
>;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR");
}

function formatCost(cost: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cost);
}

function DeleteInterventionDialog({
  intervention,
  bikeId,
  open,
  onOpenChange,
}: {
  intervention: Intervention;
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
            « {intervention.title} » du {formatDate(intervention.date)} sera
            supprimée définitivement.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const { error } = await deleteIntervention(
                  intervention.id,
                  bikeId
                );
                if (error) {
                  toast.error(error);
                  return;
                }
                toast.success("Intervention supprimée.");
                onOpenChange(false);
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

export function InterventionSection({
  bikeId,
  interventions,
  stats,
}: {
  bikeId: string;
  interventions: Intervention[];
  stats: InterventionStats;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Intervention | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Intervention | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Interventions</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          Ajouter une intervention
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {interventions.length === 0 ? (
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
                    <TableHead>Intervention</TableHead>
                    <TableHead className="text-right">Changements</TableHead>
                    <TableHead className="text-right">Coût total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interventions.map((intervention) => {
                    const stat = stats[intervention.id] ?? {
                      count: 0,
                      totalCost: 0,
                    };
                    return (
                      <TableRow key={intervention.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(intervention.date)}
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/bikes/${bikeId}/interventions/${intervention.id}`}
                            className="underline underline-offset-4"
                          >
                            {intervention.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          {stat.count}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {formatCost(stat.totalCost)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditTarget(intervention)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(intervention)}
                          >
                            Supprimer
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Cards (mobile) */}
            <div className="space-y-3 md:hidden">
              {interventions.map((intervention) => {
                const stat = stats[intervention.id] ?? {
                  count: 0,
                  totalCost: 0,
                };
                return (
                  <div key={intervention.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/bikes/${bikeId}/interventions/${intervention.id}`}
                          className="font-medium underline underline-offset-4"
                        >
                          {intervention.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(intervention.date)} · {stat.count}{" "}
                          changement{stat.count > 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-medium">
                        {formatCost(stat.totalCost)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTarget(intervention)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(intervention)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      {/* Dialog ajout */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter une intervention</DialogTitle>
          </DialogHeader>
          <InterventionForm
            action={createIntervention.bind(null, bikeId)}
            onSuccess={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog édition */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;intervention</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <InterventionForm
              key={editTarget.id}
              action={updateIntervention.bind(null, editTarget.id, bikeId)}
              intervention={editTarget}
              onSuccess={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      {deleteTarget && (
        <DeleteInterventionDialog
          intervention={deleteTarget}
          bikeId={bikeId}
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}
    </Card>
  );
}
