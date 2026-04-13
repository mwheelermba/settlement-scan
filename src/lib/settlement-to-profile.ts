import type { Settlement, UserProfile } from "./types";

function cleanDefendant(defendant: string): string {
  return defendant.replace(/,?\s*(Inc\.?|LLC|Corp\.?|Ltd\.?|LP\.?|Co\.|PLC|GmbH)$/i, "").trim();
}

/** Merge settlement match terms into the right profile lists so future matches persist. */
export function mergeSettlementIntoProfile(profile: UserProfile, s: Settlement): UserProfile {
  const retail = new Set(profile.retail_and_brands ?? []);
  const financial = new Set(profile.financial_institutions ?? []);
  const employers = new Set(profile.employers ?? []);
  const breach = new Set(profile.breach_names ?? []);
  const products = new Set(profile.products ?? []);
  const medical = new Set(profile.medical_and_health ?? []);

  const def = cleanDefendant(s.defendant);
  const isFin =
    s.type === "financial" ||
    /visa|mastercard|plaid|affirm|paypal|coinbase|fintech|credit\s*card|bank|crypto|exchange/i.test(
      `${s.defendant} ${s.title}`
    );
  const isHealth = s.type === "health";
  const isEmployment = s.type === "employment";

  const pushRetail = (t: string) => {
    const x = t.trim();
    if (x) retail.add(x);
  };
  const pushFin = (t: string) => {
    const x = t.trim();
    if (x) financial.add(x);
  };
  const pushMed = (t: string) => {
    const x = t.trim();
    if (x) medical.add(x);
  };

  for (const x of s.criteria.services ?? []) {
    if (isHealth) pushMed(x);
    else if (isFin) pushFin(x);
    else pushRetail(x);
  }
  for (const x of s.criteria.products ?? []) {
    products.add(x.trim());
  }
  if (s.criteria.breach_name) breach.add(s.criteria.breach_name.trim());
  if (def.length > 0 && def.length < 90) {
    if (isEmployment) employers.add(def);
    else if (isHealth) pushMed(def);
    else if (isFin) pushFin(def);
    else pushRetail(def);
  }

  return {
    ...profile,
    retail_and_brands: [...retail],
    financial_institutions: [...financial],
    employers: [...employers],
    breach_names: [...breach],
    products: [...products],
    medical_and_health: [...medical],
  };
}

function sameStringSet(a: string[] | undefined, b: string[] | undefined): boolean {
  const as = new Set((a ?? []).map((x) => x.trim()).filter(Boolean));
  const bs = new Set((b ?? []).map((x) => x.trim()).filter(Boolean));
  if (as.size !== bs.size) return false;
  for (const v of as) {
    if (!bs.has(v)) return false;
  }
  return true;
}

/** Whether a merge would add at least one new profile term. */
export function settlementAddsProfileTerms(profile: UserProfile, s: Settlement): boolean {
  const next = mergeSettlementIntoProfile(profile, s);
  if (!sameStringSet(profile.retail_and_brands, next.retail_and_brands)) return true;
  if (!sameStringSet(profile.financial_institutions, next.financial_institutions)) return true;
  if (!sameStringSet(profile.employers, next.employers)) return true;
  if (!sameStringSet(profile.breach_names, next.breach_names)) return true;
  if (!sameStringSet(profile.products, next.products)) return true;
  if (!sameStringSet(profile.medical_and_health, next.medical_and_health)) return true;
  return false;
}
