// Helpers para integración y automatización de alertas por WhatsApp
import { formatCOP, pretty, stageInfo, type Opportunity } from "./model";
import type { CrmUser } from "./auth-model";

export const DEFAULT_ADMIN_PHONE = "+57 3507056186";

/**
 * Limpia el número de teléfono para el formato internacional de WhatsApp (sin +, espacios ni guiones).
 * Si es un número colombiano de 10 dígitos (ej. 3507056186), le antepone el código de país 57.
 */
export function cleanWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  // Si tiene 10 dígitos y empieza por 3 (número móvil en Colombia), agregar código 57
  if (digits.length === 10 && digits.startsWith("3")) {
    digits = "57" + digits;
  }
  return digits;
}

/**
 * Genera el enlace directo a WhatsApp Web / Móvil con el mensaje codificado.
 */
export function createWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = cleanWhatsAppNumber(phone);
  const encoded = encodeURIComponent(message);
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/**
 * Construye el mensaje de alerta para un asesor con sus clientes agendados para hoy.
 */
export function buildAdvisorAlertMessage(
  advisorName: string,
  records: Opportunity[],
  dateStr: string,
): string {
  const count = records.length;
  const header = [
    `🚨 *RECORDATORIO DE SEGUIMIENTO CRM*`,
    `Hola *${advisorName || "Asesor"}*, tienes *${count}* ${count === 1 ? "cliente programado" : "clientes programados"} para contactar hoy (${dateStr}):`,
    ``,
  ];

  const body = records.map((r, idx) => {
    const lines = [
      `*${idx + 1}. ${r.cliente}*`,
      `   💰 *Valor:* ${formatCOP(r.monto)}${r.pares > 0 ? ` · ${r.pares.toLocaleString("es-CO")} pares` : ""}`,
      `   📌 *Etapa:* ${stageInfo(r.estado).label}`,
    ];
    if (r.categoria || r.producto) {
      lines.push(`   🏷️ *Ref:* ${[pretty(r.categoria), pretty(r.producto)].filter(Boolean).join(" · ")}`);
    }
    if (r.ciudad || r.region) {
      lines.push(`   📍 *Ubicación:* ${[pretty(r.ciudad), pretty(r.region)].filter(Boolean).join(", ")}`);
    }
    if (r.notas) {
      lines.push(`   📝 *Notas:* ${r.notas}`);
    }
    return lines.join("\n");
  });

  const footer = [
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `_CRM Comercial · Customer Opportunity Garden_`,
    `Por favor actualiza la gestión y el próximo contacto en el CRM al finalizar.`,
  ];

  return [...header, body.join("\n\n"), ...footer].join("\n");
}

/**
 * Construye el consolidado diario de seguimientos para el Administrador (+57 3507056186).
 */
export function buildAdminConsolidatedMessage(
  advisorGroups: { advisor: CrmUser | { nombre: string; telefono?: string }; records: Opportunity[] }[],
  totalRecords: number,
  dateStr: string,
): string {
  const header = [
    `🏢 *CONSOLIDADO DIARIO DE SEGUIMIENTOS CRM*`,
    `📅 *Fecha:* ${dateStr}`,
    `📊 *Total oportunidades agendadas para hoy:* ${totalRecords}`,
    ``,
    `Resumen por asesor comercial:`,
    `━━━━━━━━━━━━━━━━━━━━`,
  ];

  const body = advisorGroups.map(({ advisor, records }) => {
    const totalMonto = records.reduce((s, r) => s + r.monto, 0);
    const totalPares = records.reduce((s, r) => s + (r.pares || 0), 0);
    const phone = advisor.telefono ? ` (📲 ${advisor.telefono})` : " (⚠️ Sin WhatsApp)";
    const items = records.map((r) => `  • *${r.cliente}* - ${formatCOP(r.monto)} [${stageInfo(r.estado).label}]`).join("\n");

    return [
      `👤 *${advisor.nombre}*${phone}`,
      `   Total: ${records.length} clientes · ${formatCOP(totalMonto)}${totalPares > 0 ? ` · ${totalPares} pares` : ""}`,
      items,
    ].join("\n");
  });

  const footer = [
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `_CRM Comercial - Panel Administrativo_`,
  ];

  return [...header, body.join("\n\n"), ...footer].join("\n");
}

/**
 * Mensaje rápido para contactar directamente al cliente.
 */
export function buildClientFollowUpMessage(record: Opportunity, advisorName: string): string {
  return [
    `Hola estimado(a) *${record.cliente}*,`,
    ``,
    `Te saluda *${advisorName || "tu asesor comercial"}* de JOMA.`,
    `Me pongo en contacto contigo para dar seguimiento a nuestra conversación sobre *${record.producto || record.categoria || "tu pedido"}*.`,
    ``,
    `¿Cómo te ha ido? ¿En qué momento tendrías unos minutos para conversar?`,
    ``,
    `¡Quedo atento a tus comentarios!`,
  ].join("\n");
}

/**
 * Mensaje de recordatorio individual de un cliente para enviar por WhatsApp.
 */
export function buildSingleClientAlertMessage(r: Opportunity, todayStr: string): string {
  return [
    `🚨 *RECORDATORIO DE SEGUIMIENTO CRM*`,
    `Cliente programado para contactar (${r.proximoContacto || todayStr}):`,
    ``,
    `🏢 *Cliente:* ${r.cliente}`,
    `💰 *Monto:* ${formatCOP(r.monto)}${r.pares > 0 ? ` · ${r.pares.toLocaleString("es-CO")} pares` : ""}`,
    `📌 *Etapa:* ${stageInfo(r.estado).label}`,
    r.asignado ? `👤 *Asesor asignado:* ${pretty(r.asignado)}` : "",
    r.categoria || r.producto ? `🏷️ *Ref:* ${[pretty(r.categoria), pretty(r.producto)].filter(Boolean).join(" · ")}` : "",
    r.ciudad || r.region ? `📍 *Ubicación:* ${[pretty(r.ciudad), pretty(r.region)].filter(Boolean).join(", ")}` : "",
    r.notas ? `📝 *Notas:* ${r.notas}` : "",
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `_CRM Comercial · Customer Opportunity Garden_`,
  ].filter(Boolean).join("\n");
}
