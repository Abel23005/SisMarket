# SisMarket

Sistema web para gestionar inventario, ventas, turnos de caja, proveedores y órdenes de compra de un minimarket. El frontend usa React y Vite; la API usa NestJS, TypeORM y PostgreSQL.

## Iniciar en local

Requisitos: Node.js 20 o superior y Docker Desktop.

1. Inicia PostgreSQL y Redis:

   ```bash
   docker compose up -d
   ```

2. Configura el backend y arráncalo:

   ```bash
   cd backend
   copy .env.example .env
   npm install
   npm run start:dev
   ```

   La API queda en `http://localhost:3000/api`. Las migraciones se ejecutan al iniciar. En desarrollo, el seed crea datos de muestra si la base está vacía.

3. Arranca el frontend en otra terminal:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Abre `http://localhost:5173/login`.

## Usuarios locales de muestra

Solo se crean cuando `NODE_ENV=development` y no hay usuarios existentes. Cambia estas contraseñas antes de usar cualquier despliegue compartido.

| Rol | Usuario | Contraseña |
|---|---|---|
| Dueño | `juan.perez` | `admin123` |
| Cajero | `maria.lopez` | `cajero123` |
| Almacenero | `carlos.ruiz` | `almacen123` |

## Funciones disponibles

- Inicio de sesión con JWT y control de acceso por rol.
- Sesiones revocables al cerrar sesión y auditoría por negocio de accesos correctos/fallidos, IP y navegador (visible para el dueño).
- Inventario: búsqueda, registro y edición de productos, stock mínimo, exportación y movimientos de existencias.
- Punto de venta: descuento transaccional de stock, registro por método de pago y asociación obligatoria a un turno abierto.
- Caja: apertura, cierre, diferencia de efectivo e historial de turnos.
- Proveedores y órdenes de compra: creación, recepción y actualización transaccional del inventario.
- Reportes, dashboard y consultas al asistente Gemini cuando se configura su clave.
- Reportes con rango de fechas real, ventas agrupadas por mes y categoría, top de productos y exportación CSV o impresión a PDF.
- Perfil de empresa guardado en PostgreSQL.
- Aislamiento de usuarios, inventario, ventas, caja, compras e invitaciones por negocio. Cada minimarket puede crear su espacio y administrar su propio equipo.
- Invitaciones de un solo uso con vencimiento; el enlace se copia y se comparte manualmente porque no hay servicio de correo configurado.
- Administración de usuarios por negocio: roles, activación, invitaciones y cambio de contraseña con mínimo de 12 caracteres. Los hashes y los IDs internos de Supabase Auth se excluyen de las respuestas de usuarios relacionadas a ventas y caja.
- Boletas y facturas: captura de datos del cliente y emisión manual o automática por Nubefact cuando se configuran sus credenciales.

Los pagos con Yape y Plin se registran como confirmados manualmente. Las ventas con tarjeta usan Culqi Checkout: el navegador tokeniza la tarjeta y el backend calcula y cobra el total del carrito. Si Culqi no confirma la respuesta, la venta queda pendiente y el dueño puede verificar el cargo por su ID contra la API de Culqi o anularla tras comprobar que no hubo cobro. Los planes mensuales también usan Culqi: el dueño acepta expresamente las renovaciones, el backend registra la suscripción y consulta sus cambios mediante la API y el webhook configurado. La integración requiere credenciales, los tres planes creados en Culqi y validación en ambiente de prueba antes de producción. Una constancia impresa por SisMarket no equivale a un comprobante electrónico aceptado por SUNAT; el panel muestra el estado que devuelve Nubefact.

## Configuración de base de datos

Por defecto, el backend se conecta al PostgreSQL local de Docker con `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` y `DB_DATABASE`. Para un proveedor administrado se puede usar `DATABASE_URL` y activar `DB_SSL=true` cuando el proveedor lo requiera. Mantén las claves fuera del repositorio.

