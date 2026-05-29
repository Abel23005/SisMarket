# SisMarket

Sistema de gestión operativa para minimarkets. Proyecto inicial con backend **NestJS + PostgreSQL + JWT** y frontend **React + Vite + Tailwind**, alineado al diseño de [Figma Make](https://event-chew-63140427.figma.site/login).

## Estructura

```
SisMarket/
├── backend/          # API NestJS (puerto 3000)
├── frontend/         # Panel React (puerto 5173)
└── docker-compose.yml
```

## Requisitos

- Node.js 20+
- Docker Desktop (PostgreSQL y Redis)

## Inicio rápido

### 1. Base de datos

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # si no existe .env
npm install
npm run start:dev
```

La API queda en `http://localhost:3000/api`. Al arrancar se crean usuarios y productos de prueba.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173/login`.

## Usuarios de prueba

| Rol         | Usuario      | Contraseña  |
|------------|--------------|-------------|
| Dueño      | juan.perez   | admin123    |
| Cajero     | maria.lopez  | cajero123   |
| Almacenero | carlos.ruiz  | almacen123  |

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor |
| POST | `/api/auth/login` | Iniciar sesión (JWT) |
| POST | `/api/auth/register` | Registro |
| GET | `/api/products` | Listar productos (auth) |
| POST | `/api/sales` | Registrar venta |
| POST | `/api/cash-register/open` | Abrir caja |
| PATCH | `/api/cash-register/:id/close` | Cerrar caja |

## Base de datos

Tablas principales:

- **users** — usuarios y roles (`dueno`, `cajero`, `almacenero`)
- **products** — inventario
- **sales** / **sale_items** — ventas y detalle
- **cash_sessions** — apertura/cierre de caja

## Próximos pasos (según tu plan)

1. Pantallas del panel (POS, reportes, almacén) según Figma
2. Redis en producción para caché de consultas frecuentes
3. AWS (EC2, RDS, S3, Elastic Beanstalk)
4. App Flutter para el dueño
5. Integraciones: Culqi, SUNAT OSE, OpenAI

## Stack

- **Backend:** NestJS, TypeORM, PostgreSQL, JWT, cache en memoria (Redis listo en Docker)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4, Axios, React Router
- **DevOps:** Docker Compose, GitHub Actions (pendiente)
