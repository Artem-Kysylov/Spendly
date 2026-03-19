"use client";

import { Edit2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { UserAuth } from "@/context/AuthContext";
import { parseAmountInput, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useLocale, useTranslations } from "next-intl";

export interface ProposedBudget {
  name: string;
  amount: number;
  type: "expense" | "income";
  emoji: string;
  color: string | null;
  period: "monthly";
}

interface BudgetProposalCardProps {
  proposal: ProposedBudget;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function BudgetProposalCard({
  proposal,
  onSuccess,
  onError,
}: BudgetProposalCardProps) {
  const { session } = UserAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const tAssistant = useTranslations("assistant");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [dismissed, setDismissed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(proposal.name);
  const [amount, setAmount] = useState(String(proposal.amount ?? ""));

  const displayEmoji = useMemo(() => {
    const e = String(proposal.emoji || "").trim();
    return e || "💰";
  }, [proposal.emoji]);

  const handleConfirm = async () => {
    if (!userId) {
      onError?.("Missing user information");
      return;
    }

    const parsedAmount = parseAmountInput(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      onError?.("Invalid amount");
      return;
    }

    const safeName = String(name || "").trim();
    if (!safeName) {
      onError?.("Invalid name");
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      const res = await fetch("/api/budget/upsert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: safeName,
          amount: parsedAmount,
          type: proposal.type || "expense",
          emoji: displayEmoji,
          color: proposal.color ?? null,
          period: "monthly",
          locale,
        }),
      });

      if (!res.ok) {
        let errMsg = "Failed to set budget";
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const json = (await res.json().catch(() => null)) as any;
            if (json && typeof json.error === "string") errMsg = json.error;
            else if (json && typeof json.message === "string") errMsg = json.message;
          } else {
            const txt = await res.text().catch(() => "");
            if (txt) errMsg = txt;
          }
        } catch {
        }
        onError?.(errMsg);
        return;
      }

      window.dispatchEvent(new CustomEvent("budgets:updated"));
      onSuccess?.();
      setDismissed(true);

      toast({
        title: tAssistant("budgetConfirm.title"),
        description: `${displayEmoji} ${safeName}`,
        variant: "success",
      });
    } catch (_e) {
      onError?.("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (dismissed) return null;

  return (
    <Card className="border-border w-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{tAssistant("budgetConfirm.title")}</span>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tAssistant("confirm.fields.budget")}
            />
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*[.,]?\d*$/.test(v)) setAmount(v);
              }}
              placeholder={tAssistant("confirm.fields.amount")}
            />
          </>
        ) : (
          <div className={cn("text-sm", "text-foreground")}> 
            {displayEmoji} {proposal.name} — {proposal.amount}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setDismissed(true)}
          disabled={isSaving}
        >
          {tAssistant("budgetConfirm.cancel")}
        </Button>
        <Button
          className="flex-1"
          onClick={handleConfirm}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            tAssistant("budgetConfirm.confirm")
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
