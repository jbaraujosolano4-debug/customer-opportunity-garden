import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { deleteOpportunity, listOpportunities, saveOpportunity } from "./crm.functions";
import { nextNumericId, type OpportunitiesPayload, type OpportunityInput } from "./model";

export const opportunitiesQuery = queryOptions({
  queryKey: ["opportunities"],
  queryFn: () => listOpportunities(),
  // The sheet is slow, quota-limited storage: avoid refetching on every navigation.
  staleTime: 60_000,
});

export function useSaveOpportunity() {
  const qc = useQueryClient();
  const save = useServerFn(saveOpportunity);
  return useMutation({
    mutationFn: (record: OpportunityInput) => save({ data: record }),
    onSuccess: (res) => {
      qc.setQueryData<OpportunitiesPayload>(opportunitiesQuery.queryKey, (old) => {
        if (!old) return old;
        const record = { ...res.record };
        if (!record.id) record.id = nextNumericId(old.records);
        const exists = old.records.some((r) => r.id === record.id);
        const records = exists
          ? old.records.map((r) => (r.id === record.id ? record : r))
          : [...old.records, record];
        return { ...old, records };
      });
      if (res.mode === "live") void qc.invalidateQueries({ queryKey: opportunitiesQuery.queryKey });
    },
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  const remove = useServerFn(deleteOpportunity);
  return useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: (res) => {
      qc.setQueryData<OpportunitiesPayload>(opportunitiesQuery.queryKey, (old) =>
        old ? { ...old, records: old.records.filter((r) => r.id !== res.id) } : old,
      );
      if (res.mode === "live") void qc.invalidateQueries({ queryKey: opportunitiesQuery.queryKey });
    },
  });
}
