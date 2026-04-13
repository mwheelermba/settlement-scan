/**
 * Loose matching for user-entered brands vs settlement criteria strings
 * (spacing, hyphens, casing, partial phrases like "Google" vs "Google Play Store").
 *
 * Generic healthcare/org words ("health", "medical", "hospital", …) must not match
 * on their own — otherwise every "Something Health" defendant matches any profile
 * line that mentions "health".
 */

function fold(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokens(s: string, minLen: number): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= minLen);
}

/** Folded strings that are too generic to use alone for substring / token equality. */
const GENERIC_FOLD = new Set<string>([
  "health",
  "healthcare",
  "medical",
  "hospital",
  "center",
  "centre",
  "care",
  "services",
  "service",
  "group",
  "groups",
  "systems",
  "associates",
  "regional",
  "community",
  "national",
  "international",
  "clinic",
  "clinics",
  "network",
  "physicians",
  "physician",
  "home",
  "specialty",
  "specialties",
  "surgical",
  "surgery",
  "medicine",
  "wellness",
  "therapy",
  "partners",
  "management",
  "memorial",
  "general",
  "public",
  "private",
  "state",
  "county",
  "city",
  "family",
  "fund",
  "life",
  "american",
  "united",
  "first",
  "north",
  "south",
  "east",
  "west",
  "central",
  "behavioral",
  "mental",
  "pediatric",
  "womens",
  "childrens",
  "rehabilitation",
  "rehab",
  "acute",
  "primary",
  "urgent",
  "long",
  "term",
  "inc",
  "llc",
  "corp",
]);

function isGenericFold(folded: string): boolean {
  return GENERIC_FOLD.has(folded);
}

function isGenericToken(t: string): boolean {
  return GENERIC_FOLD.has(t.toLowerCase());
}

export function matchesLoose(profileTerm: string, criteriaTerm: string): boolean {
  const p = profileTerm.trim();
  const c = criteriaTerm.trim();
  if (!p || !c) return false;
  if (p.toLowerCase() === c.toLowerCase()) return true;
  // Avoid spurious hits on very short tokens (e.g. carrier abbreviations vs unrelated words).
  if (p.length < 3 || c.length < 3) return false;

  const pf = fold(p);
  const cf = fold(c);
  if (pf.length >= 2 && cf.length >= 2 && pf === cf) return true;

  // Substring: "health" must not match inside "northwellhealth" unless the profile term is non-generic.
  if (pf.length >= 4 && cf.includes(pf) && !isGenericFold(pf)) return true;
  if (cf.length >= 4 && pf.includes(cf) && !isGenericFold(cf)) return true;

  const pt = tokens(p, 3);
  const ct = tokens(c, 3);
  if (pt.length === 0 || ct.length === 0) {
    if (pf.length < 3 || cf.length < 3) return false;
    if (cf.includes(pf) && !isGenericFold(pf)) return true;
    if (pf.includes(cf) && !isGenericFold(cf)) return true;
    return false;
  }

  return pt.some((a) =>
    ct.some((b) => {
      if (a === b) {
        return !isGenericToken(a);
      }
      if (a.length >= 4 && b.includes(a)) {
        return !isGenericToken(a);
      }
      if (b.length >= 4 && a.includes(b)) {
        return !isGenericToken(b);
      }
      return false;
    })
  );
}
