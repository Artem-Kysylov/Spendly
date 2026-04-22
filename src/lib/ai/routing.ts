// Эвристики сложности и выбор модели

import type { Model } from "@/types/ai";

export const isComplexRequest = (text: string): boolean => {
  const lower = text.toLowerCase();
  // Deep-analysis intents: monthly summaries, financial advice, multi-step
  // planning, comparisons, forecasting — all routed to GPT-4-Turbo.
  const hasKeywords =
    /(save|analyze|forecast|plan|budget\s*plan|monthly\s+summary|summary|summarize|report|insight|advice|advise|compare|trend|deep|explain\s+why)/.test(
      lower,
    );
  const isLong = text.length > 100;
  return hasKeywords || isLong;
};

export const selectModel = (isPro?: boolean, isComplex?: boolean): Model => {
  if (isPro && isComplex) return "gpt-4-turbo";
  return "gemini-2.5-flash";
};
