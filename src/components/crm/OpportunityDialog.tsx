import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CATEGORIES,
  emptyOpportunity,
  formatCOP,
  stagesFor,
  todayISO,
  uniqueValues,
  type Opportunity,
  type OpportunityInput,
} from "@/lib/crm/model";
import { useDeleteOpportunity, useSaveOpportunity } from "@/lib/crm/queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: Opportunity | null;
  preset?: Partial<OpportunityInput> | undefined;
  records: Opportunity[];
};

export function OpportunityDialog({ open, onOpenChange, record, preset, records }: Props) {
  const [form, setForm] = useState<OpportunityInput>(() => ({
    ...(record ?? emptyOpportunity(todayISO())),
    ...preset,
  }));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveOpportunity();
  const remove = useDeleteOpportunity();

  const suggestions = useMemo(
    () => ({
      region: uniqueValues(records, "region"),
      ciudad: uniqueValues(records, "ciudad"),
      canal: uniqueValues(records, "canal"),
      asignado: uniqueValues(records, "asignado"),
      categoria: uniqueValues(records, "categoria", DEFAULT_CATEGORIES),
      producto: uniqueValues(records, "producto"),
    }),
    [records],
  );
  const stages = useMemo(() => {
    const list = stagesFor(records);
    if (form.estado && !list.some((s) => s.value === form.estado)) {
      list.push({ value: form.estado, label: form.estado, tone: "neutral" });
    }
    return list;
  }, [records, form.estado]);

  const set = <K extends keyof OpportunityInput>(key: K, value: OpportunityInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.cliente.trim()) {
      toast.error("Escribe el nombre del cliente.");
      return;
    }
    try {
      const res = await save.mutateAsync({ ...form, cliente: form.cliente.trim() });
      toast.success(record ? "Oportunidad actualizada" : "Oportunidad creada", {
        description: res.mode === "demo" ? "Modo demostración: no se guardó en la hoja." : undefined,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error("No se pudo guardar", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const onDelete = async () => {
    if (!record) return;
    try {
      await remove.mutateAsync(record.id);
      toast.success("Oportunidad eliminada");
      onOpenChange(false);
    } catch (err) {
      toast.error("No se pudo eliminar", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {record ? `Oportunidad #${record.id}` : "Nueva oportunidad"}
          </DialogTitle>
          <DialogDescription>
            {record ? "Actualiza la información y se guardará en tu hoja." : "Registra un nuevo cliente u oportunidad comercial."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <Section title="Cliente">
            <Field label="Cliente *" className="sm:col-span-2">
              <Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nombre o razón social" autoFocus />
            </Field>
            <Field label="NIT">
              <Input value={form.nit} onChange={(e) => set("nit", e.target.value)} placeholder="900.123.456-7" />
            </Field>
            <Field label="Canal">
              <SuggestInput id="canal" value={form.canal} onChange={(v) => set("canal", v)} options={suggestions.canal} placeholder="Tipo de cliente" />
            </Field>
            <Field label="Región">
              <SuggestInput id="region" value={form.region} onChange={(v) => set("region", v)} options={suggestions.region} placeholder="Zona comercial" />
            </Field>
            <Field label="Ciudad">
              <SuggestInput id="ciudad" value={form.ciudad} onChange={(v) => set("ciudad", v)} options={suggestions.ciudad} />
            </Field>
          </Section>

          <Section title="Oportunidad">
            <Field label="Estado">
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Etapa comercial" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Asignado a">
              <SuggestInput id="asignado" value={form.asignado} onChange={(v) => set("asignado", v)} options={suggestions.asignado} placeholder="Asesor responsable" />
            </Field>
            <Field label="Monto (COP)" hint={form.monto ? formatCOP(form.monto) : undefined}>
              <Input
                type="number"
                min={0}
                step={1000}
                inputMode="numeric"
                value={form.monto || ""}
                onChange={(e) => set("monto", Number(e.target.value) || 0)}
                placeholder="0"
              />
            </Field>
            <Field label="Categoría">
              <SuggestInput id="categoria" value={form.categoria} onChange={(v) => set("categoria", v)} options={suggestions.categoria} placeholder="Soccer, Running, Pádel…" />
            </Field>
            <Field label="Producto" className="sm:col-span-2">
              <SuggestInput id="producto" value={form.producto} onChange={(v) => set("producto", v)} options={suggestions.producto} placeholder="Referencia o modelo" />
            </Field>
          </Section>

          <Section title="Fechas y seguimiento">
            <Field label="Fecha de creación">
              <Input type="date" value={form.fechaCreacion} onChange={(e) => set("fechaCreacion", e.target.value)} />
            </Field>
            <Field label="Fecha de cierre">
              <Input type="date" value={form.fechaCierre} onChange={(e) => set("fechaCierre", e.target.value)} />
            </Field>
            <Field label="Última gestión">
              <Input type="date" value={form.ultimaGestion} onChange={(e) => set("ultimaGestion", e.target.value)} />
            </Field>
            <Field label="Próximo contacto">
              <Input type="date" value={form.proximoContacto} onChange={(e) => set("proximoContacto", e.target.value)} />
            </Field>
            <Field label="Notas" className="sm:col-span-2">
              <Textarea rows={3} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Observaciones comerciales" />
            </Field>
          </Section>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {record ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">¿Eliminar de la hoja?</span>
                  <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
                    {remove.isPending && <Loader2 className="animate-spin" />}Sí, eliminar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    No
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Eliminar
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {save.isPending && <Loader2 className="animate-spin" />}
                {record ? "Guardar cambios" : "Crear oportunidad"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string | undefined; className?: string | undefined; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <span className="tabular text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SuggestInput({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string | undefined;
}) {
  const listId = `crm-suggest-${id}`;
  return (
    <>
      <Input list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
