# GuayCampo

Sistema integral de gestión para acopiadores de granos — turnos, balanza, laboratorio y silos.

## Stack

| Capa | Tecnología |
|------|-----------|
| Monorepo | Turborepo + npm workspaces |
| Backend | NestJS 10 (TypeScript) |
| Frontend | Next.js 15 (App Router) |
| Mobile | Flutter (scaffold) |
| ORM | Prisma 5 + PostgreSQL 17 |
| Cache/Queue | Redis 7 + BullMQ |
| Real-time | Socket.io |
| Mensajería IoT | EMQX (MQTT) |
| Linting | ESLint + Prettier |
| Testing | Jest + Supertest |

## Estructura

```
guaycampo/
├── apps/
│   └── web/                   # Next.js 15 — dashboard web
├── services/
│   ├── auth/                  # NestJS — autenticación JWT
│   └── shifts/                # NestJS — turnos, cola, camiones
├── packages/
│   ├── shared-types/          # Tipos TypeScript compartidos
│   ├── shared-events/         # Esquemas de eventos Kafka/mensajería
│   └── database/              # Prisma schema + cliente compartido
├── infrastructure/
│   └── docker/                # Docker Compose para desarrollo
├── turbo.json
├── package.json               # Workspace raíz
├── tsconfig.base.json
└── .env.example
```

## Requisitos previos

- Node.js >= 20
- npm >= 10
- Docker + Docker Compose

## Setup inicial

### 1. Clonar y configurar variables de entorno

```bash
git clone <repo>
cd guaycampo
cp .env.example .env
# Editar .env con tus valores
```

### 2. Levantar infraestructura local

```bash
cd infrastructure/docker
docker compose up -d
```

Servicios disponibles:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- EMQX Dashboard: http://localhost:18083
- Adminer (DB GUI): http://localhost:8080
- Redis Commander: http://localhost:8081

### 3. Instalar dependencias

```bash
npm install
```

### 4. Generar cliente Prisma y migrar base de datos

```bash
npm run db:generate
npm run db:migrate
```

### 5. Iniciar todos los servicios en modo desarrollo

```bash
npm run dev
```

O por separado:
```bash
# Solo web
cd apps/web && npm run dev

# Solo auth service
cd services/auth && npm run dev

# Solo shifts service
cd services/shifts && npm run dev
```

## Scripts disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia todos los workspaces en modo watch |
| `npm run build` | Compila todos los workspaces |
| `npm run lint` | Ejecuta ESLint en todos los workspaces |
| `npm run test` | Ejecuta tests en todos los workspaces |
| `npm run type-check` | Verificacion de tipos TypeScript |
| `npm run format` | Formatea el codigo con Prettier |
| `npm run db:generate` | Genera cliente Prisma |
| `npm run db:migrate` | Ejecuta migraciones de base de datos |
| `npm run db:studio` | Abre Prisma Studio |

## Servicios

### Auth Service (puerto 3001)

- `POST /api/auth/login` — Login con email/password
- `POST /api/auth/register` — Registro de usuario
- `POST /api/auth/refresh` — Renovar access token
- `GET /api/auth/me` — Perfil del usuario actual
- Swagger: http://localhost:3001/api/docs

### Shifts Service (puerto 3002)

- `GET/POST /api/shifts` — Turnos del dia
- `GET/POST/PUT /api/trucks` — Camiones registrados
- `GET/POST /api/queue` — Cola de espera
- Swagger: http://localhost:3002/api/docs

### Web App (puerto 3000)

- `/login` — Pantalla de acceso
- `/dashboard` — Panel principal con KPIs
- `/dashboard/shifts` — Gestion de turnos
- `/dashboard/queue` — Cola en tiempo real

## Packages compartidos

### `@guaycampo/shared-types`

Tipos TypeScript para todas las entidades del sistema: `ITruckShift`, `IScaleTicket`, `ILabSample`, `ISilo`, etc. y todos los enums.

### `@guaycampo/shared-events`

Tipos de eventos para mensajeria: `TruckCheckedInEvent`, `WeighingCompletedEvent`, `LabSampleApprovedEvent`, etc. Con factory helper `createEvent()`.

### `@guaycampo/database`

Cliente Prisma preconfigurado con singleton pattern. Exporta el cliente y todos los tipos generados.

## Variables de entorno clave

Ver `.env.example` para la lista completa. Las mas importantes:

```env
DATABASE_URL="postgresql://guaycampo:password@localhost:5432/guaycampo_dev"
REDIS_URL=redis://localhost:6379
JWT_SECRET=tu-secreto-muy-seguro
JWT_REFRESH_SECRET=tu-refresh-secreto-muy-seguro
AUTH_SERVICE_PORT=3001
SHIFTS_SERVICE_PORT=3002
```

## Convencion de branches

- `main` — produccion estable
- `develop` — integracion continua
- `feature/<nombre>` — nuevas funcionalidades
- `fix/<nombre>` — correcciones
- `chore/<nombre>` — mantenimiento

## Licencia

Propietario — GuayCampo © 2024
