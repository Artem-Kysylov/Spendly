"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import type { TransactionTemplate } from "@/types/types";

interface TemplatesAccordionProps {
  onEdit: (template: TransactionTemplate) => void;
  onRefresh?: () => void;
}

export default function TemplatesAccordion({
  onEdit,
  onRefresh,
}: TemplatesAccordionProps) {
  const { session } = UserAuth();
  const t = useTranslations("transactions");
  const tCommon = useTranslations("common");

  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transaction_templates")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setTemplates((data as TransactionTemplate[]) || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [session?.user?.id]);

  const handleDelete = async (id: string) => {
    if (!session?.user?.id) return;
    if (!confirm(tCommon("delete") + "?")) return;

    try {
      const { error } = await supabase
        .from("transaction_templates")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="templates" className="border rounded-xl">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <span className="font-medium">{t("templates.title")}</span>
            {templates.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                ({templates.length})
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {tCommon("loading")}...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t("templates.empty")}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{template.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.amount} • {template.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(template)}
                      className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"
                      aria-label="Edit template"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                      aria-label="Delete template"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
