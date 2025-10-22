 ### Как лучше реализовать
#### Шаг 1: Добавь в экран бюджета (BudgetSetup.tsx)
- Дроплист страны: Используй готовый список (например, react-country-region-selector или статический массив).
- Дроплист валюты: Связь с страной (например, US → USD, UA → UAH) или независимо (ISO 4217 список).
- Дефолт: Автодетект по браузеру (navigator.language для locale, GeoIP для страны/валюты).
- Хранение: В Supabase `users`: `country text`, `currency text` (update при сохранении бюджета).

Пример кода:
```tsx
// app/components/BudgetSetup.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const presets = [3000, 5000, 8000];

export default function BudgetSetup({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [value, setValue] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const t = useTranslations("BudgetSetup");

  useEffect(() => {
    // Автодетект (пример, используй API ipinfo.io для страны)
    fetch("https://ipinfo.io/json")
      .then(res => res.json())
      .then(data => {
        setCountry(data.country || "US");
        setCurrency(data.country === "UA" ? "UAH" : "USD"); // Простая логика
      });
  }, []);

  const save = async (amount: number) => {
    await supabase
      .from("users")
      .update({ monthly_budget: amount, country, currency })
      .eq("id", user!.id);
    onSaved();
  };

  return (
    <Card className="max-w-md mx-auto p-6 mt-12">
      <h2 className="text-2xl font-bold mb-4">{t("title")}</h2>
      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger>
          <SelectValue placeholder={t("country")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="US">United States</SelectItem>
          <SelectItem value="UA">Ukraine</SelectItem>
          {/* Добавь другие страны */}
        </SelectContent>
      </Select>
      <Select value={currency} onValueChange={setCurrency}>
        <SelectTrigger>
          <SelectValue placeholder={t("currency")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="USD">USD ($)</SelectItem>
          <SelectItem value="UAH">UAH (₴)</SelectItem>
          {/* Добавь другие валюты */}
        </SelectContent>
      </Select>
      <div className="flex gap-2 mb-4 mt-4">
        {presets.map(p => (
          <Button
            key={p}
            variant="outline"
            onClick={() => save(p)}
          >
            {currency} {p}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={t("customAmount")}
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <Button
          onClick={() => save(Number(value))}
          disabled={!value || isNaN(+value)}
        >
          {t("save")}
        </Button>
      </div>
    </Card>
  );
}
```

#### Шаг 2: Изменение в настройках
- Разместите язык (locale) в разделе "Appearance" или "Preferences" (Select с en/ru/es).
- Код:
  ```tsx
  // app/settings/page.tsx (фрагмент)
  <div className="flex items-center justify-between">
    <Label>{t("language")}</Label>
    <Select value={settings.locale} onValueChange={(val) => setSettings({ ...settings, locale: val })}>
      <SelectTrigger>
        <SelectValue placeholder={t("selectLanguage")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="ru">Русский</SelectItem>
      </SelectContent>
    </Select>
  </div>
  ```
- Сохраняй в Supabase `users.locale` и редиректи по нему (middleware.ts).

#### Шаг 3: Автодетект
- Используй IP-API для страны/валюты (бесплатно до 45k запросов/мес):
  ```tsx
  // BudgetSetup.tsx (useEffect)
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        setCountry(data.country_code || "US");
        setCurrency(data.currency || "USD");
      });
  }, []);






### Полный план: Дроплисты + Автодетект + Фолбек

| Элемент | Что делаем | Как |
|--------|-----------|-----|
| **Автодетект по IP** | При загрузке экрана бюджета | `ipapi.co/json/` → `country_code`, `currency` |
| **Дефолтные значения** | Заполняем дроплисты | `country = US`, `currency = USD` |
| **Фолбек** | Если API не отвечает или ошибка | `US + USD + en` |
| **Пользователь может изменить** | В любой момент | Ручной выбор в дроплистах |
| **Сохранение** | В Supabase при нажатии "Save" | `country`, `currency`, `locale` |

---

### Реализация (Next.js + Shadcn + Supabase)

```tsx
// app/components/BudgetSetup.tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";

const presets = [3000, 5000, 8000];

const countries = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "UA", name: "Ukraine", currency: "UAH" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  // добавь ещё по мере роста
];

