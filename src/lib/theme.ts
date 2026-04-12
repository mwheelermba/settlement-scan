/** Cookie value when the user chose light mode. Absent / other values → default dark. */
export const THEME_COOKIE = "settlementscan_theme";
export const THEME_LIGHT = "light";

export function isDarkFromCookie(theme: string | undefined): boolean {
  return theme !== THEME_LIGHT;
}
