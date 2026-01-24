"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Language } from "../i18n/settings";

/**
 * A custom hook that wraps Next.js router to automatically add the current language prefix to paths.
 * This prevents language from being lost during navigation.
 *
 * @example
 * const router = useLocalizedRouter();
 * router.push("/lobby"); // Will navigate to /fi/lobby if current language is Finnish
 */
export function useLocalizedRouter() {
  const router = useRouter();
  const params = useParams();
  const currentLng = params?.lng as Language | undefined;

  const localizedPush = useCallback(
    (path: string, options?: Parameters<typeof router.push>[1]) => {
      // If path already starts with a language prefix, use it as-is
      if (path.startsWith("/en/") || path.startsWith("/fi/")) {
        router.push(path, options);
        return;
      }

      // Add language prefix to the path
      const localizedPath = currentLng ? `/${currentLng}${path}` : path;
      router.push(localizedPath, options);
    },
    [router, currentLng],
  );

  const localizedReplace = useCallback(
    (path: string, options?: Parameters<typeof router.replace>[1]) => {
      // If path already starts with a language prefix, use it as-is
      if (path.startsWith("/en/") || path.startsWith("/fi/")) {
        router.replace(path, options);
        return;
      }

      // Add language prefix to the path
      const localizedPath = currentLng ? `/${currentLng}${path}` : path;
      router.replace(localizedPath, options);
    },
    [router, currentLng],
  );

  return useMemo(
    () => ({
      ...router,
      push: localizedPush,
      replace: localizedReplace,
    }),
    [router, localizedPush, localizedReplace],
  );
}
