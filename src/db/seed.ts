import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, libsqlClient } from "./index";
import { movimientosStock, productos, usuarios } from "./schema";
import { type AuthUser, hashPassword } from "@/lib/auth";
import { argentinaLastNDays } from "@/lib/format";
import { crearCategoria, editarCategoria } from "@/services/categorias.service";
import { crearCliente, calcularSaldoCliente } from "@/services/clientes.service";
import { anularFactura, emitirFactura } from "@/services/facturas.service";
import { registrarPago } from "@/services/pagos.service";
import { crearProducto, editarProducto } from "@/services/productos.service";
import { registrarMovimientoManual } from "@/services/stock.service";
import { crearUsuario, editarUsuario } from "@/services/usuarios.service";

function argTimestamp(ymd: string, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${ymd}T${hh}:${mm}:00.000-03:00`).toISOString();
}

async function seed() {
  await libsqlClient.execute("PRAGMA foreign_keys = ON;");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usuarios);

  if (Number(count) > 0) {
    console.log("La base de datos ya tiene datos cargados. Omitiendo seed.");
    libsqlClient.close();
    return;
  }

  const days = argentinaLastNDays(30);
  const initialDate = argTimestamp(days[0], 8, 0);

  // 1. Primer administrador (RF-U3)
  console.log("Creando usuarios...");
  const adminHash = await hashPassword("admin1234");
  const [adminRow] = await db
    .insert(usuarios)
    .values({
      nombre: "Laura Méndez",
      email: "laura@ferreteria.test",
      rol: "admin",
      passwordHash: adminHash,
      activo: true,
      createdAt: initialDate,
    })
    .returning();

  const admin: AuthUser = {
    id: adminRow.id,
    nombre: adminRow.nombre,
    email: adminRow.email,
    rol: "admin",
  };

  const pabloDto = await crearUsuario(
    admin,
    {
      nombre: "Pablo Ruiz",
      email: "pablo@ferreteria.test",
      rol: "vendedor",
      password: "vendedor1234",
    },
    { createdAt: initialDate }
  );
  const anaDto = await crearUsuario(
    admin,
    {
      nombre: "Ana Gómez",
      email: "ana@ferreteria.test",
      rol: "vendedor",
      password: "vendedor1234",
    },
    { createdAt: initialDate }
  );
  const diegoDto = await crearUsuario(
    admin,
    {
      nombre: "Diego Sosa",
      email: "diego@ferreteria.test",
      rol: "vendedor",
      password: "vendedor1234",
    },
    { createdAt: initialDate }
  );
  await editarUsuario(admin, diegoDto.id, { activo: false });

  const pablo: AuthUser = {
    id: pabloDto.id,
    nombre: pabloDto.nombre,
    email: pabloDto.email,
    rol: "vendedor",
  };
  const ana: AuthUser = {
    id: anaDto.id,
    nombre: anaDto.nombre,
    email: anaDto.email,
    rol: "vendedor",
  };
  const vendedores = [admin, pablo, ana];

  // 2. Categorías (6 activas + 1 inactiva)
  console.log("Creando categorías...");
  const catNames = [
    "Bulonería",
    "Electricidad",
    "Herramientas",
    "Jardín",
    "Pinturería",
    "Plomería",
  ] as const;
  const catMap = new Map<string, number>();
  for (const nombre of catNames) {
    const c = await crearCategoria(admin, { nombre });
    catMap.set(nombre, c.id);
  }
  const catTemp = await crearCategoria(admin, { nombre: "Temporada" });
  await editarCategoria(admin, catTemp.id, { activa: false });

  // 3. Productos (30 productos: 29 activos + 1 inactivo)
  console.log("Creando productos con stock inicial...");
  const productosSeed: Array<{
    codigo: string;
    descripcion: string;
    cat: (typeof catNames)[number];
    precio: number;
    stockMinimo: number;
    stockInicial: number;
    inactivo?: boolean;
  }> = [
    // Bulonería (5)
    { codigo: "BU-001", descripcion: "Tornillo autoperforante x100", cat: "Bulonería", precio: 560000, stockMinimo: 10, stockInicial: 18 },
    { codigo: "BU-002", descripcion: "Tarugo N°8 x50", cat: "Bulonería", precio: 210000, stockMinimo: 20, stockInicial: 105 },
    { codigo: "BU-003", descripcion: 'Bulón 1/4 x 2" con tuerca x10', cat: "Bulonería", precio: 390000, stockMinimo: 10, stockInicial: 48 },
    { codigo: "BU-004", descripcion: 'Clavo punta París 2" x 1 kg', cat: "Bulonería", precio: 470000, stockMinimo: 8, stockInicial: 32 },
    { codigo: "BU-005", descripcion: "Arandela plana 1/4 x50", cat: "Bulonería", precio: 160000, stockMinimo: 15, stockInicial: 74 },
    // Electricidad (5)
    { codigo: "EL-001", descripcion: "Cinta aisladora 20 m", cat: "Electricidad", precio: 190000, stockMinimo: 30, stockInicial: 150 },
    { codigo: "EL-002", descripcion: "Lámpara LED 12 W", cat: "Electricidad", precio: 320000, stockMinimo: 20, stockInicial: 100 },
    { codigo: "EL-003", descripcion: "Zapatilla 5 tomas con fusible", cat: "Electricidad", precio: 1540000, stockMinimo: 8, stockInicial: 12 },
    { codigo: "EL-004", descripcion: "Cable unipolar 2,5 mm x metro", cat: "Electricidad", precio: 115000, stockMinimo: 50, stockInicial: 310 },
    { codigo: "EL-005", descripcion: "Tomacorriente doble 10 A", cat: "Electricidad", precio: 430000, stockMinimo: 10, stockInicial: 40 },
    // Herramientas (6)
    { codigo: "HE-001", descripcion: "Martillo carpintero 500 g", cat: "Herramientas", precio: 1250000, stockMinimo: 5, stockInicial: 32 },
    { codigo: "HE-002", descripcion: "Destornillador Phillips N°2", cat: "Herramientas", precio: 480000, stockMinimo: 10, stockInicial: 55 },
    { codigo: "HE-003", descripcion: 'Pinza universal 8"', cat: "Herramientas", precio: 990000, stockMinimo: 6, stockInicial: 30 },
    { codigo: "HE-004", descripcion: "Cinta métrica 5 m", cat: "Herramientas", precio: 640000, stockMinimo: 8, stockInicial: 40 },
    { codigo: "HE-005", descripcion: 'Llave ajustable 10"', cat: "Herramientas", precio: 1580000, stockMinimo: 4, stockInicial: 8 },
    { codigo: "HE-006", descripcion: "Juego de mechas acero x13", cat: "Herramientas", precio: 1890000, stockMinimo: 5, stockInicial: 16 },
    // Jardín (3)
    { codigo: "JA-001", descripcion: "Manguera reforzada 15 m", cat: "Jardín", precio: 2150000, stockMinimo: 3, stockInicial: 18 },
    { codigo: "JA-002", descripcion: "Tijera de podar", cat: "Jardín", precio: 1360000, stockMinimo: 3, stockInicial: 12 },
    { codigo: "JA-003", descripcion: "Regador plástico 10 L", cat: "Jardín", precio: 890000, stockMinimo: 3, stockInicial: 18 },
    // Pinturería (6 -> 5 activos + 1 inactivo)
    { codigo: "PI-001", descripcion: "Látex interior blanco 4 L", cat: "Pinturería", precio: 2890000, stockMinimo: 6, stockInicial: 11 },
    { codigo: "PI-002", descripcion: "Rodillo lana sintética 22 cm", cat: "Pinturería", precio: 780000, stockMinimo: 10, stockInicial: 34 },
    { codigo: "PI-003", descripcion: "Pincel cerda blanca N°20", cat: "Pinturería", precio: 420000, stockMinimo: 12, stockInicial: 45 },
    { codigo: "PI-004", descripcion: "Esmalte sintético negro 1 L", cat: "Pinturería", precio: 1420000, stockMinimo: 6, stockInicial: 24 },
    { codigo: "PI-005", descripcion: "Lija al agua grano 220", cat: "Pinturería", precio: 65000, stockMinimo: 25, stockInicial: 95 },
    { codigo: "PI-006", descripcion: "Barniz marino brillante 1 L (discontinuo)", cat: "Pinturería", precio: 1690000, stockMinimo: 4, stockInicial: 0, inactivo: true },
    // Plomería (5)
    { codigo: "PL-001", descripcion: 'Llave de paso 1/2"', cat: "Plomería", precio: 1120000, stockMinimo: 5, stockInicial: 24 },
    { codigo: "PL-002", descripcion: "Cinta teflón 12 mm x 10 m", cat: "Plomería", precio: 140000, stockMinimo: 20, stockInicial: 80 },
    { codigo: "PL-003", descripcion: "Codo PVC 40 mm a 90°", cat: "Plomería", precio: 185000, stockMinimo: 15, stockInicial: 60 },
    { codigo: "PL-004", descripcion: "Flexible mallado 40 cm", cat: "Plomería", precio: 460000, stockMinimo: 8, stockInicial: 28 },
    { codigo: "PL-005", descripcion: "Sellador silicona transparente", cat: "Plomería", precio: 680000, stockMinimo: 8, stockInicial: 26 },
  ];

  const prodByCode = new Map<string, number>();
  for (const p of productosSeed) {
    const created = await crearProducto(
      admin,
      {
        codigo: p.codigo,
        descripcion: p.descripcion,
        categoriaId: catMap.get(p.cat)!,
        precio: p.precio,
        stockMinimo: p.stockMinimo,
        stockInicial: p.stockInicial > 0 ? p.stockInicial : undefined,
      },
      { fecha: initialDate }
    );
    prodByCode.set(p.codigo, created.id);
    if (p.inactivo) {
      await editarProducto(admin, created.id, { activo: false });
    }
  }

  // Un egreso manual y un ingreso de reposición para enriquecer el historial
  await registrarMovimientoManual(
    admin,
    prodByCode.get("HE-002")!,
    {
      tipo: "egreso",
      cantidad: 2,
      motivo: "Ajuste de inventario",
      observacion: "Control mensual de estantería",
    },
    { fecha: argTimestamp(days[20], 9, 15) }
  );
  await registrarMovimientoManual(
    admin,
    prodByCode.get("EL-001")!,
    {
      tipo: "ingreso",
      cantidad: 20,
      motivo: "Reposición",
      observacion: "Pedido semanal",
    },
    { fecha: argTimestamp(days[14], 10, 0) }
  );

  // 4. Clientes (10 clientes)
  console.log("Creando clientes...");
  const clientesSeed = [
    { tipoDoc: "DNI" as const, nroDoc: "38.900.123", nombre: "Carla Medina", domicilio: "San Martín 820", telefono: null, email: "carla.medina@correo.test", cuentaCorriente: false, limiteCredito: null },
    { tipoDoc: "CUIT" as const, nroDoc: "30-70998877-4", nombre: "Consorcio Edificio Plaza", domicilio: "25 de Mayo 310", telefono: "381 430-1200", email: "admin@edificioplaza.test", cuentaCorriente: true, limiteCredito: 80000000 },
    { tipoDoc: "CUIT" as const, nroDoc: "30-71234567-1", nombre: "Construcciones Norte SRL", domicilio: "Av. Sarmiento 910", telefono: "381 430-7788", email: "compras@cnorte.test", cuentaCorriente: true, limiteCredito: 150000000 },
    { tipoDoc: "DNI" as const, nroDoc: "31.222.908", nombre: "Jorge Paz", domicilio: "Crisóstomo Álvarez 77", telefono: "381 512-9034", email: "jorge.paz@correo.test", cuentaCorriente: true, limiteCredito: null },
    { tipoDoc: "DNI" as const, nroDoc: "35.678.210", nombre: "Lucía Fernández", domicilio: "Muñecas 412", telefono: "381 600-1122", email: "lucia.f@correo.test", cuentaCorriente: false, limiteCredito: null },
    { tipoDoc: "DNI" as const, nroDoc: "28.456.123", nombre: "Mariana López", domicilio: "Las Heras 455", telefono: "381 455-2210", email: "mariana.lopez@correo.test", cuentaCorriente: true, limiteCredito: 40000000 },
    { tipoDoc: "DNI" as const, nroDoc: "33.445.566", nombre: "Martín Acosta", domicilio: "Córdoba 680", telefono: "381 590-7781", email: null, cuentaCorriente: false, limiteCredito: null },
    { tipoDoc: "DNI" as const, nroDoc: "40.112.334", nombre: "Ramiro Díaz", domicilio: "Laprida 215", telefono: "381 588-4401", email: "ramiro.diaz@correo.test", cuentaCorriente: false, limiteCredito: null },
    { tipoDoc: "DNI" as const, nroDoc: "27.890.456", nombre: "Silvia Herrera", domicilio: "Mendoza 1020", telefono: "381 467-3300", email: "silvia.h@correo.test", cuentaCorriente: true, limiteCredito: 20000000 },
    { tipoDoc: "CUIT" as const, nroDoc: "20-25444111-3", nombre: "Taller El Tornillo", domicilio: "Av. Alem 540", telefono: "381 421-5566", email: "taller@eltornillo.test", cuentaCorriente: true, limiteCredito: 50000000 },
  ];

  const clienteByName = new Map<string, number>();
  for (const c of clientesSeed) {
    const created = await crearCliente(admin, c);
    clienteByName.set(c.nombre, created.id);
  }

  // 5. Facturas (62 facturas repartidas en los últimos 30 días usando emitirFactura)
  console.log("Emitiendo facturas con el servicio real...");
  type SeedFactura = {
    dayIdx: number; // 0..29 (29 = hoy)
    hour: number;
    min: number;
    vendedorIdx: number;
    clienteName: string | null;
    items: Array<[string, number]>;
    forma: "contado" | "tarjeta" | "cuenta_corriente";
    tarjeta?: { tipo: "debito" | "credito"; marca: string; ultimos4: string };
    anular?: { motivo: string };
  };

  const facturasPlan: SeedFactura[] = [
    // Semana 1 (días 0..6)
    { dayIdx: 0, hour: 9, min: 30, vendedorIdx: 0, clienteName: null, items: [["HE-001", 2], ["EL-001", 3]], forma: "contado" },
    { dayIdx: 0, hour: 11, min: 45, vendedorIdx: 1, clienteName: "Construcciones Norte SRL", items: [["EL-004", 15], ["BU-001", 2]], forma: "cuenta_corriente" },
    { dayIdx: 1, hour: 10, min: 15, vendedorIdx: 2, clienteName: null, items: [["PI-002", 2], ["PI-003", 2]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "4821" } },
    { dayIdx: 1, hour: 16, min: 20, vendedorIdx: 1, clienteName: "Taller El Tornillo", items: [["HE-003", 2], ["BU-003", 3]], forma: "cuenta_corriente" },
    { dayIdx: 2, hour: 9, min: 50, vendedorIdx: 0, clienteName: "Martín Acosta", items: [["PL-001", 2], ["PL-002", 4]], forma: "contado" },
    { dayIdx: 2, hour: 15, min: 10, vendedorIdx: 2, clienteName: null, items: [["EL-002", 4], ["EL-005", 2]], forma: "contado" },
    { dayIdx: 3, hour: 11, min: 5, vendedorIdx: 1, clienteName: "Silvia Herrera", items: [["PI-001", 1], ["PI-005", 4]], forma: "cuenta_corriente" },
    { dayIdx: 4, hour: 10, min: 40, vendedorIdx: 0, clienteName: null, items: [["JA-001", 1], ["JA-003", 1]], forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Mastercard", ultimos4: "9012" } },
    { dayIdx: 4, hour: 17, min: 0, vendedorIdx: 2, clienteName: "Consorcio Edificio Plaza", items: [["EL-002", 5], ["PL-004", 2]], forma: "cuenta_corriente" },
    { dayIdx: 5, hour: 12, min: 15, vendedorIdx: 1, clienteName: null, items: [["HE-002", 3], ["BU-002", 3]], forma: "contado" },
    { dayIdx: 6, hour: 10, min: 25, vendedorIdx: 0, clienteName: "Lucía Fernández", items: [["PI-004", 1], ["PI-003", 2]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "3310" } },
    { dayIdx: 6, hour: 14, min: 50, vendedorIdx: 2, clienteName: null, items: [["PL-003", 5], ["PL-005", 2]], forma: "contado" },

    // Semana 2 (días 7..13)
    { dayIdx: 7, hour: 9, min: 40, vendedorIdx: 1, clienteName: "Jorge Paz", items: [["HE-006", 1], ["HE-004", 1]], forma: "cuenta_corriente" },
    { dayIdx: 7, hour: 16, min: 10, vendedorIdx: 0, clienteName: null, items: [["EL-003", 2], ["EL-001", 2]], forma: "contado" },
    { dayIdx: 8, hour: 11, min: 20, vendedorIdx: 2, clienteName: "Mariana López", items: [["PI-001", 1], ["PI-002", 2]], forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Visa", ultimos4: "7745" } },
    { dayIdx: 9, hour: 10, min: 0, vendedorIdx: 1, clienteName: null, items: [["BU-004", 2], ["BU-001", 2]], forma: "contado" },
    { dayIdx: 9, hour: 15, min: 45, vendedorIdx: 0, clienteName: "Taller El Tornillo", items: [["HE-005", 2], ["BU-005", 3]], forma: "cuenta_corriente" },
    { dayIdx: 10, hour: 9, min: 30, vendedorIdx: 2, clienteName: null, items: [["JA-002", 2], ["JA-003", 1]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Mastercard", ultimos4: "6190" } },
    { dayIdx: 10, hour: 17, min: 15, vendedorIdx: 1, clienteName: "Ramiro Díaz", items: [["EL-004", 10], ["EL-005", 2]], forma: "contado" },
    { dayIdx: 11, hour: 11, min: 55, vendedorIdx: 0, clienteName: null, items: [["HE-001", 1], ["HE-002", 2]], forma: "contado" },
    { dayIdx: 12, hour: 10, min: 20, vendedorIdx: 2, clienteName: "Construcciones Norte SRL", items: [["PI-004", 2], ["BU-003", 2]], forma: "cuenta_corriente" },
    { dayIdx: 12, hour: 16, min: 40, vendedorIdx: 1, clienteName: null, items: [["PL-004", 3], ["PL-002", 5]], forma: "contado" },
    { dayIdx: 13, hour: 12, min: 30, vendedorIdx: 0, clienteName: "Carla Medina", items: [["EL-002", 3], ["PI-005", 5]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Cabal", ultimos4: "2048" } },

    // Semana 3 (días 14..20)
    { dayIdx: 14, hour: 9, min: 15, vendedorIdx: 1, clienteName: null, items: [["HE-003", 1], ["HE-004", 2]], forma: "contado" },
    { dayIdx: 14, hour: 15, min: 5, vendedorIdx: 2, clienteName: "Mariana López", items: [["HE-005", 1]], forma: "cuenta_corriente" },
    { dayIdx: 15, hour: 10, min: 50, vendedorIdx: 0, clienteName: null, items: [["PI-001", 2], ["PI-003", 3]], forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Visa", ultimos4: "5582" } },
    { dayIdx: 16, hour: 11, min: 10, vendedorIdx: 1, clienteName: "Consorcio Edificio Plaza", items: [["PL-001", 2], ["PL-005", 2]], forma: "cuenta_corriente" },
    { dayIdx: 16, hour: 16, min: 55, vendedorIdx: 2, clienteName: null, items: [["BU-001", 2], ["BU-002", 4]], forma: "contado" },
    { dayIdx: 17, hour: 9, min: 45, vendedorIdx: 0, clienteName: null, items: [["EL-003", 2], ["EL-004", 8]], forma: "contado" },
    { dayIdx: 17, hour: 14, min: 20, vendedorIdx: 1, clienteName: "Silvia Herrera", items: [["JA-001", 1], ["JA-002", 1]], forma: "cuenta_corriente" },
    { dayIdx: 18, hour: 10, min: 35, vendedorIdx: 2, clienteName: null, items: [["HE-002", 3], ["EL-001", 5]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "1104" } },
    { dayIdx: 19, hour: 12, min: 0, vendedorIdx: 0, clienteName: "Martín Acosta", items: [["PI-004", 1], ["PI-002", 1]], forma: "contado" },
    { dayIdx: 19, hour: 17, min: 30, vendedorIdx: 1, clienteName: null, items: [["PL-003", 6], ["PL-004", 2]], forma: "contado" },
    { dayIdx: 20, hour: 11, min: 25, vendedorIdx: 2, clienteName: "Mariana López", items: [["HE-006", 1], ["EL-005", 2]], forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Naranja X", ultimos4: "8831" } },

    // Semana 4 (días 21..27)
    { dayIdx: 21, hour: 9, min: 20, vendedorIdx: 0, clienteName: null, items: [["BU-004", 3], ["BU-005", 2]], forma: "contado" },
    { dayIdx: 21, hour: 15, min: 40, vendedorIdx: 1, clienteName: "Jorge Paz", items: [["PI-004", 2]], forma: "cuenta_corriente" },
    { dayIdx: 22, hour: 10, min: 15, vendedorIdx: 2, clienteName: null, items: [["EL-002", 5], ["EL-005", 3]], forma: "contado" },
    { dayIdx: 22, hour: 16, min: 5, vendedorIdx: 0, clienteName: "Mariana López", items: [["HE-001", 1], ["EL-003", 1]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "4409" } },
    { dayIdx: 23, hour: 11, min: 45, vendedorIdx: 1, clienteName: "Taller El Tornillo", items: [["BU-001", 3], ["HE-004", 2]], forma: "cuenta_corriente" },
    { dayIdx: 23, hour: 17, min: 10, vendedorIdx: 2, clienteName: null, items: [["PI-005", 6], ["PI-003", 2]], forma: "contado" },
    { dayIdx: 24, hour: 9, min: 55, vendedorIdx: 0, clienteName: "Lucía Fernández", items: [["JA-003", 2], ["PL-002", 3]], forma: "contado" },
    { dayIdx: 24, hour: 14, min: 32, vendedorIdx: 0, clienteName: "Mariana López", items: [["BU-005", 2]], forma: "cuenta_corriente", anular: { motivo: "Error en la carga de cantidades" } },
    { dayIdx: 25, hour: 10, min: 17, vendedorIdx: 1, clienteName: null, items: [["PI-001", 1], ["PI-004", 2], ["PI-005", 3]], forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Mastercard", ultimos4: "3920" } },
    { dayIdx: 25, hour: 15, min: 30, vendedorIdx: 1, clienteName: null, items: [["PI-004", 2], ["PL-005", 2]], forma: "contado" },
    { dayIdx: 25, hour: 16, min: 7, vendedorIdx: 1, clienteName: "Silvia Herrera", items: [["HE-001", 2], ["BU-004", 4], ["BU-005", 3]], forma: "cuenta_corriente" },
    { dayIdx: 26, hour: 9, min: 26, vendedorIdx: 1, clienteName: null, items: [["PL-001", 1]], forma: "contado" },
    { dayIdx: 26, hour: 10, min: 27, vendedorIdx: 0, clienteName: "Martín Acosta", items: [["EL-002", 2]], forma: "contado" },
    { dayIdx: 26, hour: 15, min: 9, vendedorIdx: 0, clienteName: null, items: [["HE-001", 1], ["EL-002", 3]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "6219" } },
    { dayIdx: 26, hour: 15, min: 46, vendedorIdx: 2, clienteName: null, items: [["BU-001", 2], ["PI-004", 2]], forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Visa", ultimos4: "7182" } },

    // Ayer (día 28)
    { dayIdx: 27, hour: 11, min: 30, vendedorIdx: 2, clienteName: "Consorcio Edificio Plaza", items: [["EL-003", 1], ["EL-005", 2]], forma: "cuenta_corriente" },
    { dayIdx: 27, hour: 16, min: 15, vendedorIdx: 0, clienteName: null, items: [["HE-005", 2], ["PL-004", 2]], forma: "contado" },
    { dayIdx: 28, hour: 10, min: 20, vendedorIdx: 1, clienteName: null, items: [["PI-001", 1], ["PI-002", 2]], forma: "contado" },
    { dayIdx: 28, hour: 12, min: 44, vendedorIdx: 1, clienteName: "Jorge Paz", items: [["HE-002", 2], ["HE-005", 1]], forma: "cuenta_corriente" },
    { dayIdx: 28, hour: 16, min: 57, vendedorIdx: 2, clienteName: null, items: [["HE-003", 1]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Mastercard", ultimos4: "5034" } },

    // Hoy (día 29) — 3 facturas para que el tablero muestre "Ventas de hoy"
    { dayIdx: 29, hour: 10, min: 23, vendedorIdx: 1, clienteName: "Construcciones Norte SRL", items: [["EL-004", 3], ["HE-002", 4]], forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "8821" } },
    { dayIdx: 29, hour: 12, min: 33, vendedorIdx: 0, clienteName: null, items: [["JA-003", 1], ["EL-004", 3]], forma: "contado" },
    { dayIdx: 29, hour: 15, min: 12, vendedorIdx: 2, clienteName: null, items: [["HE-002", 2], ["PL-004", 3]], forma: "contado" },
  ];

  for (const plan of facturasPlan) {
    const fecha = argTimestamp(days[plan.dayIdx], plan.hour, plan.min);
    const vendedor = vendedores[plan.vendedorIdx];
    const clienteId = plan.clienteName ? clienteByName.get(plan.clienteName)! : null;
    const pago =
      plan.forma === "contado"
        ? { forma: "contado" as const }
        : plan.forma === "tarjeta"
          ? { forma: "tarjeta" as const, tarjeta: plan.tarjeta! }
          : { forma: "cuenta_corriente" as const };

    const fac = await emitirFactura(
      vendedor,
      {
        clienteId,
        items: plan.items.map(([code, cantidad]) => ({
          productoId: prodByCode.get(code)!,
          cantidad,
        })),
        pago,
      },
      { fecha }
    );

    if (plan.anular) {
      const anulFecha = argTimestamp(days[plan.dayIdx], plan.hour, plan.min + 2);
      await anularFactura(admin, fac.id, { motivo: plan.anular.motivo }, { fecha: anulFecha });
    }
  }

  // 6. Pagos en cuenta corriente (para dejar saldos realistas y recibos imprimibles)
  console.log("Registrando pagos en cuenta corriente...");
  const pagosPlan: Array<{
    clienteName: string;
    porcentaje: number;
    medio: "efectivo" | "transferencia" | "tarjeta_debito";
    obs: string;
    dayIdx: number;
    vendedorIdx: number;
  }> = [
    { clienteName: "Construcciones Norte SRL", porcentaje: 0.7, medio: "transferencia", obs: "Transferencia bancaria", dayIdx: 15, vendedorIdx: 0 },
    { clienteName: "Taller El Tornillo", porcentaje: 0.55, medio: "efectivo", obs: "Pago parcial mostrador", dayIdx: 18, vendedorIdx: 1 },
    { clienteName: "Jorge Paz", porcentaje: 0.5, medio: "transferencia", obs: "Pago parcial", dayIdx: 22, vendedorIdx: 1 },
    { clienteName: "Silvia Herrera", porcentaje: 0.65, medio: "efectivo", obs: "Entrega a cuenta", dayIdx: 26, vendedorIdx: 2 },
    { clienteName: "Mariana López", porcentaje: 0.55, medio: "tarjeta_debito", obs: "Pago a cuenta", dayIdx: 27, vendedorIdx: 0 },
    { clienteName: "Consorcio Edificio Plaza", porcentaje: 0.6, medio: "transferencia", obs: "Pago a cuenta", dayIdx: 28, vendedorIdx: 2 },
  ];

  for (const p of pagosPlan) {
    const clienteId = clienteByName.get(p.clienteName)!;
    const saldoActual = await calcularSaldoCliente(db, clienteId);
    if (saldoActual <= 0) continue;
    // Redondear a múltiplos de $100 (10000 centavos) sin superar la deuda
    const importe = Math.min(
      saldoActual,
      Math.max(10000, Math.floor((saldoActual * p.porcentaje) / 10000) * 10000)
    );
    await registrarPago(
      vendedores[p.vendedorIdx],
      clienteId,
      {
        importe,
        medio: p.medio,
        observacion: p.obs,
      },
      { fecha: argTimestamp(days[p.dayIdx], 18, 30) }
    );
  }

  // 7. Verificación de invariantes (Regla 2 y Sección 10.8 punto 5)
  const prods = await db.select().from(productos);
  for (const prod of prods) {
    const [sumRow] = await db
      .select({
        suma: sql<number>`COALESCE(SUM(${movimientosStock.cantidad}), 0)`,
      })
      .from(movimientosStock)
      .where(sql`${movimientosStock.productoId} = ${prod.id}`);
    if (Number(sumRow.suma) !== prod.existencia) {
      throw new Error(
        `Invariante roto en producto ${prod.codigo}: existencia=${prod.existencia}, sumaMovimientos=${sumRow.suma}`
      );
    }
  }

  const bajoMinimo = prods.filter((p) => p.activo && p.existencia < p.stockMinimo);
  console.log(
    `Seed completado con éxito: ${prods.length} productos (${bajoMinimo.length} bajo mínimo), ${clientesSeed.length} clientes, ${facturasPlan.length} facturas.`
  );
  libsqlClient.close();
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
