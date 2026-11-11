import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { OpportunityDialog } from "./OpportunityDialog";
import { opportunitiesQuery } from "@/lib/crm/queries";
import type { Opportunity, OpportunityInput } from "@/lib/crm/model";

type Ctx = {
  openNew: (preset?: Partial<OpportunityInput>) => void;
  openEdit: (record: Opportunity, overrides?: Partial<OpportunityInput>) => void;
};

const CrmDialogContext = createContext<Ctx | null>(null);

export function CrmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    record: Opportunity | null;
    preset?: Partial<OpportunityInput> | undefined;
    key: number;
  }>({ open: false, record: null, key: 0 });
  const { data } = useQuery(opportunitiesQuery);

  const openNew = useCallback((preset?: Partial<OpportunityInput>) => {
    setState((s) => ({ open: true, record: null, preset, key: s.key + 1 }));
  }, []);
  const openEdit = useCallback((record: Opportunity, overrides?: Partial<OpportunityInput>) => {
    setState((s) => ({ open: true, record, preset: overrides, key: s.key + 1 }));
  }, []);

  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);

  return (
    <CrmDialogContext.Provider value={value}>
      {children}
      <OpportunityDialog
        key={state.key}
        open={state.open}
        onOpenChange={(open: boolean) => setState((s) => ({ ...s, open }))}
        record={state.record}
        preset={state.preset}
        records={data?.records ?? []}
      />
    </CrmDialogContext.Provider>
  );
}

export function useCrmDialog() {
  const ctx = useContext(CrmDialogContext);
  if (!ctx) throw new Error("useCrmDialog must be used inside CrmDialogProvider");
  return ctx;
}
