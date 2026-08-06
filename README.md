# Finanzas Personales - Gestor Financiero con Asistente IA

Sistema web completo para la gestión de finanzas personales con un asistente inteligente integrado. Desarrollado delegando la programación operativa a agentes autónomos de IA.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Backend | Node.js + Express |
| Base de Datos | SQLite (better-sqlite3) |
| Autenticación | JWT + bcryptjs |
| Chatbot | Ollama (llama3.2) - Integración directa vía API REST |
| MCP | Filesystem Server + Database Server |

---

## 10 Casos de Uso

| # | Caso de Uso | Estado | Endpoint |
|---|------------|--------|----------|
| 1 | **Registro y autenticación** - Crear cuenta e iniciar sesión con JWT | ✅ | `POST /api/users/register`, `POST /api/users/login` |
| 2 | **Agregar transacción** - Registrar ingreso/gasto con categoría, monto, fecha y descripción | ✅ | `POST /api/transactions` |
| 3 | **CRUD categorías** - Crear, editar y eliminar categorías personalizadas con color | ✅ | `GET/POST/PUT/DELETE /api/categories` |
| 4 | **Dashboard con gráficos** - Balance mensual, gastos por categoría (torta), evolución mensual (barras) | ✅ | `GET /api/transactions/dashboard` |
| 5 | **Presupuesto mensual** - Definir presupuesto por categoría de gasto con barra de progreso y alertas | ✅ | `GET/POST/PUT/DELETE /api/budgets` |
| 6 | **Metas de ahorro** - Crear meta, depositar dinero, ver progreso en porcentaje | ✅ | `GET/POST/DELETE /api/savings`, `POST /api/savings/:id/deposit` |
| 7 | **Alertas automáticas** - Detecta cuando un presupuesto se excede (rojo) o llega al 80% (amarillo) | ✅ | `GET /api/alerts`, `POST /api/alerts/check` |
| 8 | **Búsqueda y filtros** - Filtrar transacciones por tipo, categoría, rango de fechas y texto | ✅ | `GET /api/transactions?type=&category_id=&start_date=&end_date=&search=` |
| 9 | **Exportar reportes CSV** - Descargar transacciones filtradas como archivo CSV | ✅ | `GET /api/export/csv` |
| 10 | **Chatbot asesor financiero** - Consultar finanzas personales con asistente IA vía Ollama (integración directa API REST) | ✅ | `POST /api/chatbot/message` |

**Cobertura: 10/10 casos de uso implementados y funcionales.**

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Dashboard │ │Transacc. │ │Categorías│ │ Presupuestos  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────────────┐ ┌───────────────────┐   │
│  │  Metas   │ │ ChatBot Flotante │ │ Export CSV        │   │
│  └──────────┘ └──────────────────┘ └───────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (proxy Vite)
┌─────────────────────────▼───────────────────────────────────┐
│                 Backend (Node.js + Express)                   │
│  ┌───────┐ ┌──────┐ ┌──────────┐ ┌────────┐ ┌──────────┐   │
│  │ Users │ │  Cat │ │ Transac. │ │Budget  │ │ Savings  │   │
│  └───────┘ └──────┘ └──────────┘ └────────┘ └──────────┘   │
│  ┌───────┐ ┌────────────────┐ ┌────────────────────┐       │
│  │Alerts │ │ Export CSV     │ │ Chatbot (Ollama API) │       │
│  └───────┘ └────────────────┘ └─────────┬──────────┘       │
└──────────────────────────────────────────┼──────────────────┘
                                           │ HTTP
                                  ┌────────▼────────┐
                                  │  Ollama (llama3.2) │
                                  └─────────────────┘
┌──────────────────────────────────────────────────────────────┐
│                    MCP Servers                                │
│  ┌─────────────────┐  ┌──────────────────────────────────┐   │
│  │ Filesystem Server │  │      Database Server (SQLite)   │   │
│  └─────────────────┘  └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

1. El usuario interactúa con el frontend React
2. Las peticiones pasan por el proxy de Vite hacia el backend Express
3. El backend procesa la lógica de negocio contra SQLite
4. El chatbot se comunica con Ollama (local) para generar respuestas contextuales
5. Los MCP servers permiten al agente de IA acceder al filesystem y la base de datos durante el desarrollo

---

## Model Context Protocol (MCP)

Se integraron **2 servidores MCP**, cumpliendo con el mínimo requerido:

### 1. Filesystem Server (Externo)
- **Fuente:** Externo (`@modelcontextprotocol/server-filesystem`)
- **Rol:** Permite al agente IA leer/escribir archivos del proyecto, exportar CSVs y gestionar archivos de configuración
- **Comando:** `npx -y @modelcontextprotocol/server-filesystem`

