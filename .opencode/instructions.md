# Instrucciones de AI Engineering - Finanzas Personales

## Stack Tecnológico
- Backend: Node.js + Express + SQLite (better-sqlite3)
- Frontend: React + Vite + Tailwind CSS
- Autenticación: JWT (bcryptjs + jsonwebtoken)
- Chatbot: Microservicio Python `ai/` con FastAPI + LangChain (ChatOllama + OllamaEmbeddings) + Ollama (llama3.2, nomic-embed-text)
- RAG: Indexado híbrido (transacciones + resúmenes mensuales + presupuestos + metas + alertas + base de conocimiento) en vector store con wrapper `VectorStoreProvider` (hoy InMemoryVectorStore, migrable a ChromaDB)
- MCP: Filesystem + Database servers

## Arquitectura
- API REST full en Express (puerto 3001)
- Microservicio IA FastAPI en `ai/` (puerto 3002) con rutas `/chatbot/message` y `/chatbot/clear`, verifica el mismo JWT y lee el mismo `finanzas.db`
- Frontend SPA con React Router
- Chatbot flotante accesible desde cualquier página
- Comunicación via HTTP (fetch) con proxy de Vite: `/api` → 3001, `/ai` → 3002

## Patrones de Diseño
1. Rutas Express separadas por recurso (users, categories, transactions, etc.)
2. Middleware de autenticación JWT reusable
3. Estado global con React Context (useAuth)
4. API helper centralizado en /src/api/index.js
5. Componentes modulares con props tipadas
6. Lógica del chatbot homologada en Python: capas `rag/` (embeddings, llm, vector_store, indexer, retriever) + orquestación en `chatbot.py`
7. Vector store detrás de una interfaz (`VectorStoreProvider`) para poder cambiar de implementación sin tocar el resto

## Reglas de Desarrollo
1. No agregar comentarios explicativos en el código
2. Usar arrow functions para componentes React
3. Nombres en inglés para variables/funciones, español para UI
4. Manejo de errores con try/catch y mensajes en español
5. Todas las respuestas del backend en español
6. El seed de la DB se ejecuta con `npm run seed` en backend/

## Flujo de Iteración
1. Entender requerimiento
2. Implementar backend (ruta + lógica BD)
3. Verificar con prueba manual (curl/navegador)
4. Implementar frontend (página/componente)
5. Verificar integración completa
6. Corregir errores si los hay

## MCP Servers Configurados
- Filesystem: Acceso al sistema de archivos para exportar CSV
- Database: Conexión directa a SQLite para consultas