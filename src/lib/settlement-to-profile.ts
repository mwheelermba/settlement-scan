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
