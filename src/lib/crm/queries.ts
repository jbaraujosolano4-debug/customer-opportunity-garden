import { useMemo } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/components/crm/auth-context";
import { deleteOpportunity, listOpportunities, saveOpportunity } from "./crm.functions";
import { nextNumericId, type OpportunitiesPayload, type Opportunity, type OpportunityInput } from "./model";

export const opportunitiesQuery = queryOptions({
  queryKey: ["opportunities"],
  queryFn: () => listOpportunities(),
  // The sheet is slow, quota-limited storage: avoid refetching on every navigation.
  staleTime: 60_000,
});

/**
 * Hook centralizado que aplica la separación de datos por perfil:
 * - ADMIN: ve los valores consolidados (todas las oportunidades de la empresa).
 * - ASESOR / Perfil creado: solo ve sus propias oportunidades (donde asignado coincide con su nombre o email).
 *   Si es un perfil nuevo sin datos, todos los valores inician en 0.
 */
export function useFilteredOpportunities(filterAdvisor?: string) {
  const { data } = useSuspenseQuery(opportunitiesQuery);
  const { user, isAdmin } = useAuth();

  const records = useMemo(() => {
    if (!user) return [];

    // Si es administrador
    if (isAdmin) {
      if (filterAdvisor && filterAdvisor !== "__all") {
        const target = filterAdvisor.trim().toLowerCase();
        return data.records.filter((r) => (r.asignado || "").trim().toLowerCase() === target);
      }
      return data.records;
    }

    // Si es un perfil normal (Asesor creado)
    const name = (user.nombre || "").trim().toLowerCase();
    const email = (user.email || "").trim().toLowerCase();

    return data.records.filter((r) => {
      const assigned = (r.asignado || "").trim().toLowerCase();
      return (
        (assigned.length > 0 && assigned === name) ||
        (assigned.length > 0 && assigned === email) ||
        // Si el nombre coincide parcialmente (ej. Juan Pérez vs Juan)
        (name.length > 2 && assigned.includes(name))
      );
    });
  }, [data.records, user, isAdmin, filterAdvisor]);

  return {
    ...data,
    records,
    allRecords: data.records,
    user,
    isAdmin,
  };
}

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
