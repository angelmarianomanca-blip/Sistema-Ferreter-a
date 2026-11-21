import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol", { enum: ["admin", "vendedor"] }).notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const categorias = sqliteTable("categorias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull().unique(),
  activa: integer("activa", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const productos = sqliteTable(
  "productos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    codigo: text("codigo").notNull().unique(),
    descripcion: text("descripcion").notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id),
    precio: integer("precio").notNull(), // centavos
    existencia: integer("existencia").notNull().default(0),
    stockMinimo: integer("stock_minimo").notNull().default(0),
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_productos_categoria").on(table.categoriaId),
    index("idx_productos_activo").on(table.activo),
  ]
);

export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tipoDoc: text("tipo_doc", { enum: ["DNI", "CUIT"] }).notNull(),
  nroDoc: text("nro_doc").notNull(),
  nroDocNormalizado: text("nro_doc_normalizado").notNull().unique(),
  nombre: text("nombre").notNull(),
  domicilio: text("domicilio"),
  telefono: text("telefono"),
  email: text("email"),
  cuentaCorriente: integer("cuenta_corriente", { mode: "boolean" })
    .notNull()
    .default(false),
  limiteCredito: integer("limite_credito"), // nullable, centavos
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const facturas = sqliteTable(
  "facturas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    puntoVenta: integer("punto_venta").notNull().default(1),
    numero: integer("numero").notNull(),
    fecha: text("fecha").notNull(), // ISO 8601 UTC
    clienteId: integer("cliente_id").references(() => clientes.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    total: integer("total").notNull(), // centavos
    formaPago: text("forma_pago", {
      enum: ["contado", "tarjeta", "cuenta_corriente"],
    }).notNull(),
    montoRecibido: integer("monto_recibido"), // centavos
    vuelto: integer("vuelto"), // centavos
    tarjetaTipo: text("tarjeta_tipo", { enum: ["debito", "credito"] }),
    tarjetaMarca: text("tarjeta_marca"),
    tarjetaUltimos4: text("tarjeta_ultimos_4"),
    estado: text("estado", { enum: ["emitida", "anulada"] })
      .notNull()
      .default("emitida"),
    motivoAnulacion: text("motivo_anulacion"),
    fechaAnulacion: text("fecha_anulacion"),
    usuarioAnulacionId: integer("usuario_anulacion_id").references(
      () => usuarios.id
    ),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("uq_facturas_pv_num").on(table.puntoVenta, table.numero),
    index("idx_facturas_fecha").on(table.fecha),
    index("idx_facturas_cliente").on(table.clienteId),
    index("idx_facturas_usuario").on(table.usuarioId),
    index("idx_facturas_estado").on(table.estado),
  ]
);

export const facturaItems = sqliteTable(
  "factura_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    facturaId: integer("factura_id")
      .notNull()
      .references(() => facturas.id),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    codigo: text("codigo").notNull(),
    descripcion: text("descripcion").notNull(),
    cantidad: integer("cantidad").notNull(),
    precioUnitario: integer("precio_unitario").notNull(), // centavos
    subtotal: integer("subtotal").notNull(), // centavos
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_factura_items_factura").on(table.facturaId),
    index("idx_factura_items_producto").on(table.productoId),
  ]
);

export const movimientosStock = sqliteTable(
  "movimientos_stock",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    facturaId: integer("factura_id").references(() => facturas.id),
    tipo: text("tipo", {
      enum: ["venta", "anulacion", "ingreso", "egreso"],
    }).notNull(),
    cantidad: integer("cantidad").notNull(), // con signo
    existenciaResultante: integer("existencia_resultante").notNull(),
    motivo: text("motivo").notNull(),
    observacion: text("observacion"),
    fecha: text("fecha").notNull(), // ISO 8601 UTC
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_mov_stock_producto").on(table.productoId),
    index("idx_mov_stock_fecha").on(table.fecha),
    index("idx_mov_stock_tipo").on(table.tipo),
    index("idx_mov_stock_factura").on(table.facturaId),
  ]
);

export const pagos = sqliteTable(
  "pagos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    puntoVenta: integer("punto_venta").notNull().default(1),
    numero: integer("numero").notNull(),
    fecha: text("fecha").notNull(), // ISO 8601 UTC
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    importe: integer("importe").notNull(), // centavos
    medio: text("medio", {
      enum: ["efectivo", "transferencia", "tarjeta_debito"],
    }).notNull(),
    observacion: text("observacion"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("uq_pagos_pv_num").on(table.puntoVenta, table.numero),
    index("idx_pagos_cliente").on(table.clienteId),
  ]
);

export const movimientosCuenta = sqliteTable(
  "movimientos_cuenta",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    tipo: text("tipo", { enum: ["debito", "credito"] }).notNull(),
    importe: integer("importe").notNull(), // centavos positivos
    fecha: text("fecha").notNull(), // ISO 8601 UTC
    descripcion: text("descripcion").notNull(),
    facturaId: integer("factura_id").references(() => facturas.id),
    pagoId: integer("pago_id").references(() => pagos.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_mov_cuenta_cliente").on(table.clienteId),
    index("idx_mov_cuenta_fecha").on(table.fecha),
  ]
);

export type UsuarioRow = typeof usuarios.$inferSelect;
export type CategoriaRow = typeof categorias.$inferSelect;
export type ProductoRow = typeof productos.$inferSelect;
export type ClienteRow = typeof clientes.$inferSelect;
export type FacturaRow = typeof facturas.$inferSelect;
export type FacturaItemRow = typeof facturaItems.$inferSelect;
export type MovimientoStockRow = typeof movimientosStock.$inferSelect;
export type PagoRow = typeof pagos.$inferSelect;
export type MovimientoCuentaRow = typeof movimientosCuenta.$inferSelect;
