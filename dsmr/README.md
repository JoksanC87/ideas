# Design System Maturity Radar (DSMR)

Plataforma multi-tenant para evaluar la madurez de Design Systems en empresas enterprise. Diagnóstico, benchmarking, seguimiento continuo y generación de reportes.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend + API | Next.js 15 (App Router) + TypeScript |
| Base de datos | PostgreSQL vía Prisma + RLS multi-tenant |
| Auth | Supabase Auth (magic link / OAuth) |
| Storage | Supabase Storage o Google Cloud Storage |
| AI | Anthropic Claude (análisis de evidencia + gate) |
| Charts | Recharts |
| Validación | Zod |
| UI | Tailwind CSS + componentes propios |

## Setup completo (Supabase + Vercel)

### 1. Clonar el repo

```bash
git clone https://github.com/joksanc87/ideas
cd ideas/dsmr
npm install
```

### 2. Crear proyecto en Supabase

1. [supabase.com](https://supabase.com) → New project → anota la contraseña de DB
2. Espera ~2 minutos a que el proyecto esté listo

### 3. Obtener credenciales de Supabase

| Variable | Dónde encontrarla en Supabase |
|----------|-------------------------------|
| `DATABASE_URL` | Settings → Database → **Connection pooling** → Transaction mode (puerto 6543) |
| `DIRECT_URL` | Settings → Database → **Direct connection** URI (puerto 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public key |

### 4. Configurar variables de entorno

```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase
```

### 5. Correr migraciones y seed

```bash
# Genera el cliente Prisma
npx prisma generate

# Crea las tablas (usa DIRECT_URL)
npx prisma migrate dev --name init

# Aplica RLS (política de aislamiento multi-tenant)
npx prisma migrate dev

# Carga el modelo de madurez v1 (177 preguntas) + datos demo
npx prisma db seed
```

### 6. Configurar Supabase Auth

En el dashboard de Supabase:
1. **Authentication → Providers → Email** → habilitar "Enable Email provider"
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) / `https://tu-dominio.vercel.app` (prod)
   - Redirect URLs: agregar `http://localhost:3000/auth/callback` y `https://tu-dominio.vercel.app/auth/callback`
3. **Authentication → Users** → "Invite user" con el mismo email que pusiste en `DEMO_EMAIL`

### 7. Correr en desarrollo

```bash
npm run dev
# Abre http://localhost:3000
# Te redirige a /login → ingresa el email del usuario demo
# Supabase envía un magic link → haz clic → accedes al dashboard
```

---

## Deploy en Vercel

### 1. Importar el proyecto

1. [vercel.com](https://vercel.com) → Add New Project → Import Git Repository
2. Selecciona `joksanc87/ideas`
3. **Root Directory**: cambia a `dsmr`
4. Framework: Next.js (auto-detectado)

### 2. Variables de entorno en Vercel

En la pantalla de configuración del proyecto (o Settings → Environment Variables), agrega:

```
DATABASE_URL          = [Pooler connection string de Supabase]
DIRECT_URL            = [Direct connection string de Supabase]
NEXT_PUBLIC_SUPABASE_URL    = https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
ANTHROPIC_API_KEY     = sk-ant-... (opcional)
AI_MODEL              = claude-sonnet-4-6
DEMO_EMAIL            = admin@tudominio.com
```

### 3. Configurar Redirect URL en Supabase para producción

Authentication → URL Configuration → Redirect URLs → añadir:
`https://tu-app.vercel.app/auth/callback`

### 4. Deploy

Clic en **Deploy** — Vercel construye y despliega automáticamente.
Cada push a la rama `main` dispara un re-deploy.

---

## Arquitectura multi-tenant

```
Organization
  └── User (via Membership + Role)
  └── Company
        └── Assessment
              ├── Responses (por pregunta del modelo)
              ├── Evidence (archivos / URLs / integraciones)
              ├── Scores (histórico por snapshot)
              └── Recommendations (generadas por scoring engine + AI)
```

RLS aísla los datos por `orgId` en cada transacción usando `set_config('app.current_org', orgId)`.

## Roles y permisos

| Rol | Acceso |
|-----|--------|
| `SUPER_ADMIN` | Todo |
| `ORG_ADMIN` | Gestión completa de su organización |
| `DS_LEAD` | Responder, revisar, validar, cerrar assessments |
| `DESIGNOPS` | Responder, ver métricas |
| `DESIGNER` | Responder preguntas de diseño |
| `ENGINEER` | Responder preguntas técnicas |
| `PM` | Ver resultados ejecutivos |
| `AUDITOR` | Responder, validar evidencia, generar reportes |

## Dimensiones evaluadas (10)

| Código | Dimensión | Peso |
|--------|-----------|------|
| A | Estrategia, visión y alineación con negocio | 8% |
| B | Gobernanza, operating model y equipo core | 10% |
| C | Adopción y uso real por equipos | 12% |
| D | Foundations, tokenización y arquitectura semántica | 14% |
| E | Componentes, patrones y arquitectura técnica | 12% |
| F | Documentación, enablement y experiencia de uso | 10% |
| G | Calidad, testing, accesibilidad y validación | 12% |
| H | Métricas, observabilidad e impacto | 10% |
| I | Integración con procesos, automatización y AI | 8% |
| J | Mantenimiento, evolución y sostenibilidad | 4% |

## Scripts

```bash
npm run dev          # Desarrollo local
npm run build        # Build de producción
npm run lint         # ESLint
npx tsc --noEmit     # Type check
npx prisma studio    # GUI de la base de datos
npx prisma db seed   # Recargar datos demo
```

## Variables de entorno requeridas

Ver `.env.example` para la lista completa con instrucciones de dónde obtener cada valor.
