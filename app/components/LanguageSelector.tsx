"use client";

import { Globe } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { languages, type Language } from "../i18n/settings";

const languageNames: Record<Language, string> = {
  en: "English",
  fi: "Suomi",
};

export function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLng = params?.lng as Language;

  const handleLanguageChange = (newLng: Language) => {
    if (newLng === currentLng) return;

    // Replace the language segment in the path
    const pathWithoutLng = pathname.replace(`/${currentLng}`, "");
    router.push(`/${newLng}${pathWithoutLng}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-400" />
      <div className="flex gap-1">
        {languages.map((lng) => (
          <button
            type="button"
            key={lng}
            onClick={() => handleLanguageChange(lng)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              currentLng === lng
                ? "bg-cyan-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}
          >
            {languageNames[lng]}
          </button>
        ))}
      </div>
    </div>
  );
}
