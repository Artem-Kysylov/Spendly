import { useMemo } from "react";

type Flags = {
  mobileSheetsEnabled: boolean;
};

export function useFeatureFlags(): Flags {
  // Читаем NEXT_PUBLIC_* из process.env, доступно на клиенте
  return useMemo(() => {
    const mobileSheetsEnabled =
      (process.env.NEXT_PUBLIC_ENABLE_MOBILE_SHEETS ?? "true") === "true";
    return { mobileSheetsEnabled };
  }, []);
}
