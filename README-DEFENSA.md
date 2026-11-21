# Guía de Estudio para la Defensa · Mostrador

Esta guía responde **todas las preguntas modelo** señalando el archivo y función exacta del proyecto, e incluye el **paso a paso para los cambios pequeños en vivo**.

---

## 1. Base de datos

### ¿Dónde se definen las tablas de la base de datos?
- En `src/db/schema.ts`, usando `sqliteTable` de Drizzle ORM.
- Están las 9 tablas: `usuarios`, `categorias`, `productos`, `clientes`, `facturas`, `factura_items`, `movimientos_stock`, `pagos` y `movimientos_cuenta`.

### ¿Dónde se conecta la aplicación con la base de datos? ¿Cómo sabe si usar la base local o la de Turso?
- En `src/db/index.ts`, con `createClient` de `@libsql/client` y `drizzle(...)`.
- Lee `process.env.DATABASE_URL` y `process.env.DATABASE_AUTH_TOKEN`:
  - En desarrollo local usa `file:./local.db` (archivo SQLite).
  - En producción (Vercel) usa `libsql://...` con su token de autenticación de Turso.

### ¿Cómo se crea una tabla nueva o se agrega un campo? ¿Qué es una migración y dónde están?
- Se edita `src/db/schema.ts`, se ejecuta `pnpm run db:generate` (corre `drizzle-kit generate` configurado en `drizzle.config.ts`) y luego `pnpm run db:migrate` (corre `src/db/migrate.ts`).
- Una **migración** es un archivo SQL versionado que describe los cambios de esquema de forma reproducible. Están en la carpeta `drizzle/` (ej. `drizzle/0000_fantastic_celestials.sql`).

### ¿Dónde se cargan los datos de prueba?
- En `src/db/seed.ts` (se ejecuta con `pnpm run db:seed`).
- Lo importante: **llama a los mismos servicios reales** (`crearProducto`, `crearCliente`, `emitirFactura`, `anularFactura`, `registrarPago`, `registrarMovimientoManual`) para que stock, saldos y numeración cumplan todas las reglas desde el arranque. Al final verifica que `productos.existencia === SUM(movimientos_stock.cantidad)`.

### ¿Cómo se guardan los importes? ¿Por qué no se usan números con coma flotante?
- Se guardan como **enteros en centavos** (`integer` en `src/db/schema.ts`). Ejemplo: `$ 12.500,00` se guarda como `1250000`.
- No se usa coma flotante (`float`/`REAL`) porque en IEEE 754 produce errores de redondeo binario (ej. `0.1 + 0.2 = 0.30000000000000004`), lo cual haría que los totales y saldos no cuadren.

### ¿La existencia de un producto se guarda o se calcula? ¿Y el saldo de un cliente?
- **Existencia del producto:** se guarda en `productos.existencia`, pero **solo se modifica** en `moverStock()` (`src/services/stock.service.ts`) dentro de la misma transacción que inserta el registro en `movimientos_stock`, por lo que siempre coincide con la suma de sus movimientos.
- **Saldo del cliente:** **no se guarda** como columna; se calcula siempre en tiempo real desde `movimientos_cuenta` (`SUM(débitos) - SUM(créditos)`) en `calcularSaldoCliente()` y `calcularMapaSaldos()` (`src/services/clientes.service.ts`).

### ¿Qué tablas se modifican cuando se confirma una factura?
En `emitirFactura()` (`src/services/facturas.service.ts`):
1. `facturas` (inserta cabecera).
2. `factura_items` (inserta renglones con descripción y precio congelados).
3. `productos` (descuenta `existencia` vía `moverStock`).
4. `movimientos_stock` (inserta un movimiento tipo `venta` negativo por cada renglón).
5. `movimientos_cuenta` (solo si `formaPago === "cuenta_corriente"`, inserta un `debito`).

---

## 2. API REST

### ¿Dónde se expone la API REST para agregar un producto?
- En `src/app/api/productos/route.ts`, función `export const POST = withApiHandler(...)`, que llama a `productosService.crearProducto(user, body)`.

### ¿Qué responde la API si se carga un producto con un código que ya existe?
- Responde HTTP **`409 Conflict`** con código `CODIGO_DUPLICADO` y formato estándar:
  ```json
  { "error": { "code": "CODIGO_DUPLICADO", "message": "Ya existe un producto con ese código.", "details": [...] } }
  ```
- Se valida en `crearProducto()` (`src/services/productos.service.ts`) y además está respaldado por índice `UNIQUE` en `productos.codigo`.

