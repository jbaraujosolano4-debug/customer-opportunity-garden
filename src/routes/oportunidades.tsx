import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Download, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataNotice } from "@/components/crm/DataNotice";
import { FollowUpChip } from "@/components/crm/FollowUpChip";
import { PageHeader } from "@/components/crm/PageHeader";
import { StageBadge } from "@/components/crm/StageBadge";
import { useCrmDialog } from "@/components/crm/crm-dialog-context";
import {
  formatCOP,
  formatDate,
  normalizeKey,
  pretty,
  stageInfo,
  stagesFor,
  todayISO,
  uniqueValues,
  type Opportunity,
} from "@/lib/crm/model";
import { opportunitiesQuery } from "@/lib/crm/queries";

export const Route = createFileRoute("/oportunidades")({
  head: () => ({
    meta: [
      { title: "Oportunidades | CRM Comercial" },
      { name: "description", content: "Lista de clientes y oportunidades comerciales con búsqueda y filtros por etapa, asesor y región." },
      { property: "og:title", content: "Oportunidades | CRM Comercial" },
      { property: "og:description", content: "Lista de clientes y oportunidades comerciales con búsqueda y filtros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: OpportunitiesPage,
});

const ALL = "__all";
type SortKey = "id" | "cliente" | "monto" | "fechaCreacion" | "proximoContacto";

function OpportunitiesPage() {
  const { data } = useSuspenseQuery(opportunitiesQuery);
  const { openNew, openEdit } = useCrmDialog();
  const records = data.records;
  const today = todayISO();

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState(ALL);
  const [asesor, setAsesor] = useState(ALL);
  const [region, setRegion] = useState(ALL);
  const [categoria, setCategoria] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("id");

  const stages = stagesFor(records);
  const asesores = uniqueValues(records, "asignado");
  const regiones = uniqueValues(records, "region");
  const categorias = uniqueValues(records, "categoria");

  const filtered = useMemo(() => {
    const needle = normalizeKey(q);
    const eq = (a: string, b: string) => b === ALL || normalizeKey(a) === normalizeKey(b);
    const list = records.filter((r) => {
      if (estado !== ALL && stageInfo(r.estado).value !== estado) return false;
      if (!eq(r.asignado, asesor) || !eq(r.region, region) || !eq(r.categoria, categoria)) return false;
      if (!needle) return true;
      return normalizeKey(
        [r.id, r.cliente, r.nit, r.ciudad, r.region, r.producto, r.categoria, r.canal, r.notas].join(" "),
      ).includes(needle);
    });
    const dir = sort === "monto" || sort === "fechaCreacion" ? -1 : 1;
    return [...list].sort((a, b) => {
      if (sort === "id") return (Number(a.id) || 0) - (Number(b.id) || 0);
      if (sort === "monto") return dir * (a.monto - b.monto);
      if (sort === "proximoContacto") {
        if (!a.proximoContacto) return 1;
        if (!b.proximoContacto) return -1;
      }
      return dir * String(a[sort]).localeCompare(String(b[sort]), "es");
    });
  }, [records, q, estado, asesor, region, categoria, sort]);

  const total = filtered.reduce((s, r) => s + r.monto, 0);
  const hasFilters = q || estado !== ALL || asesor !== ALL || region !== ALL || categoria !== ALL;
  const clear = () => {
    setQ("");
    setEstado(ALL);
    setAsesor(ALL);
    setRegion(ALL);
    setCategoria(ALL);
  };

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="Oportunidades"
        subtitle={`${filtered.length} de ${records.length} · ${formatCOP(total)}`}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9" onClick={() => downloadCsv(filtered)}>
              <Download /> Exportar
            </Button>
            <Button size="sm" className="h-9" onClick={() => openNew()}>
              <Plus /> Agregar
            </Button>
          </>
        }
      />
      <DataNotice data={data} />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, NIT, ciudad, producto…"
            className="h-10 border-transparent bg-surface pl-9 shadow-none focus-visible:bg-card"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:flex">
          <Filter value={estado} onChange={setEstado} placeholder="Estado" options={stages.map((s) => ({ value: s.value, label: s.label }))} />
          <Filter value={asesor} onChange={setAsesor} placeholder="Asesor" options={asesores.map((v) => ({ value: v, label: pretty(v) }))} />
          <Filter value={region} onChange={setRegion} placeholder="Región" options={regiones.map((v) => ({ value: v, label: pretty(v) }))} />
          <Filter value={categoria} onChange={setCategoria} placeholder="Categoría" options={categorias.map((v) => ({ value: v, label: pretty(v) }))} />
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">Orden: ID</SelectItem>
              <SelectItem value="cliente">Orden: Cliente</SelectItem>
              <SelectItem value="monto">Orden: Monto</SelectItem>
              <SelectItem value="fechaCreacion">Orden: Más recientes</SelectItem>
              <SelectItem value="proximoContacto">Orden: Próximo contacto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-10 text-muted-foreground">
            <X /> Limpiar
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <p className="font-semibold">No hay oportunidades que coincidan</p>
          <p className="mt-1 text-sm text-muted-foreground">Prueba con otros filtros o agrega una nueva.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-surface/60 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3">Asesor</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Seguimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r) => (
                    <tr key={r.id} onClick={() => openEdit(r)} className="cursor-pointer transition-colors hover:bg-secondary/50">
                      <td className="tabular px-4 py-3.5 text-muted-foreground">{r.id}</td>
                      <td className="max-w-64 px-4 py-3.5">
                        <p className="truncate font-semibold">{r.cliente}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[r.nit && `NIT ${r.nit}`, pretty(r.canal)].filter(Boolean).join(" · ") || formatDate(r.fechaCreacion)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p>{pretty(r.ciudad) || pretty(r.region) || "—"}</p>
                        {r.ciudad && r.region && <p className="text-xs text-muted-foreground">{pretty(r.region)}</p>}
                      </td>
                      <td className="px-4 py-3.5">{pretty(r.asignado) || "—"}</td>
                      <td className="px-4 py-3.5">
                        <p>{pretty(r.producto) || "—"}</p>
                        {r.categoria && <p className="text-xs text-muted-foreground">{pretty(r.categoria)}</p>}
                      </td>
                      <td className="tabular px-4 py-3.5 text-right font-semibold">{formatCOP(r.monto)}</td>
                      <td className="px-4 py-3.5">
                        <StageBadge estado={r.estado} />
                      </td>
                      <td className="px-4 py-3.5">
                        <FollowUpChip date={r.proximoContacto} today={today} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2.5 md:hidden">
            {filtered.map((r) => (
              <li key={r.id}>
                <button onClick={() => openEdit(r)} className="w-full rounded-2xl border bg-card p-4 text-left shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.cliente}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        #{r.id} · {[pretty(r.ciudad || r.region), pretty(r.producto)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <StageBadge estado={r.estado} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="tabular text-base font-bold">{formatCOP(r.monto)}</span>
                    <FollowUpChip date={r.proximoContacto} today={today} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Filter({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 lg:w-36">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}: todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function downloadCsv(rows: Opportunity[]) {
  const headers = ["ID", "Cliente", "NIT", "Región", "Ciudad", "Canal", "Asignado a", "Monto", "Estado", "Fecha de creación", "Fecha de cierre", "Categoría", "Producto", "Próximo contacto", "Última gestión", "Notas"];
  const keys: (keyof Opportunity)[] = ["id", "cliente", "nit", "region", "ciudad", "canal", "asignado", "monto", "estado", "fechaCreacion", "fechaCierre", "categoria", "producto", "proximoContacto", "ultimaGestion", "notas"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `oportunidades-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
