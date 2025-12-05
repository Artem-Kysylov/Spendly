"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatGroupHeader } from "@/lib/format/transactionsGrouping";

type Props = { date: string; topOffsetClass?: string };

export default function DateHeader({ date, topOffsetClass = "top-0" }: Props) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const label = formatGroupHeader(date, locale, tCommon);

  return (
    <div
      className={`sticky ${topOffsetClass} z-10 bg-background/95 backdrop-blur py-2 px-4 font-bold text-sm text-muted-foreground`}
    >
      {label}
    </div>
  );
}