Las migraciones versionadas crean el esquema base y las tablas de compras, movimientos de inventario, perfil, invitaciones, alertas persistentes y sesiones/auditoría de acceso. También agregan las llaves Culqi por negocio y estado/identificador del cargo. `synchronize` está desactivado; los cambios al esquema deben entrar mediante una migración. La migración de sesiones invalida tokens de versiones anteriores; al desplegarla, los usuarios tendrán que volver a iniciar sesión.

La migración `EnableTenantRowSecurity` agrega políticas RLS por negocio y rol en las tablas de operación. Para ejecutarla en Supabase, aplica las migraciones usando el usuario propietario y luego configura el backend con el rol restringido definido en [supabase-runtime-role.sql](backend/src/database/supabase-runtime-role.sql). Ese rol debe tener `NOBYPASSRLS`, no ser propietario de las tablas y usar `DB_RLS_CONTEXT=true`; las migraciones de runtime deben quedar desactivadas con `DB_MIGRATIONS_RUN=false`. Nunca uses `service_role` ni la conexión `postgres` como conexión habitual de la aplicación: esos roles pueden omitir RLS.

Para aplicar el esquema manualmente: configura temporalmente `DATABASE_URL` con la conexión propietaria, pon `DB_MIGRATIONS_RUN=false`, ejecuta `pnpm --dir backend run build` y `pnpm --dir backend run migration:run`; después cambia `DATABASE_URL` a `sismarket_runtime`, deja `DB_MIGRATIONS_RUN=false` y activa `DB_RLS_CONTEXT=true`.

### Conectar SisMarket a Supabase

El esquema ya aplicado incluye las tablas y las políticas RLS. Para conectar el backend, ejecuta una sola vez `backend/src/database/supabase-runtime-role.sql` desde el SQL Editor como propietario, reemplazando el marcador de contraseña por una contraseña única que no compartas. Luego copia `backend/.env.example` a `backend/.env` y completa `DATABASE_URL` con la cadena **Session pooler** de Supabase, usando el usuario `sismarket_runtime.<PROJECT_REF>` y el host exacto que muestra el panel. Para este proyecto, la referencia es `bnpfacvllsezgttuiztz` y el pooler visible es `aws-1-us-west-2.pooler.supabase.com`; usa puerto `5432` y base `postgres`. Codifica en URL cualquier carácter reservado de la contraseña. El certificado público de Supabase está en `backend/supabase-ca.crt`; configura `DB_SSL=true`, `DB_SSL_CA_CERT=./supabase-ca.crt`, `DB_MIGRATIONS_RUN=false` y `DB_RLS_CONTEXT=true`. No agregues `sslmode` a la URL cuando se configura el certificado de esta forma. Supabase Data API no hace falta para esta arquitectura: el frontend llama a NestJS y NestJS usa PostgreSQL.

## Variables de integraciones

