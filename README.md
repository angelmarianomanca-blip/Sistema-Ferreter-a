# Mostrador · Sistema de gestión comercial

Sistema web full stack para la gestión diaria de un comercio minorista (**Ferretería del Centro S.R.L.**): facturación ágil desde el mostrador, control atómico de existencias con historial completo, cuentas corrientes de clientes con recibos numerados, gestión de usuarios por rol y tablero de indicadores.

- **URL pública (Vercel):** https://sistema-ferreter-a.vercel.app/
- **Base de datos en producción:** Turso (libSQL)

## Integrantes

- Mariano Manca
- Rojas Mauricio
- Luis Montes
- Gonzalo Carrizo

## Stack tecnológico

- **Framework y lenguaje:** Next.js 16 (App Router) + TypeScript
- **Interfaz:** React 19, Tailwind CSS v4, shadcn/ui (Radix UI + Lucide)
- **Gráficos:** Chart.js (`react-chartjs-2`)
- **Base de datos y ORM:** SQLite en desarrollo / Turso (libSQL) en producción + Drizzle ORM (`drizzle-kit`)
- **Validación:** Zod (esquemas compartidos entre cliente y servidor)
- **Autenticación:** Sesión propia en cookie `httpOnly` firmada con HMAC-SHA256 y contraseñas hasheadas con `bcryptjs`

## Puesta en marcha local

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Usuarios de prueba

### En producción (Vercel)

| Rol | Email | Contraseña |
| --- | --- | --- |
| Vendedor | `vendedor@ferreteria.test` | `vendedor123` |

*(Los usuarios administradores de producción corresponden a los integrantes del equipo.)*

### En instalación local (`pnpm run db:seed`)

| Rol | Nombre | Email | Contraseña | Estado |
| --- | --- | --- | --- | --- |
| Administrador | Laura Méndez | `laura@ferreteria.test` | `admin1234` | Activo |
| Vendedor | Pablo Ruiz | `pablo@ferreteria.test` | `vendedor1234` | Activo |
| Vendedor | Ana Gómez | `ana@ferreteria.test` | `vendedor1234` | Activo |
| Vendedor | Diego Sosa | `diego@ferreteria.test` | `vendedor1234` | Inactivo |

## Variables de entorno

Consultar `.env.example`:

- `DATABASE_URL`: `file:./local.db` en desarrollo o `libsql://...` en Turso.
- `DATABASE_AUTH_TOKEN`: token de Turso (vacío en desarrollo local).
- `SESSION_SECRET`: secreto para firmar cookies de sesión (usar un valor aleatorio de al menos 32 caracteres en producción).
- `COMERCIO_NOMBRE`, `COMERCIO_NOMBRE_CORTO`, `COMERCIO_DOMICILIO`, `COMERCIO_CUIT`, `COMERCIO_TELEFONO`, `COMERCIO_PUNTO_VENTA`: datos del local para comprobantes y recibos.

## Arquitectura y trazabilidad

La aplicación se organiza en capas estrictas:

- `src/db/`: esquema relacional (`schema.ts`), conexión (`index.ts`), migrador (`migrate.ts`) y datos iniciales (`seed.ts`, que opera llamando a los mismos servicios de la aplicación).
- `src/lib/schemas/`: esquemas Zod compartidos entre formularios y servidor (con `.strict()` para rechazar campos prohibidos como `existencia` en `PATCH` o el número completo de tarjeta).
- `src/services/`: **único lugar donde viven las reglas de negocio, validaciones de rol y transacciones atómicas**:
  - `auth.service.ts` (RF-U1, RF-U2, RF-U5)
  - `usuarios.service.ts` (RF-U4, RF-U5)
  - `categorias.service.ts` (RF-P7)
  - `productos.service.ts` (RF-P1 a RF-P3)
  - `stock.service.ts` (RF-P4 a RF-P6, Reglas 1 y 2 — `moverStock()` es el único punto que modifica existencias con `UPDATE ... WHERE existencia >= ?`)
  - `clientes.service.ts` (RF-C1 a RF-C4, RF-C6, RF-C7, Regla 7 — saldo derivado siempre de `movimientos_cuenta`)
  - `pagos.service.ts` (RF-C5, Reglas 4 y 8)
  - `facturas.service.ts` (RF-V1 a RF-V9, Reglas 1 a 11 — emisión y anulación en transacciones `BEGIN IMMEDIATE`)
  - `tablero.service.ts` (RF-T1 a RF-T3)
- `src/app/api/`: 31 endpoints REST implementados como adaptadores finos con `withApiHandler`.
- `src/actions/`: Server Actions finas con `withServerAction`.
- `src/proxy.ts`: primera barrera de autenticación; además cada página y cada servicio revalidan la sesión y el rol contra la base de datos en cada pedido.

## Despliegue en Vercel + Turso

1. Crear una base de datos en Turso y obtener `DATABASE_URL` y `DATABASE_AUTH_TOKEN`.
2. Aplicar migraciones y datos iniciales apuntando a Turso:
   ```bash
   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." pnpm run db:migrate
   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." pnpm run db:seed
   ```
3. Configurar las variables de entorno en Vercel (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`) y desplegar.

## Requerimientos cubiertos

- **Ventas (`RF-V1` a `RF-V9`):** nueva venta en una sola pantalla con atajos de teclado (`F2`, `F4`, `F8`, `F9`), consumidor final o cliente registrado con alta rápida modal, control de stock en cliente y servidor, 3 formas de pago (`contado`, `tarjeta` solo últimos 4 dígitos, `cuenta_corriente` con límite de crédito), confirmación en transacción atómica, comprobante imprimible, listado con filtros/paginado y anulación solo por administrador.
- **Productos y existencias (`RF-P1` a `RF-P7`):** catálogo paginado con alerta de bajo mínimo, alta/edición/baja lógica, ingresos y egresos manuales de stock con motivos validados, historial de movimientos con referencia a factura y gestión de categorías.
- **Clientes y cuenta corriente (`RF-C1` a `RF-C7`):** búsqueda por nombre o documento (sin importar puntos ni guiones), alta/edición/baja lógica (bloqueada con saldo pendiente), ficha con últimas facturas, cuenta corriente cronológica con saldo acumulado, registro de pagos con recibo numerado e imprimible y listado de saldos.
- **Usuarios y acceso (`RF-U1` a `RF-U5`):** sesión en cookie `httpOnly` firmada, revalidación contra base de datos en cada pedido, gestión de usuarios por administrador, restablecimiento de contraseñas y cambio de contraseña propia en `/perfil`.
- **Tablero (`RF-T1` a `RF-T3`):** indicadores del día y del mes en hora de Argentina, deuda total, productos bajo mínimo, gráficos con Chart.js (ventas diarias últimos 30 días y mes por forma de pago) y top 5 más vendidos del mes.
