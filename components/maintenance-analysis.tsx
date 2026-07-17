"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { generateAnalysis } from "@/app/(dashboard)/bikes/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function MaintenanceAnalysis({
  bikeId,
  hasEvents,
  initialAnalysis,
  initialGeneratedAt,
}: {
  bikeId: string;
  hasEvents: boolean;
  initialAnalysis: string | null;
  initialGeneratedAt: string | null;
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onAnalyze() {
    startTransition(async () => {
      const result = await generateAnalysis(bikeId);
      if (result.success && result.analysis && result.generatedAt) {
        setAnalysis(result.analysis);
        setGeneratedAt(result.generatedAt);
        setError(null);
        toast.success("Analyse mise à jour.");
      } else {
        setError(result.error ?? "L'analyse a échoué.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Analyse</CardTitle>
        <Button size="sm" onClick={onAnalyze} disabled={isPending || !hasEvents}>
          {isPending
            ? "Analyse en cours…"
            : analysis
              ? "Régénérer l'analyse"
              : "Analyser mon cahier d'entretien"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasEvents && (
          <p className="text-sm text-muted-foreground">
            Ajoute au moins une intervention pour lancer une analyse.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {analysis && (
          <>
            <p className="whitespace-pre-wrap text-sm">{analysis}</p>
            {generatedAt && (
              <p className="text-xs text-muted-foreground">
                Dernière analyse : {formatGeneratedAt(generatedAt)}
              </p>
            )}
          </>
        )}
        {!analysis && !error && hasEvents && (
          <p className="text-sm text-muted-foreground">
            Aucune analyse pour l&apos;instant. Lance-la pour obtenir un avis
            sur ton cahier d&apos;entretien.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
