import type { Opportunity } from "./model";

// Rows from the user's sheet export, used only until the Apps Script URL is configured.
const base = {
  nit: "",
  ciudad: "",
  canal: "",
  fechaCierre: "",
  categoria: "",
  proximoContacto: "",
  ultimaGestion: "",
  notas: "",
};

export const DEMO_RECORDS: Opportunity[] = [
  { ...base, id: "1", cliente: "WILLIAM FELIPE PALACIO QUINTERO", region: "CALI", asignado: "JHON ARAUJO", monto: 3000000, estado: "ACTIVO", fechaCreacion: "2026-11-06", producto: "TURF" },
  { ...base, id: "2", cliente: "STORE 615 S.A.S.", region: "CALI", asignado: "JHON ARAUJO", monto: 1500000, estado: "EN PEDIDO", fechaCreacion: "2026-03-25", producto: "INDOOR" },
  { ...base, id: "3", cliente: "DAYAN JOEL LOPEZ OROZCO", region: "SANTA MARTA", asignado: "JHON ARAUJO", monto: 800000, estado: "CLIENTE NUEVO", fechaCreacion: "2026-08-06", producto: "HG" },
  { ...base, id: "4", cliente: "INVERSIONES DOMICIANO SAS", region: "FLORENCIA", asignado: "JHON ARAUJO", monto: 2300000, estado: "PROSPECCION", fechaCreacion: "2026-08-15", producto: "VOLEIBOL" },
  { ...base, id: "5", cliente: "RAFID ALAIN ORTEGON CASTANEDA", region: "TULUA", asignado: "JHON ARAUJO", monto: 741000, estado: "CITA", fechaCreacion: "2026-11-01", producto: "PADEL" },
  { ...base, id: "6", cliente: "BRAYAM STIVEN BALANTA USCATEGUI", region: "JAMUNDI", asignado: "JHON ARAUJO", monto: 3000000, estado: "CERRADO", fechaCreacion: "2026-05-05", producto: "TENNIS" },
];
