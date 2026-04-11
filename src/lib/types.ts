export type SettlementType =
  | "data_breach"
  | "consumer"
  | "vehicle"
  | "employment"
  | "financial"
  | "housing"
  | "health";

export type QualifyingQuestion = {
  id: string;
  text: string;
  field: string;
  required: boolean;
};

export type VehicleCriterion = {
  make: string;
  model: string;
  yearMin?: number;
  yearMax?: number;
};

export type SettlementCriteria = {
  states: string[] | null;
  services: string[] | null;
  products: string[] | null;
  vehicles: VehicleCriterion[] | null;
  breach_name: string | null;
  date_range: { after: string; before: string } | null;
  qualifying_questions: QualifyingQuestion[];
};

export type Settlement = {
  id: string;
  title: string;
  defendant: string;
  description: string;
  deadline: string | null;
  claim_url: string;
  source_url: string;
  estimated_payout: string;
  proof_required: boolean | null;
  type: SettlementType;
  active: boolean;
  last_verified: string;
  criteria: SettlementCriteria;
};

export type ProfileVehicle = {
  make: string;
  model: string;
  year: number;
};

export type UserProfile = {
  name?: string;
  state: string;
  zip?: string;
  emails: string[];
  services: string[];
  products: string[];
  vehicles: ProfileVehicle[];
  companies_purchased_from: string[];
  breach_names: string[];
  qualifying_answers: Record<string, boolean | string>;
  dismissed_settlements: string[];
  filed_settlements: string[];
  created_at: string;
};

export type MatchResult = {
  settlement: Settlement;
  score: number;
  matchCount: number;
  evaluableCount: number;
  needsInputCount: number;
  mismatchCount: number;
};