export default function BudgetSetup({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const t = useTranslations("BudgetSetup");

  const [country, setCountry] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [customAmount, setCustomAmount] = useState("");

  // Автодетект по IP
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        if (data.country_code && data.currency) {
          setCountry(data.country_code);
          setCurrency(data.currency);
        }
      } catch (err) {
        console.warn("IP detection failed, using fallback", err);
        // Фолбек: US + USD
      }
    };

    detectLocation();
  }, []);

  const save = async (amount: number) => {
    await supabase
      .from("users")
      .update({
        country,
        currency,
        locale: country === "UA" ? "ru" : "en", // простой маппинг
        monthly_budget: amount,
      })
      .eq("id", user!.id);

    onSaved();
  };

  return (
    <Card className="max-w-md mx-auto p-6 mt-12">
      <h2 className="text-2xl font-bold mb-4">{t("title")}</h2>

      {/* Дроплист: Страна */}
      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger className="mb-3">
          <SelectValue placeholder={t("selectCountry")} />
        </SelectTrigger>
        <SelectContent>
          {countries.map(c => (
            <SelectItem key={c.code} value={c.code}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Дроплист: Валюта */}
      <Select value={currency} onValueChange={setCurrency}>
        <SelectTrigger className="mb-4">
          <SelectValue placeholder={t("selectCurrency")} />
        </SelectTrigger>
        <SelectContent>
          {[...new Set(countries.map(c => c.currency))].map(curr => (
            <SelectItem key={curr} value={curr}>
              {curr}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Пресеты */}
      <div className="flex gap-2 mb-4">
        {presets.map(p => (
          <Button key={p} variant="outline" onClick={() => save(p)}>
            {currency} {p}
          </Button>
        ))}
      </div>

      {/* Кастом */}
      <div className="flex gap-2">
        <Input
          placeholder={t("customAmount")}
          value={customAmount}
          onChange={e => setCustomAmount(e.target.value)}
        />
        <Button
          onClick={() => save(Number(customAmount))}
          disabled={!customAmount || isNaN(+customAmount)}
        >
          {t("save")}
        </Button>
      </div>
    </Card>
  );
}
```

---

### Локализация (messages/en.json + ru.json)

```json
// messages/en.json
{
  "BudgetSetup": {
    "title": "Set your monthly budget",
    "selectCountry": "Select your country",
    "selectCurrency": "Select your currency",
    "customAmount": "Custom amount",
    "save": "Save"
  }
}
```

```json
// messages/ru.json
{
  "BudgetSetup": {
    "title": "Задайте месячный бюджет",
    "selectCountry": "Выберите страну",
    "selectCurrency": "Выберите валюту",
    "customAmount": "Своя сумма",
    "save": "Сохранить"
  }
}
```

---

### Middleware: Авто-редирект по языку

```ts
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = request.cookies.get("NEXT_LOCALE")?.value || "en";

  if (!pathname.startsWith(`/${locale}`) && pathname !== "/") {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};



## Обновлённый набор для MVP: **5 языков + 10 стран + 10 валют**

| Язык | Страны | Валюты | Причина |
|------|--------|--------|--------|
| `en` | US, GB, CA | USD, GBP, CAD | Глобальный рынок |
| `uk` | UA | UAH | Украина — целевая |
| `ru` | — (в настройках) | — | Универсальный для СНГ |
| `hi` | IN | INR | Индия — 1.4 млрд, рост |
| `id` | ID | IDR | Индонезия — 270 млн |
| `ja` | JP | JPY | Япония — высокий ARPU |
| `ko` | KR | KRW | Южная Корея — tech-savvy |

---

## Готовый JSON: `countries-currencies-languages.json`

```json
[
  {
    "code": "US",
    "name": "United States",
    "language": "en",
    "currency": "USD",
    "symbol": "$",
    "default": true
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "language": "uk",
    "currency": "UAH",
    "symbol": "₴",
    "default": true
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "language": "en",
    "currency": "GBP",
    "symbol": "£"
  },
  {
    "code": "CA",
    "name": "Canada",
    "language": "en",
    "currency": "CAD",
    "symbol": "$"
  },
  {
    "code": "IN",
    "name": "India",
    "language": "hi",
    "currency": "INR",
    "symbol": "₹"
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "language": "id",
    "currency": "IDR",
    "symbol": "Rp"
  },
  {
    "code": "JP",
    "name": "Japan",
    "language": "ja",
    "currency": "JPY",
    "symbol": "¥"
  },
  {
    "code": "KR",
    "name": "South Korea",
    "language": "ko",
    "currency": "KRW",
    "symbol": "₩"
  },
  {
    "code": "DE",
    "name": "Germany",
    "language": "en",
    "currency": "EUR",
    "symbol": "€"
  },
  {
    "code": "ES",
    "name": "Spain",
    "language": "es",
    "currency": "EUR",
    "symbol": "€"
  }
]
```

> Сохрани в `public/data/countries-currencies-languages.json`



## Настройки пользователя: **язык можно менять**

```tsx
// settings/page.tsx
<Select value={settings.language} onValueChange={setLanguage}>
  <SelectTrigger>
    <SelectValue placeholder="Language" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="en">English</SelectItem>
    <SelectItem value="uk">Українська</SelectItem>
    <SelectItem value="ru">Русский (СНГ)</SelectItem>
    <SelectItem value="hi">हिन्दी</SelectItem>
    <SelectItem value="id">Bahasa Indonesia</SelectItem>
    <SelectItem value="ja">日本語</SelectItem>
    <SelectItem value="ko">한국어</SelectItem>
    <SelectItem value="es">Español</SelectItem>
  </SelectContent>
</Select>
```

> Сохраняй в `users.language`, используй в `next-intl`



## Локализация: `messages/*.json`

```json
// messages/uk.json
{
  "BudgetSetup": {
    "title": "Встановіть місячний бюджет",
    "selectCountry": "Ваша країна",
    "selectCurrency": "Валюта"
  }
}
```

```json
// messages/ru.json
{
  "BudgetSetup": {
    "title": "Установите месячный бюджет",
    "selectCountry": "Ваша страна",
    "selectCurrency": "Валюта"
  }
}
```

```json
// messages/hi.json
{
  "BudgetSetup": {
    "title": "मासिक बजट सेट करें",
    "selectCountry": "आपका देश",
    "selectCurrency": "मुद्रा"
  }
}
```
