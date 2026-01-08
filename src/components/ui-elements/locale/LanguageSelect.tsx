"use client";

import type { Language } from "@/types/locale";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value?: Language;
  onChange?: (lang: Language) => void;
  placeholder?: string;
  className?: string;
};

const LANGUAGES: Array<{ code: Language; label: string; emoji: string }> = [
  { code: "en", label: "English", emoji: "🇺🇸" },
  { code: "uk", label: "Українська", emoji: "🇺🇦" },
  { code: "ru", label: "Русский (СНГ)", emoji: "🇷🇺" },
  { code: "hi", label: "हिन्दी", emoji: "🇮🇳" },
  { code: "id", label: "Bahasa Indonesia", emoji: "🇮🇩" },
  { code: "ja", label: "日本語", emoji: "🇯🇵" },
  { code: "ko", label: "한국어", emoji: "🇰🇷" },
];

export default function LanguageSelect({
  value,
  onChange,
  placeholder = "Select language",
  className,
}: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange?.(v as Language)}>
      <SelectTrigger className={`bg-white text-gray-900 border-gray-300 hover:bg-gray-50 ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border-gray-200">
        {LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code} className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100">
            {l.emoji} {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
