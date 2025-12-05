import { useState, useEffect } from "react";
import { UserAuth } from "../../context/AuthContext";

// Import components
import TextInput from "../ui-elements/TextInput";
import Button from "../ui-elements/Button";
import BudgetPreset from "../ui-elements/BudgetPreset";

// Import types
import { CreateMainBudgetProps } from "../../types/types";

import CountryCombobox from "@/components/ui-elements/locale/CountryCombobox";
import CurrencyCombobox from "@/components/ui-elements/locale/CurrencyCombobox";
import { formatMoney } from "@/lib/format/money";
import { detectInitialLocale } from "@/i18n/detect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const CreateMainBudget = ({ onSubmit }: CreateMainBudgetProps) => {
  const { signOut } = UserAuth();

  const [mainBudget, setMainBudget] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // locale state
  const [country, setCountry] = useState<string>("US");
  const [currency, setCurrency] = useState<string>("USD");
  const [locale, setLocale] = useState<string>("en");

  // NEW: symbol and confirmation states
  const [currencySymbol, setCurrencySymbol] = useState<string | undefined>(
    undefined,
  );
  const [initialCurrency, setInitialCurrency] = useState<string>("USD");
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    detectInitialLocale().then((s) => {
      if (!active) return;
      setCountry(s.country);
      setCurrency(s.currency);
      setLocale(s.locale);
      // NEW: remember initially detected currency
      setInitialCurrency(s.currency);
    });
    return () => {
      active = false;
    };
  }, []);

  // NEW: load symbol for selected currency
  useEffect(() => {
    let active = true;
    fetch("/data/countries-currencies-languages.json")
      .then((r) => r.json())
      .then((data: Array<{ currency: string; symbol?: string }>) => {
        if (!active) return;
        const row = data.find((d) => d.currency === currency);
        setCurrencySymbol(row?.symbol ?? undefined);
      })
      .catch(() => setCurrencySymbol(undefined));
    return () => {
      active = false;
    };
  }, [currency]);

  const budgetPresets = [
    { value: "2000" },
    { value: "5000" },
    { value: "10000" },
    { value: "20000" },
  ];

  const handlePresetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedPreset(value);
    setMainBudget(value);
  };

  const handleSubmit = () => {
    if (mainBudget) {
      onSubmit(mainBudget, {
        country,
        currency,
        locale: locale as any,
      });
    }
  };

  const handleCancel = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-5 w-[630px]">
      <img src="/illustration-main-budget.svg" alt="main-budget" />
      <h2 className="text-[35px] font-semibold text-secondary-black">
        Let`s create your monthly budget
      </h2>
      <p className="text-secondary-black">
        Pick any convenient budget for you or type your custom value
      </p>

      {/* Locale selectors */}
      <div className="flex gap-3 w-full">
        <CountryCombobox
          value={country}
          onChange={(code) => setCountry(code)}
          className="w-full"
        />
        <CurrencyCombobox
          value={currency}
          countryCode={country}
          onChange={(code) => {
            if (code !== currency) {
              setPendingCurrency(code);
              setConfirmOpen(true);
            }
          }}
          className="w-full"
        />
      </div>

      {/* Presets formatted with currency symbol */}
      <div className="flex gap-3 w-full">
        {budgetPresets.map((preset) => (
          <BudgetPreset
            key={preset.value}
            value={preset.value}
            currentValue={selectedPreset}
            onChange={handlePresetChange}
            title={formatMoney(Number(preset.value), currency, locale)}
          />
        ))}
      </div>

      {/* Custom amount with currency symbol/code */}
      <div className="flex items-center gap-2 w-full">
        <span className="px-3 py-2 rounded-md border text-sm min-w-[64px] text-center">
          {currencySymbol ?? currency}
        </span>
        <TextInput
          value={mainBudget}
          onChange={(e) => setMainBudget(e.target.value)}
          type="text"
          placeholder={`Enter your main budget (${currency})`}
          className="flex-1"
        />
      </div>

      <div className="flex justify-center gap-3 w-full">
        <Button variant="ghost" text="Cancel" onClick={handleCancel} />
        <Button
          variant="default"
          text="Create Main Budget"
          onClick={handleSubmit}
        />
      </div>

      {/* Confirm currency change modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change currency?</DialogTitle>
            <DialogDescription>
              {initialCurrency !== currency
                ? `Current: ${currency}.`
                : `Detected: ${initialCurrency}.`}
              {pendingCurrency ? ` New: ${pendingCurrency}.` : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="px-4 py-2 rounded-md border">
              Cancel
            </DialogClose>
            <button
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
              onClick={() => {
                if (pendingCurrency) {
                  setCurrency(pendingCurrency);
                  setPendingCurrency(null);
                }
                setConfirmOpen(false);
              }}
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateMainBudget;