### ¿Dónde se verifica que el usuario haya iniciado sesión antes de atender un pedido?
- En **tres barreras**:
  1. `src/proxy.ts` (middleware/proxy de Next.js): redirige páginas a `/login` si falta o venció la cookie firmada.
  2. `withApiHandler()` (`src/lib/http.ts`) y `withServerAction()` (`src/lib/actions.ts`): llaman a `requireSessionUser()`.
  3. `getSessionUser()` (`src/lib/auth.ts`): verifica la firma HMAC-SHA256 de la cookie **y consulta la tabla `usuarios` en la DB** en cada pedido para comprobar que siga activo y leer su rol actual.

### ¿Qué pasa si un vendedor llama directamente a una ruta de administrador? Muéstrenlo.
- El servicio ejecuta `assertAdmin(actor)` (`src/lib/auth.ts`) y responde HTTP **`403 Forbidden`** con `{ "error": { "code": "SIN_PERMISO", "message": "No tenés permisos para realizar esta acción." } }`.
- **Cómo mostrarlo en vivo (desde DevTools → Console estando logueado como `vendedor@ferreteria.test`):**
  ```js
  fetch("/api/usuarios").then(r => r.json().then(d => console.log(r.status, d)));
  // Devuelve: 403 { error: { code: "SIN_PERMISO", ... } }
  ```

### ¿Dónde se arma la respuesta de error que devuelve la API?
- La clase de error única `ApiError(status, code, message, details)` está en `src/lib/errors.ts`.
- La conversión a respuesta HTTP JSON está centralizada en `errorToResponse()` dentro de `src/lib/http.ts` (si es un error inesperado, lo loguea en consola del servidor y devuelve `500 ERROR_INTERNO` sin filtrar detalles internos).

### ¿Por qué el cliente no envía el precio ni el total al crear una factura?
- Por seguridad e integridad: un cliente malicioso podría alterar precios en el navegador.
- En `emitirFactura()` (`src/services/facturas.service.ts`) el cliente solo manda `productoId` y `cantidad`; el servidor busca el precio vigente en `productos`, calcula `subtotal` y `total`, y los congela en `factura_items` y `facturas`.

---

## 3. Reglas de negocio

### ¿Dónde se verifica que el stock no quede negativo?
- En `moverStock()` (`src/services/stock.service.ts`), ejecutando un `UPDATE` condicional atómico:
  ```sql
  UPDATE productos SET existencia = existencia - requerido
  WHERE id = productoId AND existencia >= requerido
  RETURNING existencia
  ```
- Si no actualiza ninguna fila, lanza `ApiError(409, "STOCK_INSUFICIENTE", ...)`. También se adelanta en la UI de Nueva venta (`src/components/ventas/nueva-venta-view.tsx`).

### ¿Qué pasa si dos vendedores venden la última unidad al mismo tiempo?
- `emitirFactura()` abre una transacción con `{ behavior: "immediate" }` (`BEGIN IMMEDIATE` en SQLite/libSQL), que serializa las escrituras, y `moverStock()` hace el `UPDATE ... WHERE existencia >= ?`.
- La primera venta descuenta la última unidad y se confirma (`201`); la segunda encuentra `existencia = 0`, no actualiza ninguna fila, lanza `409 STOCK_INSUFICIENTE` y revierte su transacción completa.

### ¿Dónde se asegura que una factura se grabe completa o no se grabe nada?
- En `emitirFactura()` (`src/services/facturas.service.ts`), envolviendo todos los pasos dentro de `db.transaction(async (tx) => { ... }, { behavior: "immediate" })`. Si falla cualquier paso, SQLite hace `ROLLBACK` automático.

### ¿Dónde se asigna el número de factura? ¿Cómo se evita que queden números salteados?
- En `emitirFactura()` (`src/services/facturas.service.ts`), paso 6, **dentro de la transacción `BEGIN IMMEDIATE`**: calcula `COALESCE(MAX(numero), 0) + 1` para el `puntoVenta` actual (además hay índice único `uq_facturas_pv_num`).
- El número que se ve en Nueva venta (`/api/facturas/proximo-numero`) es solo orientativo; el número real se asigna recién al confirmar, evitando huecos si se descarta una venta o falla una validación.

### Si se cambia el precio de un producto, ¿qué pasa con las facturas ya emitidas? ¿Por qué?
- **No cambian**, porque `factura_items` guarda una copia congelada de `precioUnitario`, `subtotal`, `codigo` y `descripcion` al momento de emitir (`src/services/facturas.service.ts`).

