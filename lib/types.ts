import type {
  BikeCategory,
  BikeSystem,
  CauseType,
  InterventionType,
} from "@/lib/reference-data";

export type Bike = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: BikeCategory;
  purchase_date: string | null;
  purchase_price: number;
  mileage_km: number | null;
  spec_sheet_url: string | null;
  depreciation_rate: number;
  photo_url: string | null;
  ai_analysis: string | null;
  ai_analysis_generated_at: string | null;
  created_at: string;
};

export type MaintenanceEvent = {
  id: string;
  bike_id: string;
  date: string;
  title: string;
  system: BikeSystem;
  intervention_type: InterventionType;
  cause_type: CauseType;
  cost: number | null;
  created_at: string;
};
