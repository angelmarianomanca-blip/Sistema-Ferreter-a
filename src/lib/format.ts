import { ARGENTINA_TZ } from "./constants";

/**
 * Formatea centavos enteros como moneda argentina: `$ 12.345,50`.
 * Regla 10: importes exactos en centavos, nunca coma flotante.
 */
export function formatMoneda(centavos: number): string {
  const signo = centavos < 0 ? "-" : "";
  const abs = Math.abs(Math.round(centavos));
  const enteros = Math.floor(abs / 100);
  const decimales = String(abs % 100).padStart(2, "0");
  const miles = enteros.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${signo}$ ${miles},${decimales}`;
}

/**
 * Formato compacto para ejes y resúmenes de gráficos: `$ 200 mil` o `$ 1,2 M`.
 */
export function formatMonedaCompacta(centavos: number): string {
  const pesos = Math.round(centavos) / 100;
  if (pesos === 0) return "$ 0";
  if (Math.abs(pesos) >= 1_000_000) {
    const millones = (pesos / 1_000_000).toFixed(1).replace(".", ",");
    return `$ ${millones} M`;
  }
  if (Math.abs(pesos) >= 1_000) {
    const miles = Math.round(pesos / 1_000);
    return `$ ${miles.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} mil`;
  }
  return `$ ${Math.round(pesos)}`;
}

/**
 * Convierte un texto ingresado por el usuario (ej: "12.500,50", "12500.5", "12500")
 * a centavos enteros, o null si no es válido.
 */
export function parseMonedaToCentavos(raw: string): number | null {
  const cleaned = raw.replace(/\$/g, "").replace(/\s+/g, "").trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    // Formato argentino típico: 12.345,50
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  } else if (hasDot) {
    // Si hay múltiples puntos o exactamente 3 dígitos después del punto, asumir separador de miles
    const parts = cleaned.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      normalized = cleaned.replace(/\./g, "");
    }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [intPart, decPart = ""] = normalized.split(".");
  const pesos = Number.parseInt(intPart, 10);
  const centavos = Number.parseInt(decPart.padEnd(2, "0"), 10);
  if (!Number.isSafeInteger(pesos) || !Number.isSafeInteger(centavos)) {
    return null;
  }
  return pesos * 100 + centavos;
}

/**
 * Convierte centavos a texto editable sin símbolo `$` (ej: "12500,00" o "12.500,00").
 */
export function centavosToInput(centavos: number): string {
  const abs = Math.abs(Math.round(centavos));
  const enteros = Math.floor(abs / 100);
  const decimales = String(abs % 100).padStart(2, "0");
  const miles = enteros.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${miles},${decimales}`;
}

/**
 * Fecha `dd/mm/aaaa` en zona horaria de Argentina.
 */
export function formatFecha(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Hora `HH:mm` en zona horaria de Argentina.
 */
export function formatHora(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Fecha y hora `dd/mm/aaaa · HH:mm` en zona horaria de Argentina.
 */
export function formatFechaHora(iso: string | Date): string {
  return `${formatFecha(iso)} · ${formatHora(iso)}`;
}

/**
 * Fecha corta para gráficos: `dd/mm` a partir de `AAAA-MM-DD`.
 */
export function formatDiaMes(ymd: string): string {
  const [, month, day] = ymd.split("-");
  return `${day}/${month}`;
}

/**
 * Fecha larga para el saludo del tablero: `Martes, 10 de noviembre`.
 */
export function formatFechaLarga(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Nombre del mes actual en español: `Noviembre de 2026`.
 */
export function formatMesAnio(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Nombre del mes en minúsculas: `noviembre`.
 */
export function formatNombreMes(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    month: "long",
  }).format(date);
}

/**
 * Normaliza un número de documento dejando solo dígitos (para búsqueda y unicidad).
 */
export function normalizarDocumento(nroDoc: string): string {
  return nroDoc.replace(/\D/g, "");
}

/**
 * Formatea DNI (`28.456.123`) o CUIT (`30-71234567-1`) si corresponde.
 */
export function formatDocumento(tipoDoc: "DNI" | "CUIT", nroDoc: string): string {
  const digits = normalizarDocumento(nroDoc);
  if (tipoDoc === "CUIT" && digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
  if (tipoDoc === "DNI" && (digits.length === 7 || digits.length === 8)) {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  return nroDoc.trim();
}

/**
 * Regla 4: Numeración correlativa `0001-00000001`.
 */
export function formatNumeroFactura(puntoVenta: number, numero: number): string {
  const pv = String(puntoVenta).padStart(4, "0");
  const num = String(numero).padStart(8, "0");
  return `${pv}-${num}`;
}

/**
 * Numeración de recibo de pago: `R 0001-00000001`.
 */
export function formatNumeroRecibo(puntoVenta: number, numero: number): string {
  return `R ${formatNumeroFactura(puntoVenta, numero)}`;
}

/**
 * Iniciales de un nombre (ej: "Laura Méndez" -> "LM").
 */
export function getIniciales(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Obtiene la fecha `AAAA-MM-DD` actual en hora de Argentina (UTC-3).
 */
export function argentinaDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/**
 * Inicio de un día `AAAA-MM-DD` en Argentina expresado como ISO UTC (`T03:00:00.000Z`).
 */
export function argentinaDayStartUtc(ymd: string): string {
  return new Date(`${ymd}T00:00:00.000-03:00`).toISOString();
}

/**
 * Fin inclusivo de un día `AAAA-MM-DD` en Argentina expresado como ISO UTC.
 */
export function argentinaDayEndUtc(ymd: string): string {
  return new Date(`${ymd}T23:59:59.999-03:00`).toISOString();
}

/**
 * Genera el listado de los últimos `count` días `AAAA-MM-DD` en Argentina,
 * del más viejo a hoy.
 */
export function argentinaLastNDays(
  count: number,
  now: Date = new Date()
): string[] {
  const todayStr = argentinaDateStr(now);
  const [y, m, d] = todayStr.split("-").map(Number);
  const baseUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(baseUtc - i * 86_400_000);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    result.push(`${yy}-${mm}-${dd}`);
  }
  return result;
}

/**
 * Devuelve el primer día del mes en curso en Argentina (`AAAA-MM-01`).
 */
export function argentinaMonthStartStr(now: Date = new Date()): string {
  const todayStr = argentinaDateStr(now);
  return `${todayStr.slice(0, 7)}-01`;
}