### ¿Dónde se impide vender en cuenta corriente a un consumidor final?
- En `emitirFactura()` (`src/services/facturas.service.ts`), paso 2: si `data.pago.forma === "cuenta_corriente"` y `!clienteRow || !clienteRow.cuentaCorriente`, lanza `422 CUENTA_CORRIENTE_NO_HABILITADA`.
- En la UI (`src/components/ventas/nueva-venta-view.tsx`), el botón `Cta. cte.` además aparece deshabilitado.

### ¿Dónde se controla el límite de crédito de un cliente?
- En `emitirFactura()` (`src/services/facturas.service.ts`), paso 5: calcula `saldoNuevoCliente = saldoActual + total`; si `clienteRow.limiteCredito !== null && saldoNuevoCliente > clienteRow.limiteCredito`, lanza `422 LIMITE_CREDITO_EXCEDIDO` con `details: { saldoActual, limite, excedente }`.

### ¿Dónde se impide registrar un pago mayor que la deuda?
- En `registrarPago()` (`src/services/pagos.service.ts`): dentro de la transacción consulta `saldoActual = await calcularSaldoCliente(tx, clienteId)` y si `data.importe > saldoActual`, lanza `422 PAGO_SUPERA_DEUDA`.

### ¿Qué hace el sistema cuando se anula una factura?
- En `anularFactura()` (`src/services/facturas.service.ts`):
  1. Verifica `assertAdmin(actor)` (solo administrador) y que el motivo no esté vacío.
  2. Verifica que no esté ya anulada (`409 FACTURA_ANULADA`).
  3. Dentro de una transacción `BEGIN IMMEDIATE`: marca `estado = "anulada"` con fecha, usuario y motivo (nunca la borra).
  4. Por cada renglón llama a `moverStock(..., { tipo: "anulacion", cantidad: +item.cantidad })` para reingresar el stock.
  5. Si la factura fue en `cuenta_corriente`, registra un `credito` en `movimientos_cuenta` por el total.

### ¿Dónde queda registrado cada movimiento de stock?
- En la tabla `movimientos_stock` (`src/db/schema.ts`), siempre insertado desde `moverStock()` (`src/services/stock.service.ts`), con `tipo`, `cantidad` (con signo), `existenciaResultante`, `motivo`, `usuarioId`, `facturaId` (si corresponde) y `fecha`.

---

## 4. Seguridad y permisos

### ¿En qué parte se ingresa el número de tarjeta de crédito? (Pregunta trampa)
- **En ningún lado.** Por la **Regla 9**, jamás se pide ni se guarda el número completo de la tarjeta: solo se piden `tipo` (débito/crédito), `marca` y `ultimos4` (exactamente 4 dígitos).
- En `src/lib/schemas/facturas.ts`, `tarjetaDatosSchema` tiene `.strict()`, por lo que si alguien manda un campo extra como `numero` por API, el servidor lo rechaza con `422 VALIDACION`.

### ¿Cómo se guardan las contraseñas?
- Hasheadas con **bcrypt** (`bcryptjs`, 10 rondas de salt) mediante `hashPassword()` y verificadas con `verifyPassword()` en `src/lib/auth.ts`. Nunca se guarda texto plano ni se devuelve `passwordHash` en las respuestas.

### ¿Dónde se verifica el rol del usuario? ¿Alcanza con ocultar el botón?
- **No alcanza con ocultar botones** (eso es solo una ayuda visual). El rol se verifica siempre en el servidor llamando a `assertAdmin(actor)` en cada función de servicio restringida (`usuarios.service.ts`, `categorias.service.ts`, `productos.service.ts`, `stock.service.ts`, `facturas.service.ts`).

### ¿Dónde está el secreto que firma la sesión? ¿Por qué no está en el repositorio?
- En la variable de entorno `SESSION_SECRET` (leída en `src/lib/session-token.ts`).
- No está en el repositorio (`.env` está en `.gitignore`; solo se sube `.env.example` con valores de ejemplo) porque si alguien conociera el secreto podría falsificar cookies de sesión válidas.

### Si se desactiva a un usuario que tiene la sesión abierta, ¿qué pasa?
- Pierde el acceso **de inmediato** en el próximo pedido, aunque conserve la cookie válida, porque `getSessionUser()` (`src/lib/auth.ts`) consulta la base de datos en cada request y comprueba `if (!row || !row.activo) return null`.