- `GEMINI_API_KEY`: habilita el asistente.
- Supabase Auth opcional: define `SUPABASE_AUTH_ENABLED=true`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` solo en el backend. Las nuevas cuentas se crean en Supabase Auth; las cuentas existentes se migran al primer inicio de sesión correcto usando su hash local, tras lo cual el backend elimina ese hash local. No publiques la llave `service_role` en el frontend.
- `APP_ENCRYPTION_KEY`: clave de 32 bytes en hexadecimal para cifrar las llaves secretas de Nubefact y Culqi por negocio. Genera una con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y conserva la misma clave en producción.
- El dueño configura la llave pública `pk_test_...` y la llave secreta `sk_test_...` de su cuenta Culqi en Datos de la Empresa. La llave secreta se cifra con `APP_ENCRYPTION_KEY`; las llaves deben ser ambas de prueba o ambas de producción. Usa tarjetas de prueba antes de activar llaves reales.
- Cada negocio puede guardar su token Nubefact cifrado en el perfil; `NUBEFACT_API_URL` define el endpoint compartido. `NUBEFACT_TOKEN` sirve como compatibilidad para una instalación de un solo negocio.
- Configura la serie y el siguiente número de boleta y factura en el perfil del negocio antes de emitir documentos.
- `NUBEFACT_AUTO_SEND=false` deja la emisión bajo acción manual desde el punto de venta.
- `NUBEFACT_SEND_TO_SUNAT=false` controla el envío automático a SUNAT desde Nubefact; actívalo solo después de configurar y validar credenciales de producción.
- Suscripciones del SaaS: crea en Culqi un plan mensual por cada tarifa (Básico S/49, Estándar S/89 y Premium S/149), luego configura `CULQI_BILLING_PUBLIC_KEY`, `CULQI_BILLING_SECRET_KEY` y sus IDs `CULQI_PLAN_BASICO`, `CULQI_PLAN_ESTANDAR`, `CULQI_PLAN_PREMIUM`. Las llaves deben pertenecer al mismo ambiente y los IDs comenzar con `pln_test_` o `pln_live_` según corresponda. `CULQI_WEBHOOK_SECRET` debe ser un valor aleatorio de al menos 32 caracteres; registra la URL `/api/subscriptions/webhook/<secreto>` en el panel de eventos de Culqi.
- `TRUST_PROXY=true` habilita la lectura de la IP enviada por un proxy inverso de un salto. Actívalo solo cuando la API esté detrás de ese proxy confiable; de lo contrario, conserva `false`.
- `SUBSCRIPTION_ENFORCEMENT=true` aplica permisos Basic/Estándar/Premium en la API. Déjalo desactivado en desarrollo; actívalo en producción una vez configurados los planes de Culqi.

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar y revocar la sesión actual |
| GET | `/api/auth/audit` | Consultar los últimos 100 eventos de acceso (dueño) |
| POST | `/api/auth/register-business` | Registrar un minimarket y su dueño |
| POST | `/api/auth/accept-invitation` | Crear cuenta desde una invitación vigente |
| GET/PATCH | `/api/business-profile` | Consultar y guardar datos de empresa |
| GET/POST/PATCH | `/api/products` | Consultar, crear y editar productos |
| GET | `/api/products/:id/movements` | Ver historial de stock |
| GET/POST | `/api/sales` | Consultar y registrar ventas |
| GET | `/api/sales/report?from=AAAA-MM-DD&to=AAAA-MM-DD` | Consultar ventas completadas del periodo elegido (dueño) |
| POST | `/api/sales/:id/emit-document` | Emitir boleta o factura por Nubefact |
| GET | `/api/payments/culqi/config` | Consultar llave pública y disponibilidad del checkout del negocio |
| POST | `/api/sales/:id/confirm-payment` | Verificar con Culqi el cargo de una venta pendiente (dueño) |
| POST | `/api/sales/:id/cancel-pending-payment` | Anular una venta pendiente y liberar stock tras verificar que no hubo cobro (dueño) |
| GET | `/api/subscriptions/catalog` | Consultar planes y disponibilidad del cobro recurrente |
| GET | `/api/subscriptions/me` | Consultar la suscripción del negocio |
| POST | `/api/subscriptions` | Contratar un plan mensual con token de Culqi Checkout |
| POST | `/api/subscriptions/refresh` | Verificar el estado actual con Culqi |
| POST | `/api/subscriptions/cancel` | Cancelar la renovación automática en Culqi |
| POST | `/api/subscriptions/webhook/:secret` | Recibir eventos de suscripción; requiere el secreto configurado |
| POST | `/api/cash-register/open` | Abrir turno de caja |
| PATCH | `/api/cash-register/:id/close` | Cerrar turno de caja |
| GET/POST | `/api/purchase-orders` | Consultar y crear órdenes de compra |
| PATCH | `/api/purchase-orders/:id/receive` | Recibir orden y aumentar stock |
| GET/POST | `/api/invitations` | Listar y crear invitaciones (dueño) |
| PATCH | `/api/users/:id/password` | Cambiar la contraseña de una cuenta del negocio (dueño) |
| GET | `/api/alerts` | Consultar alertas de stock pendientes |
| GET | `/api/alerts/history` | Consultar historial de alertas de stock |

Antes de desplegar migraciones en una base que ya tenga datos, crea y verifica una copia de seguridad. Las migraciones agregan el aislamiento por negocio y asignan los registros existentes al minimarket ya configurado.
