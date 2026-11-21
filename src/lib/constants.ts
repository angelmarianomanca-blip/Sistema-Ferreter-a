export const COMERCIO = {
  appName: "Mostrador",
  nombre: process.env.COMERCIO_NOMBRE ?? "Ferretería del Centro S.R.L.",
  nombreCorto: process.env.COMERCIO_NOMBRE_CORTO ?? "Ferretería del Centro",
  domicilio:
    process.env.COMERCIO_DOMICILIO ?? "Av. Mitre 1234 · San Miguel de Tucumán",
  cuit: process.env.COMERCIO_CUIT ?? "30-71555222-4",
  telefono: process.env.COMERCIO_TELEFONO ?? "381 422-0000",
  puntoVenta: Number(process.env.COMERCIO_PUNTO_VENTA ?? "1") || 1,
} as const;

export const MOTIVOS_INGRESO = [
  "Reposición",
  "Stock inicial",
  "Devolución de cliente",
] as const;

export const MOTIVOS_EGRESO = [
  "Rotura",
  "Vencimiento",
  "Ajuste de inventario",
  "Uso interno",
] as const;

export const FORMAS_PAGO_LABELS = {
  contado: "Contado",
  tarjeta: "Tarjeta",
  cuenta_corriente: "Cuenta corriente",
} as const;

export const MEDIOS_PAGO_LABELS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_debito: "Tarjeta de débito",
} as const;

export const TARJETA_TIPO_LABELS = {
  debito: "Débito",
  credito: "Crédito",
} as const;

export const MARCAS_TARJETA = [
  "Visa",
  "Mastercard",
  "Cabal",
  "Naranja X",
  "American Express",
] as const;

export const ROLES_LABELS = {
  admin: "Administrador",
  vendedor: "Vendedor",
} as const;

export const TIPOS_MOVIMIENTO_STOCK_LABELS = {
  venta: "Venta",
  anulacion: "Anulación",
  ingreso: "Ingreso",
  egreso: "Egreso",
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";
export const ARGENTINA_UTC_OFFSET_HOURS = -3;