---

## 5. Interfaz

### ¿Dónde se define el panel lateral que comparten todas las pantallas?
- En `src/components/layout/app-shell.tsx` (`AppShell`), montado una sola vez en el layout protegido `src/app/(sistema)/layout.tsx`.
- La página `/login` (`src/app/login/page.tsx`) está fuera del grupo `(sistema)`, por eso no muestra el panel lateral ni la barra superior.

### ¿Dónde se da formato a los importes y a las fechas?
- En un único módulo centralizado: `src/lib/format.ts` (`formatMoneda`, `formatFecha`, `formatHora`, `formatFechaHora`, `formatNumeroFactura`, `formatNumeroRecibo`, `formatDocumento`), siempre en zona horaria `America/Argentina/Buenos_Aires`.

### ¿Dónde se validan los datos de un formulario? ¿Se usan las mismas reglas en el servidor?
- **Sí, se comparten los mismos esquemas de Zod** (`src/lib/schemas/*.ts`).
- En el cliente los usa el hook común `useFormAction` (`src/hooks/use-form-action.ts`) antes de enviar; en el servidor los ejecuta `parseOrThrow()` (`src/lib/http.ts`) al inicio de cada servicio.

### ¿Cómo se agrega un producto a la venta usando solo el teclado?
- En `src/components/ventas/nueva-venta-view.tsx`:
  - `F2` enfoca el buscador de productos.
  - Se escribe el código o descripción, se elige con `↑` / `↓` y `Enter` lo agrega a la tabla (si ya estaba, suma la cantidad).
  - `F4` pasa al buscador de cliente, `F8` pasa al pago y `F9` confirma la factura.

### ¿Qué muestra un listado mientras carga, cuando está vacío o cuando falla?
- Componentes reutilizables en `src/components/shared/states.tsx` (`EstadoCargandoTabla`, `EstadoCargandoTarjetas`, `EstadoVacio`, `EstadoError`) y los boundaries globales `src/app/(sistema)/loading.tsx` y `src/app/(sistema)/error.tsx`.

---

## 6. Publicación

### ¿Qué variables de entorno necesita el sistema en producción y dónde se cargan?
- En **Vercel → Settings → Environment Variables**:
  - `DATABASE_URL` (`libsql://...` de Turso)
  - `DATABASE_AUTH_TOKEN` (token de Turso)
  - `SESSION_SECRET` (secreto aleatorio para firmar cookies)
  - Opcionales de cabecera de comprobantes: `COMERCIO_NOMBRE`, `COMERCIO_DOMICILIO`, `COMERCIO_CUIT`, `COMERCIO_TELEFONO`, `COMERCIO_PUNTO_VENTA`.

### ¿Cómo se crearon las tablas en Turso?
- Ejecutando `pnpm run db:migrate` (que corre `src/db/migrate.ts` aplicando los SQL de `drizzle/`) con `DATABASE_URL` y `DATABASE_AUTH_TOKEN` apuntando a Turso, y luego `pnpm run db:seed` para poblar los datos iniciales.

### ¿Cómo se comprueba que el sitio publicado usa la base de Turso y no una local?
- Vercel es serverless (no tiene disco persistente para SQLite local). Al crear una factura o un cliente en `https://sistema-ferreter-a.vercel.app/` y recargar o abrir desde otra computadora/navegador, el dato persiste y aparece reflejado en la base de Turso.

---

## 7. Uso de inteligencia artificial

### ¿Qué agente usaron y para qué partes del sistema?
- Usamos **Antigravity (Gemini)** como asistente para estructurar el proyecto por capas, generar el esquema de Drizzle, los 9 servicios, los 31 endpoints REST y las pantallas con shadcn/ui + Tailwind.

### Muestren algo que el agente hizo mal y cómo lo corrigieron.
- **Ejemplo real de este proyecto:** En el tablero principal (`src/components/tablero/tablero-graficos.tsx`), la tarjeta **"Por forma de pago"** colocaba el gráfico de dona y la leyenda lado a lado (`xl:flex-row`) dentro de una columna de 4/12, lo que hacía que `"Cuenta corriente"` se recortara como `"Cuenta corri..."` y los importes (`$ 450.750,00`) se desbordaran por el borde derecho de la tarjeta. Lo detectamos al probar la pantalla y lo corregimos apilando la dona centrada arriba y la leyenda completa debajo con columnas tabulares alineadas.
- **Otro ejemplo real:** En `pnpm` v12 el `package.json` con `pnpm.onlyBuiltDependencies` fue ignorado y bloqueó los scripts de build de `esbuild`; lo corregimos moviendo la configuración a `pnpm-workspace.yaml` con `allowBuilds`.

