/**
 * Loose matching for user-entered brands vs settlement criteria strings
 * (spacing, hyphens, casing, partial phrases like "Google" vs "Google Play Store").
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

export function matchesLoose(profileTerm: string, criteriaTerm: string): boolean {
  const p = profileTerm.trim();
  const c = criteriaTerm.trim();
  if (!p || !c) return false;
  if (p.toLowerCase() === c.toLowerCase()) return true;
  // Avoid spurious hits on very short tokens (e.g. carrier abbreviations vs unrelated words).
  if (p.length < 3 || c.length < 3) return false;

  // Fuzzy: spacing, hyphens, case, and many partial overlaps (e.g. "Citi" vs "Citibank" via substring / token overlap).
  const pf = fold(p);
  const cf = fold(c);
  if (pf.length >= 2 && cf.length >= 2 && pf === cf) return true;
  if (pf.length >= 4 && cf.includes(pf)) return true;
  if (cf.length >= 4 && pf.includes(cf)) return true;

  const pt = tokens(p, 3);
  const ct = tokens(c, 3);
  if (pt.length === 0 || ct.length === 0) {
    return pf.length >= 3 && cf.length >= 3 && (cf.includes(pf) || pf.includes(cf));
  }

  return pt.some((a) =>
    ct.some((b) => a === b || (a.length >= 4 && b.includes(a)) || (b.length >= 4 && a.includes(b)))
  );
}
