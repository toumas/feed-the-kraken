import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ lng: "en" }),
  usePathname: () => "",
}));

// Simple i18next mock that uses real English translations
import enTranslations from "./app/i18n/locales/en/common.json";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // biome-ignore lint/suspicious/noExplicitAny: Mocking i18next options
    t: (key: string, options?: any) => {
      const count = options?.count;
      let finalKey = key;
      if (typeof count === "number" && count !== 1) {
        finalKey = `${key}_plural`;
      }

      const parts = finalKey.split(".");
      // biome-ignore lint/suspicious/noExplicitAny: Mocking i18next resources
      let val: any = enTranslations;
      for (const part of parts) {
        val = val?.[part];
      }

      // Fallback if plural key doesn't exist
      if (val === undefined && finalKey.endsWith("_plural")) {
        const baseParts = key.split(".");
        val = enTranslations;
        for (const part of baseParts) {
          // biome-ignore lint/suspicious/noExplicitAny: Mocking i18next resources
          val = (val as any)?.[part];
        }
      }

      if (typeof val === "string") {
        let result = val;
        if (options) {
          for (const k of Object.keys(options)) {
            result = result.replace(`{{${k}}}`, String(options[k]));
          }
        }
        return result;
      }
      return key;
    },

    i18n: {
      changeLanguage: () => Promise.resolve(),
      resolvedLanguage: "en",
    },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("next/image", () => ({
  // biome-ignore lint/suspicious/noExplicitAny: Mocking component props
  default: ({ src, alt, ...props }: any) => {
    // biome-ignore lint/performance/noImgElement: Mocking next/image
    return <img src={src} alt={alt} {...props} />;
  },
}));
