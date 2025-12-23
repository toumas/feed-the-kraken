export const fallbackLng = "en";
export const languages = [fallbackLng, "fi"] as const;
export type Language = (typeof languages)[number];
export const defaultNS = "common";
export const cookieName = "i18next";
export const headerName = "x-i18next-current-language";
