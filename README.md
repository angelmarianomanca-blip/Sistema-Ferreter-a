# Mostrador · Sistema de gestión comercial

Sistema web full stack para la gestión diaria de un comercio minorista (**Ferretería del Centro S.R.L.**): facturación ágil desde el mostrador, control atómico de existencias con historial completo, cuentas corrientes de clientes con recibos numerados, gestión de usuarios por rol y tablero de indicadores.

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

## Integrantes

- Completar con los integrantes del equipo y la URL pública de Vercel al publicar.