---

## 8. Recetario rápido para los cambios pequeños en vivo

### Cambio 1: Agregar el campo «marca» a los productos y mostrarlo en el catálogo
1. `src/db/schema.ts`: en `productos`, agregar `marca: text("marca"),`.
2. Correr `pnpm run db:generate` y `pnpm run db:migrate`.
3. `src/lib/schemas/productos.ts`: agregar `marca: z.string().trim().max(80).optional().nullable()` en `crearProductoSchema` y `editarProductoSchema`.
4. `src/services/productos.service.ts`: agregar `marca: string | null` a `ProductoDTO`, seleccionarlo en los `select(...)`, mapearlo en `mapProductoRow` y guardarlo en `crearProducto` / `editarProducto`.
5. `src/components/productos/producto-dialogs.tsx`: agregar el `Input` de Marca en el modal.
6. `src/components/productos/productos-view.tsx`: agregar `<TableHead>Marca</TableHead>` y `<TableCell>{p.marca ?? "—"}</TableCell>`.

### Cambio 2: Agregar «Mercado Pago» como medio de pago de la cuenta corriente
1. `src/db/schema.ts`: en `pagos.medio`, agregar `"mercado_pago"` al array `enum: ["efectivo", "transferencia", "tarjeta_debito", "mercado_pago"]`.
2. `src/lib/constants.ts`: en `MEDIOS_PAGO_LABELS`, agregar `mercado_pago: "Mercado Pago"`.
3. `src/lib/schemas/pagos.ts`: agregar `"mercado_pago"` al `z.enum(...)` de `registrarPagoSchema`.
4. `src/services/pagos.service.ts`: agregar `"mercado_pago"` al tipo `medio` de `PagoDTO`.
5. `src/components/clientes/cliente-dialogs.tsx`: agregar `{ value: "mercado_pago", label: "Mercado Pago" }` a `MEDIOS_OPCIONES` (y cambiar `grid-cols-3` a `grid-cols-2`).

### Cambio 3: Impedir que una venta tenga más de 50 unidades de un mismo producto
1. `src/lib/schemas/facturas.ts`: en `facturaItemInputSchema`, cambiar `cantidad`:
   ```ts
   cantidad: z.coerce
     .number()
     .int("La cantidad debe ser entera.")
     .positive("La cantidad debe ser mayor que cero.")
     .max(50, "Máximo 50 unidades por producto en una misma venta."),
   ```
2. Listo: como el esquema es compartido, valida automáticamente en **Nueva venta** y en `POST /api/facturas` (`422 VALIDACION`).

### Cambio 4: Exigir que el teléfono de un cliente tenga al menos 8 dígitos, en el formulario y en el servidor
1. `src/lib/schemas/clientes.ts`: reemplazar `telefono: optionalText` por:
   ```ts
   telefono: z
     .string()
     .trim()
     .refine(
       (v) => v.replace(/\D/g, "").length >= 8,
       "El teléfono debe tener al menos 8 dígitos."
     ),
   ```
   (En `editarClienteSchema`, agregar `.optional()` al final.)
2. Como el esquema se comparte entre `ClienteFormDialog` y `clientes.service.ts`, la validación aplica automáticamente en ambos lados.

### Cambio 5: Agregar una columna al listado de facturas
1. Si el dato ya viene en `FacturaResumenDTO` (ej. `id` o `puntoVenta`), solo editar `src/components/ventas/facturas-view.tsx` agregando `<TableHead>` y `<TableCell>`.
2. Si requiere un dato nuevo (ej. cantidad de ítems), agregarlo en la consulta de `listarFacturas()` en `src/services/facturas.service.ts` y en `FacturaResumenDTO`, y luego mostrarlo en `facturas-view.tsx`.

### Cambio 6: Cambiar el punto de venta de la numeración a `0002`
1. En `.env` (y en Vercel si está en producción), cambiar:
   ```env
   COMERCIO_PUNTO_VENTA="2"
   ```
2. Reiniciar el servidor (`pnpm run dev`). `COMERCIO.puntoVenta` (`src/lib/constants.ts`) y `formatNumeroFactura(2, numero)` (`src/lib/format.ts`) numerarán automáticamente como `0002-00000001`.
