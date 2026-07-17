"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BIKE_CATEGORIES,
  DEFAULT_DEPRECIATION_RATES,
  type BikeCategory,
} from "@/lib/reference-data";
import type { Bike } from "@/lib/types";
import type { BikeFormState } from "@/app/(dashboard)/bikes/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

export function BikeForm({
  action,
  bike,
}: {
  action: (prevState: BikeFormState, formData: FormData) => Promise<BikeFormState>;
  bike?: Bike;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState<BikeFormState, FormData>(action, {
    error: null,
    success: false,
  });
  const [category, setCategory] = useState<BikeCategory>(
    bike?.category ?? "vtt"
  );
  const [rate, setRate] = useState(
    String(bike?.depreciation_rate ?? DEFAULT_DEPRECIATION_RATES.vtt)
  );
  const [rateTouched, setRateTouched] = useState(Boolean(bike));

  useEffect(() => {
    if (state.success) {
      toast.success(bike ? "Vélo modifié." : "Vélo ajouté.");
      router.push(bike ? `/bikes/${bike.id}` : "/bikes");
    }
  }, [state, bike, router]);

  function onCategoryChange(value: string) {
    const cat = value as BikeCategory;
    setCategory(cat);
    if (!rateTouched) {
      setRate(String(DEFAULT_DEPRECIATION_RATES[cat]));
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={bike?.name}
          placeholder="Ex : VTT du quotidien"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brand">Marque</Label>
          <Input
            id="brand"
            name="brand"
            defaultValue={bike?.brand ?? ""}
            placeholder="Ex : Trek"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Modèle</Label>
          <Input
            id="model"
            name="model"
            defaultValue={bike?.model ?? ""}
            placeholder="Ex : Marlin 7"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Catégorie *</Label>
          <Select
            name="category"
            value={category}
            onValueChange={onCategoryChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BIKE_CATEGORIES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="depreciation_rate">
            Dépréciation annuelle (%) *
          </Label>
          <Input
            id="depreciation_rate"
            name="depreciation_rate"
            type="number"
            min="0"
            max="100"
            step="0.5"
            required
            value={rate}
            onChange={(e) => {
              setRate(e.target.value);
              setRateTouched(true);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="purchase_date">Date d&apos;achat</Label>
          <Input
            id="purchase_date"
            name="purchase_date"
            type="date"
            defaultValue={bike?.purchase_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchase_price">Prix d&apos;achat (€) *</Label>
          <Input
            id="purchase_price"
            name="purchase_price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={bike?.purchase_price ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mileage_km">Kilométrage (km)</Label>
          <Input
            id="mileage_km"
            name="mileage_km"
            type="number"
            min="0"
            defaultValue={bike?.mileage_km ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="spec_sheet_url">Lien fiche technique</Label>
          <Input
            id="spec_sheet_url"
            name="spec_sheet_url"
            type="url"
            defaultValue={bike?.spec_sheet_url ?? ""}
            placeholder="Ex : https://marque.com/fiche-technique"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end">
        <SubmitButton label={bike ? "Enregistrer" : "Ajouter le vélo"} />
      </div>
    </form>
  );
}
