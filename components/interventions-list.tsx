"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createIntervention } from "@/app/(dashboard)/bikes/[id]/interventions/actions";
import { InterventionForm } from "@/components/intervention-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isEnRetard, type Intervention } from "@/lib/types";

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

/** « 14 – 17 mars » : la plage réellement couverte par les pièces du chantier. */
function formatRange(first: string | null, last: string | null) {
  if (!first) return "—";
  if (!last || first === last) return formatDate(first);
  return `${formatDate(first)} – ${formatDate(last)}`;
}

function InterventionRow({
  bikeId,
  intervention,
  stat,
  range,
}: {
  bikeId: string;
  intervention: Intervention;
  stat: { count: number; totalCost: number };
  range?: { first: string | null; last: string | null };
}) {
  const enRetard = isEnRetard(intervention);
  const isOpen = intervention.started_at !== null && intervention.closed_at === null;

  const subtitle =
    intervention.closed_at !== null
      ? formatRange(range?.first ?? null, range?.last ?? null)
      : intervention.started_at !== null
        ? `Ouvert depuis le ${formatDate(intervention.started_at)}`
        : intervention.date_prevue
          ? `Prévu le ${formatDate(intervention.date_prevue)}`
          : "Sans date";

  return (
    <Link
      href={`/bikes/${bikeId}/interventions/${intervention.id}`}
      className="block"
    >
      <div
        className={`rounded-lg border border-l-[3px] p-3 transition-colors hover:bg-muted/50 ${
          isOpen
            ? "border-l-primary bg-muted/30"
            : enRetard
              ? "border-l-destructive"
              : "border-l-border"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              <span className="truncate">{intervention.title}</span>
              {isOpen && <Badge variant="secondary">En cours</Badge>}
              {enRetard && <Badge variant="destructive">En retard</Badge>}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {subtitle} · {stat.count} pièce{stat.count > 1 ? "s" : ""}
            </p>
          </div>
          {stat.totalCost > 0 && (
            <span className="whitespace-nowrap text-sm font-medium tabular-nums">
              {formatCost(stat.totalCost)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Rappel de clôture d'un chantier resté sans activité. Il ne ferme rien et ne
 * se rejette pas : ajouter une pièce le fait disparaître de lui-même, puisqu'il
 * se fonde sur la date de dernière activité.
 */
function StaleReminder({
  days,
  lastActivity,
  onClose,
}: {
  days: number;
  lastActivity: string | null;
  onClose: () => Promise<{ error: string | null }>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mb-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-3 text-sm">
      <p className="text-muted-foreground">
        Ce chantier est ouvert depuis{" "}
        <span className="font-medium text-foreground">{days} jours</span>
        {lastActivity
          ? `, dernière pièce le ${formatDate(lastActivity)}`
          : ", sans aucune pièce"}
        .
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const { error } = await onClose();
            if (error) toast.error(error);
            else toast.success("Chantier clôturé.");
          })
        }
      >
        {isPending ? "Clôture…" : "Le clôturer"}
      </Button>
    </div>
  );
}

export function InterventionsList({
  bikeId,
  enCours,
  aVenir,
  terminees,
  stats,
  ranges,
  staleReminder,
  onCloseStale,
}: {
  bikeId: string;
  enCours: Intervention[];
  aVenir: Intervention[];
  terminees: Intervention[];
  stats: InterventionStats;
  ranges: Record<string, { first: string | null; last: string | null }>;
  /** Renseigné quand le chantier ouvert dort depuis plus d'un mois. */
  staleReminder?: { days: number; lastActivity: string | null } | null;
  onCloseStale?: () => Promise<{ error: string | null }>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const emptyStat = { count: 0, totalCost: 0 };

  const groups: { key: string; label: string; items: Intervention[] }[] = [
    { key: "en-cours", label: "En cours", items: enCours },
    { key: "a-venir", label: "À venir", items: aVenir },
    { key: "terminees", label: "Terminées", items: terminees },
  ];

  const total = enCours.length + aVenir.length + terminees.length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Interventions</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          Planifier une intervention
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune intervention. Ajoute un changement de pièce pour ouvrir ton
            premier chantier, ou planifie une intervention à venir.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label} ({group.items.length})
              </h3>
              {group.key === "en-cours" && staleReminder && onCloseStale && (
                <StaleReminder
                  days={staleReminder.days}
                  lastActivity={staleReminder.lastActivity}
                  onClose={onCloseStale}
                />
              )}
              {group.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <div className="space-y-2">
                  {group.items.map((intervention) => (
                    <InterventionRow
                      key={intervention.id}
                      bikeId={bikeId}
                      intervention={intervention}
                      stat={stats[intervention.id] ?? emptyStat}
                      range={ranges[intervention.id]}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planifier une intervention</DialogTitle>
          </DialogHeader>
          <InterventionForm
            action={createIntervention.bind(null, bikeId)}
            onSuccess={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