### 2. Database Server (Externo)
- **Fuente:** Externo (`@modelcontextprotocol/server-sqlite`)
- **Rol:** Permite al agente IA consultar directamente la base de datos SQLite para análisis y debugging
- **Comando:** `npx -y @modelcontextprotocol/server-sqlite`

**Configuración en `opencode.json`:**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "RUTA_DEL_PROYECTO"]
    },
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite", "RUTA/finanzas.db"]
    }
  }
}
```

---

## Chatbot Integrado (Ollama - Integración Directa)

El asistente financiero está integrado como un **componente flotante** accesible desde cualquier página.

### Características
- **Memoria conversacional:** Recuerda el contexto de la conversación (últimos 20 mensajes)
- **Contexto financiero:** El prompt del sistema incluye resumen de ingresos/gastos, últimas transacciones y metas de ahorro
- **Modelo:** Llama 3.2 vía Ollama (local, gratuito)
- **Interfaz:** Modal flotante con burbujas de chat, indicador de escritura y botón para reiniciar

### Funcionamiento
1. El usuario envía un mensaje desde el frontend
2. El backend construye un prompt contextual con datos reales del usuario
3. El prompt se envía a Ollama via HTTP (`http://localhost:11434/api/generate`)
4. La respuesta se renderiza en el chat y se guarda en el historial

### Instalación de Ollama
```bash
# Descargar e instalar Ollama desde https://ollama.com
# Luego descargar el modelo:
ollama pull llama3.2
```

---

## AI Engineering - Justificación del Proceso

### Metodología de Desarrollo

El desarrollo se realizó mediante **iteraciones asistidas por IA**, estructurando el sistema en capas:

1. **Definición de requerimientos:** Se establecieron 10 casos de uso funcionales antes de escribir código
2. **Arquitectura primero:** Se definió el stack, la estructura de carpetas y el esquema de BD
3. **Backend primero:** Cada caso de uso se implementó primero como endpoint REST
4. **Frontend después:** Se construyó la interfaz consumiendo los endpoints ya funcionales
5. **Verificación continua:** Cada endpoint se probó antes de pasar al siguiente

### Prompts Clave Utilizados

| Propósito | Prompt |
|-----------|--------|
| Definición inicial | "Quiero un gestor de finanzas personales con React y Node.js" |
| Estructura de BD | Necesito SQLite con tablas para users, categories, transactions, budgets, savings_goals, alerts |
| Autenticación | "Implementar JWT con bcryptjs, rutas de register y login" |
| Dashboard | "Endpoint de dashboard que devuelva balance, gastos por categoría, evolución mensual" |
| Chatbot | "Chatbot con Ollama, memoria conversacional, contexto financiero del usuario" |
| MCP | "Configurar servidores MCP de filesystem y database" |

### Loops de Autocorrección

Durante el desarrollo se identificaron y corrigieron automáticamente:

1. **Error de relación:** Al eliminar categorías con transacciones asociadas → Se agregó validación con conteo previo
2. **Chatbot sin conexión:** Si Ollama no está corriendo → Se agregó manejo de error con mensaje amigable
3. **Presupuestos duplicados:** Se validó que no exista un presupuesto para la misma categoría y mes
4. **Fechas en dashboard:** Las consultas mensuales se ajustaron para usar `strftime` de SQLite

### Estructura de Instrucciones del Sistema (`.opencode/instructions.md`)

Se definió un archivo de reglas de contexto con:
- Stack tecnológico y arquitectura
- Patrones de diseño a seguir
- Reglas de estilo de código
- Flujo de iteración
- Configuración de MCP

---

## Instalación y Ejecución

### Requisitos
- Node.js 18+
- npm
- Ollama (para el chatbot - opcional)

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Chatbot (Ollama)
```bash
# Instalar Ollama desde https://ollama.com
ollama pull llama3.2
# El backend se conecta automáticamente en http://localhost:11434
```

### Acceso
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Con Docker
```bash
docker compose up --build
```
- App: http://localhost:3001
- El contenedor `ollama` descarga el modelo `llama3.2` en el primer arranque (puede tardar)

---

## Estructura del Proyecto

```
TP/
├── backend/
│   ├── src/
│   │   ├── routes/          # users, categories, transactions, budgets, savings, alerts, export, chatbot
│   │   ├── middleware/       # JWT authentication
│   │   ├── db.js            # SQLite connection + schema
│   │   └── server.js        # Express entry point
│   ├── .env                 # Config (JWT_SECRET, PORT)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # AuthContext, Layout, ChatBot
│   │   ├── pages/           # Login, Register, Dashboard, Transactions, Categories, Budgets, Savings
│   │   ├── api/             # API client helper
│   │   ├── App.jsx          # Router setup
│   │   └── main.jsx         # Entry point
│   └── package.json
├── .opencode/
│   └── instructions.md      # AI Engineering context rules
├── opencode.json            # MCP server configuration
└── README.md                # Documentation
```
